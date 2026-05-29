const memoryCache = new Map();

const cacheKey = (req) => `__express__${req.originalUrl || req.url}`;

const cacheMiddleware = (duration = 300) => {
    return async (req, res, next) => {
        if (req.method !== 'GET') return next();

        const key = cacheKey(req);
        const entry = memoryCache.get(key);
        const expiresAt = entry?.expiresAt || 0;

        if (entry && expiresAt > Date.now()) {
            res.setHeader('X-Cache', 'HIT');
            if (entry.contentType) res.setHeader('Content-Type', entry.contentType);
            return res.send(entry.body);
        }

        const originalSend = res.send.bind(res);
        res.send = (body) => {
            if (res.statusCode === 200) {
                memoryCache.set(key, {
                    body,
                    contentType: res.getHeader('Content-Type'),
                    expiresAt: Date.now() + (Math.max(1, Number(duration) || 300) * 1000)
                });
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

};

const getCacheValue = async (key) => {
    if (!key) return null;
    const entry = memoryCache.get(key);
    if (entry && entry.expiresAt > Date.now()) return entry.body;

    return null;
};

const setCacheValue = async (key, value, ttlSeconds = 60) => {
    if (!key) return;
    memoryCache.set(key, { body: value, expiresAt: Date.now() + (ttlSeconds * 1000) });

    return;
};

module.exports = { cacheMiddleware, clearCache, getCacheValue, setCacheValue };