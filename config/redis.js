const Redis = require('ioredis');

let redisClient = null;

const buildRedisOptions = (redisUrl, redisPassword, useTls) => {
  const opts = { maxRetriesPerRequest: null };
  if (useTls) opts.tls = {};

  try {
    if (/^redis(s)?:\/\//i.test(redisUrl) || /^rediss?:\/\//i.test(redisUrl)) {
      const parsed = new URL(redisUrl);
      const urlPassword = decodeURIComponent(parsed.password || '');
      const urlUsername = decodeURIComponent(parsed.username || '');
      opts.host = parsed.hostname;
      opts.port = Number(parsed.port || 6379);
      if (urlUsername) opts.username = urlUsername;
      if (urlPassword) opts.password = urlPassword;
      else if (redisPassword) opts.password = redisPassword;
      return opts;
    }

    const parts = redisUrl.split(':');
    opts.host = parts[0];
    opts.port = Number(parts[1] || 6379);
    if (redisPassword) opts.password = redisPassword;
    return opts;
  } catch (err) {
    return null;
  }
};

function createClient() {
  if (redisClient) return redisClient;

  const redisUrl = (process.env.REDIS_URL || '').trim();
  const redisPassword = process.env.REDIS_PASSWORD || process.env.REDIS_PASS || '';

  if (!redisUrl) {
    console.warn('Redis not configured: REDIS_URL missing');
    return null;
  }

  // decide whether to enable TLS: use rediss:// or explicit env flag
  const useTls = /^rediss:\/\//i.test(redisUrl) || String(process.env.REDIS_TLS || '').toLowerCase() === 'true' || String(process.env.REDIS_TLS || '') === '1';

  // support full host:port or a full redis:// url
  try {
    const redisOpts = buildRedisOptions(redisUrl, redisPassword, useTls);
    if (!redisOpts) {
      throw new Error('Invalid REDIS_URL format');
    }

    if (!redisOpts.password) {
      console.warn('Redis password is missing. Set REDIS_PASSWORD or use a redis:// URL with credentials to avoid NOAUTH errors.');
    }

    redisClient = new Redis(redisOpts);

    redisClient.on('connect', () => console.log('Redis connected'));
    redisClient.on('ready', () => console.log('Redis ready'));
    redisClient.on('error', (err) => console.warn('Redis error:', err && err.message));
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
  client: () => redisClient
};
