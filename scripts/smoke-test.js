require('dotenv').config();
const axios = require('axios');
(async () => {
  try {
    console.log('\n=== Product list (1) ===');
    let r = await axios.get('http://localhost:5000/product', { validateStatus: () => true });
    console.log('status:', r.status, 'x-cache:', r.headers['x-cache']);

    console.log('\n=== Product list (2) ===');
    r = await axios.get('http://localhost:5000/product', { validateStatus: () => true });
    console.log('status:', r.status, 'x-cache:', r.headers['x-cache']);

    const imgUrl = 'http://localhost:5000/img?src=/assets/productimages/example.jpg&w=400&q=80';
    console.log('\n=== Image proxy HEAD (1) ===');
    let h = await axios.head(imgUrl, { validateStatus: () => true });
    console.log('status:', h.status, 'x-cache:', h.headers['x-cache']);

    console.log('\n=== Image proxy HEAD (2) ===');
    h = await axios.head(imgUrl, { validateStatus: () => true });
    console.log('status:', h.status, 'x-cache:', h.headers['x-cache']);

    console.log('\n=== BullMQ enqueue test ===');
    const { initializeQueues, enqueueJob } = require('../utils/queues');
    initializeQueues({ report: async (job) => { console.log('processor ran (in-process):', job); } });
    const enq = await enqueueJob('report', { days: 7 });
    console.log('enqueue result:', enq);

    console.log('\n=== Redis set/get test ===');
    const Redis = require('ioredis');
    const redisUrl = process.env.REDIS_URL || '';
    if (!redisUrl) {
      console.log('redis skipped: REDIS_URL not configured');
      console.log('\nSmoke tests completed');
      process.exit(0);
    }
    const useTls = /^rediss:\/\//i.test(redisUrl) || String(process.env.REDIS_TLS || '').toLowerCase() === 'true' || String(process.env.REDIS_TLS || '') === '1';
    const redisOpts = { password: process.env.REDIS_PASSWORD || undefined };
    if (useTls) redisOpts.tls = {};
    const redis = new Redis(redisUrl, redisOpts);
    redis.on('error', (err) => {
      if (err && /ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(err.message || '')) {
        console.log(`redis skipped: ${err.message}`);
      }
    });
    try {
      await redis.set('eshopper:test', 'ok', 'EX', 10);
      const val = await redis.get('eshopper:test');
      console.log('redis got:', val);
    } finally {
      try { await redis.disconnect(); } catch (_) {}
    }

    console.log('\nSmoke tests completed');
    process.exit(0);
  } catch (err) {
    console.error('Smoke test error:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
