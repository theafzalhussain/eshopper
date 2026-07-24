const Redis = require('ioredis');

let redisClient = null;
let redisDisabled = false;
let redisDisabledReason = '';

const REDIS_ENABLED = String(process.env.REDIS_ENABLED || 'true').toLowerCase() !== 'false';
const AUTH_ERROR_PATTERN = /\b(NOAUTH|WRONGPASS|authentication required|AUTH failed)\b/i;
const CONNECTION_ERROR_PATTERN = /\b(getaddrinfo ENOTFOUND|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ETIMEDOUT|EHOSTUNREACH|ENETUNREACH)\b/i;

const isTruthy = (value) => /^(true|1|yes)$/i.test(String(value || '').trim());

const disableRedisClient = (reason, err) => {
  if (redisDisabled) return;

  redisDisabled = true;
  redisDisabledReason = reason || 'Redis disabled';

  if (redisClient) {
    try {
      redisClient.removeAllListeners();
      redisClient.disconnect();
    } catch (disconnectErr) {
      // ignore disconnect cleanup errors
    }
  }

  redisClient = null;

  if (err && err.message) {
    console.warn(`${redisDisabledReason}:`, err.message);
  } else {
    console.warn(redisDisabledReason);
  }
};

const buildRedisOptions = (redisUrl, redisPassword, redisUsername, useTls) => {
  const opts = { maxRetriesPerRequest: null };
  if (useTls) opts.tls = {};
  const effectiveUsername = redisUsername || (redisPassword ? 'default' : '');

  try {
    if (/^redis(s)?:\/\//i.test(redisUrl) || /^rediss?:\/\//i.test(redisUrl)) {
      const parsed = new URL(redisUrl);
      const urlPassword = decodeURIComponent(parsed.password || '');
      const urlUsername = decodeURIComponent(parsed.username || '');
      opts.host = parsed.hostname;
      opts.port = Number(parsed.port || 6379);
      if (urlUsername) opts.username = urlUsername;
      else if (effectiveUsername) opts.username = effectiveUsername;
      if (urlPassword) opts.password = urlPassword;
      else if (redisPassword) opts.password = redisPassword;
      return opts;
    }

    const parts = redisUrl.split(':');
    opts.host = parts[0];
    opts.port = Number(parts[1] || 6379);
    if (effectiveUsername) opts.username = effectiveUsername;
    if (redisPassword) opts.password = redisPassword;
    return opts;
  } catch (err) {
    return null;
  }
};

function createClient() {
  if (redisClient) return redisClient;
  if (redisDisabled) return null;
  if (!REDIS_ENABLED) {
    redisDisabled = true;
    redisDisabledReason = 'Redis disabled via REDIS_ENABLED=false';
    return null;
  }

  const redisUrl = (process.env.REDIS_URL || '').trim();
  const redisPassword = process.env.REDIS_PASSWORD || process.env.REDIS_PASS || '';
  const redisUsername = process.env.REDIS_USERNAME || process.env.REDIS_USER || '';

  if (!redisUrl) {
    console.warn('Redis not configured: REDIS_URL missing');
    return null;
  }

  // decide whether to enable TLS: use rediss:// or explicit env flag
  const useTls = /^rediss:\/\//i.test(redisUrl) || String(process.env.REDIS_TLS || '').toLowerCase() === 'true' || String(process.env.REDIS_TLS || '') === '1';

  // support full host:port or a full redis:// url
  try {
    const redisOpts = buildRedisOptions(redisUrl, redisPassword, redisUsername, useTls);
    if (!redisOpts) {
      throw new Error('Invalid REDIS_URL format');
    }

    if (!redisOpts.password && !isTruthy(process.env.REDIS_ALLOW_UNAUTHENTICATED)) {
      disableRedisClient('Redis credentials are missing; skipping Redis client to avoid auth errors');
      return null;
    }

    if (!redisOpts.password) {
      console.warn('Redis password is missing. Set REDIS_PASSWORD or use a redis:// URL with credentials to avoid NOAUTH errors.');
    }

    redisClient = new Redis({
      ...redisOpts,
      lazyConnect: false,
      connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT || 10000),
      retryStrategy(times) {
        if (redisDisabled) return null;
        if (times >= 5) return null;
        return Math.min(times * 500, 3000);
      }
    });

    redisClient.on('connect', () => console.log('Redis connected'));
    redisClient.on('ready', () => console.log('Redis ready'));
    redisClient.on('error', (err) => {
      const errorMessage = err && err.message ? err.message : '';
      if (AUTH_ERROR_PATTERN.test(errorMessage)) {
        disableRedisClient('Redis authentication failed', err);
        return;
      }
      if (CONNECTION_ERROR_PATTERN.test(errorMessage)) {
        disableRedisClient('Redis connection failed; falling back to memory cache', err);
        return;
      }
      console.warn('Redis error:', errorMessage);
    });
  } catch (err) {
    console.warn('Failed to create Redis client:', err && err.message);
    redisClient = null;
  }

  return redisClient;
}

async function get(key) {
  try {
    if (!redisClient) createClient();
    if (!redisClient) return null;
    const val = await redisClient.get(key);
    return val ? JSON.parse(val) : null;
  } catch (err) {
    return null;
  }
}

async function set(key, value, ttlSeconds) {
  try {
    if (!redisClient) createClient();
    if (!redisClient) return false;
    const str = JSON.stringify(value);
    if (ttlSeconds && Number(ttlSeconds) > 0) {
      await redisClient.set(key, str, 'EX', Number(ttlSeconds));
    } else {
      await redisClient.set(key, str);
    }
    return true;
  } catch (err) {
    return false;
  }
}

async function del(key) {
  try {
    if (!redisClient) createClient();
    if (!redisClient) return false;
    await redisClient.del(key);
    return true;
  } catch (err) {
    return false;
  }
}

module.exports = {
  createClient,
  get,
  set,
  del,
  client: () => redisClient,
  isDisabled: () => redisDisabled,
  disabledReason: () => redisDisabledReason
};
