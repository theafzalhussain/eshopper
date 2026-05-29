const mongoose = require('mongoose');
const { LRUCache } = require('lru-cache');

const cache = new LRUCache({ max: 5000, ttl: 30000 });
const PATCH_GUARD = Symbol.for('eshopper.mongooseQueryCachePatched');

const serialize = (query, namespace, salt = '') => {
    return [
        namespace || 'default',
        salt || '',
        query.op || 'find',
        JSON.stringify(query.getQuery ? query.getQuery() : {}),
        JSON.stringify(query.getOptions ? query.getOptions() : {}),
        JSON.stringify(query._fields || {}),
        JSON.stringify(query.mongooseOptions ? query.mongooseOptions() : {})
    ].join('|');
};

const applyMongooseQueryCache = (schema, { namespace = 'query', defaultTtlMs = 30000 } = {}) => {
    schema.query.cache = function cacheQuery(options = {}) {
        this._useQueryCache = true;
        this._queryCacheNamespace = namespace;
        this._queryCacheSalt = options.key || '';
        this._queryCacheTtlMs = Number(options.ttlMs || defaultTtlMs || 30000);
        return this;
    };

    if (!mongoose[PATCH_GUARD]) {
        mongoose[PATCH_GUARD] = true;
        const exec = mongoose.Query.prototype.exec;

        mongoose.Query.prototype.exec = async function execWithCache(...args) {
            if (!this._useQueryCache) {
                return exec.apply(this, args);
            }

            const key = serialize(this, this._queryCacheNamespace, this._queryCacheSalt);
            const cached = cache.get(key);
            if (cached) return cached;

            const result = await exec.apply(this, args);
            cache.set(key, result, { ttl: this._queryCacheTtlMs || defaultTtlMs });
            return result;
        };
    }
};

const clearQueryCache = (prefix = '') => {
    if (!prefix) {
        cache.clear();
        return;
    }

    for (const key of Array.from(cache.keys())) {
        if (key.startsWith(prefix)) {
            cache.delete(key);
        }
    }
};

module.exports = { applyMongooseQueryCache, clearQueryCache };