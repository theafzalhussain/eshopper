#!/usr/bin/env node
/*
 * Flush the HTTP response cache (Redis + this process's memory map).
 *
 * Product/category writes already invalidate themselves, so this is for the
 * case they cannot detect: a code change that alters the *shape* of a cached
 * response (a new field in a Mongo projection, a different payload wrapper).
 * Redis keeps serving the old body across restarts until the TTL expires, so
 * the deploy appears to have done nothing.
 *
 * Usage:
 *   npm run cache:clear                 # everything
 *   npm run cache:clear -- /product     # only keys containing "/product"
 *   npm run cache:clear -- /product /brand
 */

require('dotenv').config();

const { clearCache } = require('../utils/cache');

const patterns = process.argv.slice(2).filter(Boolean);

/* The cache client connects lazily on require; give it a moment to reach
   "ready" or the sweep silently no-ops and reports success. */
const waitForRedis = () => new Promise((resolve) => setTimeout(resolve, 2500));

(async () => {
    await waitForRedis();

    try {
        if (patterns.length === 0) {
            await clearCache();
            console.log('✅ Cleared the entire response cache');
        } else {
            for (const pattern of patterns) {
                await clearCache(pattern);
                console.log(`✅ Cleared cache entries matching: ${pattern}`);
            }
        }
        process.exit(0);
    } catch (err) {
        console.error('❌ Cache clear failed:', (err && err.message) || err);
        process.exit(1);
    }
})();
