const BULLMQ_ENABLED = String(process.env.BULLMQ_ENABLED || 'true').toLowerCase() !== 'false';
const WORKERS_ENABLED = String(process.env.BULLMQ_WORKERS_ENABLED || 'true').toLowerCase() !== 'false';
const REDIS_ENABLED = String(process.env.REDIS_ENABLED || 'true').toLowerCase() !== 'false';

// Only load BullMQ dependencies if enabled
let createRedisClient, IORedis, Queue, Worker;
if (BULLMQ_ENABLED) {
    createRedisClient = require('../config/redis').createClient;
    IORedis = require('ioredis');
    const bullmq = require('bullmq');
    Queue = bullmq.Queue;
    Worker = bullmq.Worker;
}

let redisConnection = null;
let workerRedisConnection = null;

const QUEUE_NAMES = {
    email: 'eshopper-email',
    refund: 'eshopper-refund',
    report: 'eshopper-report',
    image: 'eshopper-image'
};

let queues = null;
let schedulers = null;
let workers = null;
let initialized = false;
let processorsMap = {};
let usingRedisBackend = false;

const isBullMQEnabled = () => BULLMQ_ENABLED;

const buildRedisOptions = (redisUrl, redisPassword, useTls) => {
    const opts = { maxRetriesPerRequest: null };
    if (useTls) opts.tls = {};
    const effectiveUsername = process.env.REDIS_WORKER_USERNAME || process.env.REDIS_USERNAME || process.env.REDIS_USER || (redisPassword ? 'default' : '');

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

const initializeQueues = (processors = {}) => {
    if (!isBullMQEnabled()) return null;
    if (initialized) return { queues, schedulers, workers };

    processorsMap = { ...processors };

    // Try to create Redis connections (only if Redis is enabled and configured)
    try {
        if (!REDIS_ENABLED) throw new Error('Redis disabled via env');
        // main connection (used by Queue clients)
        redisConnection = createRedisClient();
        // create a separate connection for workers/schedulers to avoid connection sharing issues
        const redisUrl = (process.env.REDIS_WORKER_URL || process.env.REDIS_URL || '').trim();
        const redisPassword = process.env.REDIS_WORKER_PASSWORD || process.env.REDIS_PASSWORD || process.env.REDIS_PASS || '';
        const useTls = /^rediss:\/\//i.test(redisUrl) || String(process.env.REDIS_TLS || '').toLowerCase() === 'true' || String(process.env.REDIS_TLS || '') === '1';
        if (redisUrl) {
            const workerOpts = buildRedisOptions(redisUrl, redisPassword, useTls);
            if (!workerOpts) {
                throw new Error('Invalid REDIS_WORKER_URL format');
            }
            if (!workerOpts.password) {
                console.warn('Worker Redis password is missing. Set REDIS_WORKER_PASSWORD or embed credentials in REDIS_WORKER_URL/REDIS_URL to avoid NOAUTH errors.');
            }
            workerRedisConnection = new IORedis(workerOpts);
        } else {
            // fallback to another client instance using same defaults
            workerRedisConnection = createRedisClient();
        }
    } catch (err) {
        console.warn('Redis connection for BullMQ failed:', err && err.message);
        redisConnection = null;
        workerRedisConnection = null;
    }

    if (redisConnection) {
        try {
            const clientConn = redisConnection;
            const workerConn = workerRedisConnection || redisConnection;

            queues = {
                email: new Queue(QUEUE_NAMES.email, { connection: clientConn }),
                refund: new Queue(QUEUE_NAMES.refund, { connection: clientConn }),
                report: new Queue(QUEUE_NAMES.report, { connection: clientConn }),
                image: new Queue(QUEUE_NAMES.image, { connection: clientConn })
            };

            // QueueScheduler may not be available in some environments; omit schedulers if unavailable
            schedulers = {};

            workers = {};
            if (WORKERS_ENABLED) {
                for (const key of Object.keys(queues)) {
                    const queueKey = key;
                    const processor = processorsMap[queueKey];
                    if (typeof processor === 'function') {
                        workers[queueKey] = new Worker(
                            QUEUE_NAMES[queueKey],
                            async (job) => processor(job),
                            { connection: workerConn }
                        );
                    }
                }
            }

            initialized = true;
            usingRedisBackend = true;
            console.log('✅ BullMQ initialized with Redis backend');
            return { queues, schedulers, workers };
        } catch (err) {
            console.warn('BullMQ init with Redis failed, falling back to in-process:', err && err.message);
            redisConnection = null;
        }
    }

    // Fallback in-process queue behavior
    const createFallbackQueue = (queueName) => ({
        add: async (jobName, payload) => {
            const processor = processorsMap[queueName];
            if (typeof processor !== 'function') return { fallback: true, queued: false, jobName, payload };
            return processor({ name: jobName, data: payload || {} });
        }
    });

    queues = {
        email: createFallbackQueue('email'),
        refund: createFallbackQueue('refund'),
        report: createFallbackQueue('report'),
        image: createFallbackQueue('image')
    };
    schedulers = {};
    workers = {};
    initialized = true;
    usingRedisBackend = false;
    console.log('ℹ️ BullMQ local fallback initialized (no Redis connection)');
    return { queues, schedulers, workers };
};

const getQueue = (name) => {
    if (!queues) return null;
    return queues[name] || null;
};

const enqueueJob = async (queueName, payload, options = {}) => {
    if (!isBullMQEnabled()) return null;
    const queue = getQueue(queueName);
    if (!queue) return null;
    try {
        // bullmq Queue.add signature: add(name, data, opts)
        return queue.add(queueName, payload, options);
    } catch (err) {
        console.warn('enqueueJob error:', err && err.message);
        return null;
    }
};

module.exports = {
    QUEUE_NAMES,
    initializeQueues,
    enqueueJob,
    getQueue,
    isBullMQEnabled,
    usingRedisBackend: () => usingRedisBackend
};
