const mongoose = require('mongoose');
const PATCH_GUARD = Symbol.for('eshopper.mongooseQueryProfilerPatched');

if (!mongoose[PATCH_GUARD]) {
    mongoose[PATCH_GUARD] = true;
    const exec = mongoose.Query.prototype.exec;
    mongoose.Query.prototype.exec = async function execWithProfiler(...args) {
        const slowMs = Math.max(0, Number(process.env.SLOW_QUERY_MS || 200));
        const start = Date.now();
        try {
            const res = await exec.apply(this, args);
            const diff = Date.now() - start;
            if (diff >= slowMs) {
                try {
                    const op = this.op || (this.getQuery ? 'query' : 'exec');
                    const collection = this.model && this.model.collection && this.model.collection.name;
                    const q = this.getQuery ? JSON.stringify(this.getQuery()) : '';
                    console.warn(`⚠️ Slow mongoose query (${diff}ms) on ${collection || 'unknown'} ${op}: ${q}`);
                } catch (e) {
                    console.warn('⚠️ Slow query logged but formatting failed');
                }
            }
            return res;
        } catch (err) {
            const diff = Date.now() - start;
            if (diff >= slowMs) {
                console.warn(`⚠️ Slow mongoose query error (${diff}ms):`, err && err.message);
            }
            throw err;
        }
    };
}

module.exports = {};
