/* eslint-disable no-console */
const v8 = require('v8');

const samples = [];
const baseline = process.memoryUsage().heapUsed;

setInterval(() => {
    const mem = process.memoryUsage();
    samples.push(mem.heapUsed);

    const recent = samples.slice(-5);
    const monotonicGrowth = recent.length === 5 && recent.every((value, index, array) => index === 0 || value >= array[index - 1]);

    console.log(JSON.stringify({
        rssMb: Math.round(mem.rss / 1024 / 1024),
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        externalMb: Math.round(mem.external / 1024 / 1024),
        activeHandles: process._getActiveHandles().length,
        activeRequests: process._getActiveRequests().length
    }));

    if (monotonicGrowth && mem.heapUsed > baseline * 1.5) {
        console.warn('Possible memory leak detected');
        console.log(v8.getHeapStatistics());
        if (global.gc) {
            global.gc();
        }
    }
}, 30000);