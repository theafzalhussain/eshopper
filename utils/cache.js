const memoryCache = new Map();

// Create a DEDICATED Redis client for caching only (separate from BullMQ)
let redis = null;
let redisDisabled = false;

const REDIS_ENABLED = String(process.env.REDIS_ENABLED || 'true').toLowerCase() !== 'false';
const REDIS_CACHE_TIMEOUT = 2000; // Max 2 seconds for any Redis cache operation
/* Managed Redis plans reject every command once the request quota is spent —
   retrying just burns more quota, so we fall back to the memory cache. */
const { classifyRedisError } = require('../config/redis');

function initCacheRedis() {
    if (!REDIS_ENABLED || redisDisabled) return null;

    const redisUrl = (process.env.REDIS_URL || '').trim();
    const redisPassword = process.env.REDIS_PASSWORD || '';

    if (!redisUrl || !redisPassword) return null;

    try {
        const Redis = require('ioredis');
        const useTls = /^rediss:\/\//i.test(redisUrl) || String(process.env.REDIS_TLS || '').toLowerCase() === 'true';

        const client = new Redis(redisUrl, {
            password: redisPassword,
            tls: useTls ? {} : undefined,
            maxRetriesPerRequest: 1,
            connectTimeout: 5000,
            lazyConnect: false,
            enableReadyCheck: true,
            retryStrategy(times) {
                if (times >= 3) {
                    redisDisabled = true;
                    console.warn('⚠️ Redis cache disabled after 3 failed retries');
                    return null;
                }
                return Math.min(times * 500, 2000);
            }
        });

        client.on('ready', () => console.log('✅ Redis cache client ready'));
        client.on('error', (err) => {
            const message = (err && err.message) || '';
            if (message.includes('EVAL') || message.includes('dispatch')) {
                // Ignore BullMQ-related errors on this connection
                return;
            }
            /* Plan quota used up (e.g. Upstash "max requests limit exceeded"):
               every further command fails, so stop using Redis and serve from
               the in-memory cache instead of retrying and spamming the logs. */
            if (classifyRedisError(message) === 'quota') {
                if (!redisDisabled) {
                    redisDisabled = true;
                    console.warn('⚠️ Redis cache disabled: request quota exhausted — using memory cache');
                    try { client.disconnect(); } catch (_) { /* ignore */ }
                }
                return;
            }
            console.warn('Redis cache error:', message);
        });

        return client;
    } catch (err) {
        console.warn('Failed to create Redis cache client:', err.message);
        return null;
    }
}

// Initialize on first require
redis = initCacheRedis();

/* ── Cache namespace ──────────────────────────────────────────────
   Response caches are keyed by URL alone, which is fine while only the
   data changes: every product write calls clearCache(). It breaks when
   the *shape* of a response changes in code — a new field in a Mongo
   projection, for example. Redis happily keeps serving the old payload
   (it survives restarts), so the deploy looks like it did nothing until
   the TTL runs out.

   Stamping the key with a build identity makes that self-healing:
     • production — the commit of the running deploy (Render/Vercel set
       these), falling back to the package version
     • development — the process start time, so restarting the server is
       always enough to see your own change
   Old keys are simply orphaned and expire on their own TTL. */
const CACHE_VERSION = (() => {
    const explicit = String(process.env.CACHE_VERSION || '').trim();
    if (explicit) return explicit;

    const commit = String(
        process.env.RENDER_GIT_COMMIT
        || process.env.VERCEL_GIT_COMMIT_SHA
        || process.env.GIT_COMMIT
        || ''
    ).trim();
    if (commit) return commit.slice(0, 12);

    if (process.env.NODE_ENV === 'production') {
        try { return String(require('../package.json').version || '0'); } catch (err) { return '0'; }
    }

    return `dev-${Date.now()}`;
})();

/* The version sits after the `__express__` prefix and before the path so
   that existing clearCache('__express__/product*') patterns — which match
   on the path as a substring — keep working unchanged. */
const cacheKey = (req) => `__express__${CACHE_VERSION}|${req.originalUrl || req.url}`;

const isRedisReady = () => {
    if (!redis || redisDisabled) return false;
    return redis.status === 'ready';
};

// Timeout wrapper - NEVER let Redis hang a request
const redisGetSafe = async (key) => {
    if (!isRedisReady()) return null;
    return Promise.race([
        redis.get(key),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), REDIS_CACHE_TIMEOUT))
    ]).catch(() => null);
};

const redisSetSafe = async (key, value, ttl) => {
    if (!isRedisReady()) return;
    Promise.race([
        ttl > 0 ? redis.set(key, value, 'EX', ttl) : redis.set(key, value),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), REDIS_CACHE_TIMEOUT))
    ]).catch(() => {});
};

/* SCAN rather than KEYS: KEYS blocks the Redis server for the whole sweep,
   which on a shared/managed plan means blocking every other request too. */
const redisDeleteMatching = async (match) => {
    if (!isRedisReady()) return 0;

    let cursor = '0';
    let deleted = 0;

    try {
        do {
            const [next, keys] = await Promise.race([
                redis.scan(cursor, 'MATCH', match, 'COUNT', 200),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), REDIS_CACHE_TIMEOUT))
            ]);
            cursor = next;

            if (keys && keys.length) {
                await Promise.race([
                    redis.del(...keys),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), REDIS_CACHE_TIMEOUT))
                ]);
                deleted += keys.length;
            }
        } while (cursor !== '0');
    } catch (err) {
        /* a timeout mid-sweep is not fatal: whatever is left expires on TTL */
    }

    return deleted;
};

const _serializeBody = (body) => {
    if (Buffer.isBuffer(body)) return body.toString('utf8');
    if (typeof body === 'string') return body;
    try { return JSON.stringify(body); } catch (err) { return String(body); }
};

const cacheMiddleware = (duration = 300) => {
    return async (req, res, next) => {
        if (req.method !== 'GET') return next();

        const key = cacheKey(req);

        // Try Redis (with timeout - never hang)
        const cached = await redisGetSafe(key);
        if (cached) {
            res.setHeader('X-Cache', 'HIT-REDIS');
            res.setHeader('Content-Type', 'application/json');
            return res.send(cached);
        }

        // Try memory cache
        const entry = memoryCache.get(key);
        if (entry && entry.expiresAt > Date.now()) {
            res.setHeader('X-Cache', 'HIT-MEM');
            if (entry.contentType) res.setHeader('Content-Type', entry.contentType);
            return res.send(entry.body);
        }

        // Cache miss - proceed to handler and cache the response
        const originalSend = res.send.bind(res);
        res.send = (body) => {
            if (res.statusCode === 200) {
                const serialized = _serializeBody(body);
                const contentType = res.getHeader('Content-Type');

                // Store in memory
                memoryCache.set(key, {
                    body: serialized,
                    contentType,
                    expiresAt: Date.now() + (duration * 1000)
                });

                // Store in Redis (fire and forget - never block response)
                redisSetSafe(key, serialized, duration);
            }
            return originalSend(body);
        };

        next();
    };
};

const clearCache = async (pattern = '') => {
    const normalized = String(pattern || '').replace(/^__express__/, '').replace(/\*+$/, '');

    if (!normalized) {
        /* No pattern: wipe every response-cache entry. The memory map is
           local to this process, so Redis has to be swept as well — a
           restart-proof cache that no one can flush is how a stale payload
           outlives the deploy that fixed it. */
        memoryCache.clear();
        await redisDeleteMatching('__express__*');
        return;
    }

    for (const key of memoryCache.keys()) {
        if (key.includes(normalized)) memoryCache.delete(key);
    }

    await redisDeleteMatching(`*${normalized}*`);
};

const getCacheValue = async (key) => {
    if (!key) return null;
    const val = await redisGetSafe(key);
    if (val) return val;
    const entry = memoryCache.get(key);
    if (entry && entry.expiresAt > Date.now()) return entry.body;
    return null;
};

const setCacheValue = async (key, value, ttlSeconds = 60) => {
    if (!key) return;
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    memoryCache.set(key, { body: serialized, expiresAt: Date.now() + (ttlSeconds * 1000) });
    redisSetSafe(key, serialized, ttlSeconds);
};

module.exports = { cacheMiddleware, clearCache, getCacheValue, setCacheValue };
