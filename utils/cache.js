const memoryCache = new Map();
const { createClient: createRedisClient, client: getRedisClient } = require('../config/redis');

const cacheKey = (req) => `__express__${req.originalUrl || req.url}`;

let redis = null;
try {
    redis = createRedisClient();
} catch (e) {
    redis = getRedisClient();
}

const _serializeBody = (body) => {
    if (Buffer.isBuffer(body)) return body.toString('utf8');
    if (typeof body === 'string') return body;
    try {
        return JSON.stringify(body);
    } catch (err) {
        return String(body);
    }
};

const cacheMiddleware = (duration = 300) => {
    return async (req, res, next) => {
        if (req.method !== 'GET') return next();

        const key = cacheKey(req);

        // Try Redis first
        try {
            if (redis) {
                const cached = await redis.get(key);
                if (cached) {
                    res.setHeader('X-Cache', 'HIT');
                    const parsed = cached;
                    const contentType = (res.getHeader('Content-Type') || 'application/json');
                    res.setHeader('Content-Type', contentType);
                    return res.send(parsed);
                }
            }
        } catch (err) {
            // ignore redis errors and fallback to memory cache
            console.warn('Redis cache read error:', err && err.message);
        }

        // Memory fallback
        const entry = memoryCache.get(key);
        const expiresAt = entry?.expiresAt || 0;
        if (entry && expiresAt > Date.now()) {
            res.setHeader('X-Cache', 'HIT');
            if (entry.contentType) res.setHeader('Content-Type', entry.contentType);
            return res.send(entry.body);
        }

        const originalSend = res.send.bind(res);
        res.send = async (body) => {
            if (res.statusCode === 200) {
                const serialized = _serializeBody(body);
                const contentType = res.getHeader('Content-Type');

                // store in memory
                memoryCache.set(key, {
                    body: serialized,
                    contentType,
                    expiresAt: Date.now() + (Math.max(1, Number(duration) || 300) * 1000)
                });

                // store in redis if available
                try {
                    if (redis) {
                        if (Number(duration) > 0) {
                            await redis.set(key, serialized, 'EX', Number(duration));
                        } else {
                            await redis.set(key, serialized);
                        }
                    }
                } catch (err) {
                    console.warn('Redis cache write error:', err && err.message);
                }
            }
            return originalSend(body);
        };

        next();
    };
};

const clearCache = async (pattern = '') => {
    const normalized = String(pattern || '').replace(/^__express__/, '').replace(/\*+$/, '');
    if (!normalized) {
        memoryCache.clear();
        return;
    }

    for (const key of memoryCache.keys()) {
        if (key.includes(normalized)) memoryCache.delete(key);
    }

    try {
        if (redis) {
            const keys = await redis.keys(`*${normalized}*`);
            if (keys && keys.length) await redis.del(...keys);
        }
    } catch (err) {
        console.warn('Redis clearCache error:', err && err.message);
    }

};

const getCacheValue = async (key) => {
    if (!key) return null;
    try {
        if (redis) {
            const val = await redis.get(key);
            return val;
        }
    } catch (err) {
        console.warn('Redis getCacheValue error:', err && err.message);
    }

    const entry = memoryCache.get(key);
    if (entry && entry.expiresAt > Date.now()) return entry.body;

    return null;
};

const setCacheValue = async (key, value, ttlSeconds = 60) => {
    if (!key) return;
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    memoryCache.set(key, { body: serialized, expiresAt: Date.now() + (ttlSeconds * 1000) });

    try {
        if (redis) {
            if (Number(ttlSeconds) > 0) await redis.set(key, serialized, 'EX', Number(ttlSeconds));
            else await redis.set(key, serialized);
        }
    } catch (err) {
        console.warn('Redis setCacheValue error:', err && err.message);
    }

    return;
};

module.exports = { cacheMiddleware, clearCache, getCacheValue, setCacheValue };