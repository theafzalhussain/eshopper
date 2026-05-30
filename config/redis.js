const Redis = require('ioredis');

let redisClient = null;

function createClient() {
  if (redisClient) return redisClient;

  const redisUrl = (process.env.REDIS_URL || '').trim();
  const redisPassword = process.env.REDIS_PASSWORD || process.env.REDIS_PASS || '';

  if (!redisUrl) {
    console.warn('Redis not configured: REDIS_URL missing');
    return null;
  }

  const opts = {};

  // decide whether to enable TLS: use rediss:// or explicit env flag
  const useTls = /^rediss:\/\//i.test(redisUrl) || String(process.env.REDIS_TLS || '').toLowerCase() === 'true' || String(process.env.REDIS_TLS || '') === '1';

  // support full host:port or a full redis:// url
  try {
    if (/^redis(s)?:\/\//i.test(redisUrl) || /^rediss?:\/\//i.test(redisUrl)) {
      // if it's a full URL, let ioredis parse it
      const redisOpts = { password: redisPassword || undefined, maxRetriesPerRequest: null };
      if (useTls) redisOpts.tls = {};
      redisClient = new Redis(redisUrl, redisOpts);
    } else {
      const parts = redisUrl.split(':');
      opts.host = parts[0];
      opts.port = Number(parts[1] || 6379);
      opts.maxRetriesPerRequest = null;
      if (redisPassword) opts.password = redisPassword;
      if (useTls) opts.tls = {};
      redisClient = new Redis(opts);
    }

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
