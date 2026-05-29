const BULLMQ_ENABLED = String(process.env.BULLMQ_ENABLED || 'true').toLowerCase() !== 'false';
const WORKERS_ENABLED = String(process.env.BULLMQ_WORKERS_ENABLED || 'true').toLowerCase() !== 'false';

const QUEUE_NAMES = {
    email: 'eshopper:email',
    refund: 'eshopper:refund',
    report: 'eshopper:report',
    image: 'eshopper:image'
};

let queues = null;
let schedulers = null;
let workers = null;
let initialized = false;
let processorsMap = {};
let usingRedisBackend = false;

const isBullMQEnabled = () => BULLMQ_ENABLED;

const initializeQueues = (processors = {}) => {
    if (!isBullMQEnabled()) return null;
    if (initialized) return { queues, schedulers, workers };

    processorsMap = { ...processors };

    const createFallbackQueue = (queueName) => ({
        add: async (jobName, payload) => {
            const processor = processorsMap[queueName];
            if (typeof processor !== 'function') return { fallback: true, queued: false, jobName, payload };
            return processor({ name: jobName, data: payload || {} });
        }
    });

    queues = {
        email: createFallbackQueue(QUEUE_NAMES.email),
        refund: createFallbackQueue(QUEUE_NAMES.refund),
        report: createFallbackQueue(QUEUE_NAMES.report),
        image: createFallbackQueue(QUEUE_NAMES.image)
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
    return queue.add(queueName, payload, options);
};

module.exports = {
    QUEUE_NAMES,
    initializeQueues,
    enqueueJob,
    getQueue,
    isBullMQEnabled,
    usingRedisBackend: () => usingRedisBackend
};
