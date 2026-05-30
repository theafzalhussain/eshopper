require('dotenv').config();

const mongoose = require('mongoose');
const { initializeQueues, usingRedisBackend } = require('./utils/queues');
const { processRefundJobData } = require('./utils/refundWorker');
const { getRefundReport } = require('./utils/autoRefundScheduler');

const isEnabled = String(process.env.BULLMQ_ENABLED || 'true').toLowerCase() !== 'false';
const workersEnabled = String(process.env.BULLMQ_WORKERS_ENABLED || 'true').toLowerCase() !== 'false';

async function main() {
    if (!isEnabled) {
        console.log('ℹ️ BullMQ is disabled via BULLMQ_ENABLED=false');
        return;
    }

    if (!workersEnabled) {
        console.log('ℹ️ BullMQ workers are disabled via BULLMQ_WORKERS_ENABLED=false');
        return;
    }

    initializeQueues({
        refund: async (job) => processRefundJobData(job.data || job),
        report: async (job) => getRefundReport(Number(job.data?.days || 7))
    });

    console.log(usingRedisBackend() ? '✅ Worker connected to Redis-backed BullMQ queues' : 'ℹ️ Worker running with local fallback queues');
    console.log('🚀 BullMQ worker process is running');
}

async function shutdown(signal) {
    console.log(`\n🛑 Received ${signal}, shutting down worker...`);
    try {
        await mongoose.connection.close(false);
        console.log('✅ MongoDB connection closed');
    } catch (err) {
        console.warn('⚠️ Error closing MongoDB connection:', err && err.message);
    }
    process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection in worker:', err?.message || err);
    process.exit(1);
});

main().catch((err) => {
    console.error('❌ Worker bootstrap failed:', err?.message || err);
    process.exit(1);
});