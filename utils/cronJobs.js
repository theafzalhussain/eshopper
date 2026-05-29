/**
 * Cron Jobs Configuration
 * 
 * This file sets up all background jobs including:
 * - Auto-refund scheduler (every 5 minutes)
 * - Refund report generator (daily)
 * - Cleanup jobs
 */

const cron = require('node-cron')
const { processAutoRefunds, getPendingRefunds, getRefundReport } = require('./autoRefundScheduler')
const { enqueueJob, isBullMQEnabled } = require('./queues')

let schedulerInstance = null
let dailyRefundReportJob = null
let pendingRefundsMonitorJob = null
let cronJobsInitialized = false

/**
 * Initialize all cron jobs
 * Call this in server.js after database connection
 */
exports.initializeCronJobs = (io = null) => {
    try {
        if (cronJobsInitialized) {
            console.log('🕐 Cron jobs already initialized; skipping duplicate setup')
            return
        }

        cronJobsInitialized = true
        console.log('🕐 Initializing cron jobs...')

        // ════════════════════════════════════════════════════════════════════════════
        // AUTO-REFUND SCHEDULER
        // Runs every 5 minutes to process pending refunds
        // ════════════════════════════════════════════════════════════════════════════
        
        schedulerInstance = cron.schedule('*/5 * * * *', async () => {
            console.log('\n✨ Running auto-refund scheduler...')
            try {
                const result = await processAutoRefunds(io)
                
                if (result.successCount > 0) {
                    console.log(`✅ [CRON] Auto-refunds processed: ${result.successCount} successful, ${result.failureCount} failed`)
                }
            } catch (error) {
                console.error('❌ [CRON] Auto-refund scheduler error:', error.message)
            }
        })

        console.log('✅ Auto-refund scheduler initialized (runs every 5 minutes)')

        // ════════════════════════════════════════════════════════════════════════════
        // DAILY REFUND REPORT
        // Runs at 2 AM daily
        // ════════════════════════════════════════════════════════════════════════════
        
        dailyRefundReportJob = cron.schedule('0 2 * * *', async () => {
            console.log('\n📊 Generating daily refund report...')
            try {
                if (isBullMQEnabled()) {
                    await enqueueJob('report', { type: 'refund-report', days: 1 }, { attempts: 2 })
                } else {
                    const report = await getRefundReport(1)
                    console.log('📈 Daily Refund Report:', report)
                }
                
                // Here you can send the report via email or log it
                // await sendReportEmail(report)
            } catch (error) {
                console.error('❌ [CRON] Refund report generation error:', error.message)
            }
        })

        console.log('✅ Daily refund report initialized (runs at 2 AM)')

        // ════════════════════════════════════════════════════════════════════════════
        // PENDING REFUNDS CHECK
        // Runs every hour - logs pending refunds for monitoring
        // ════════════════════════════════════════════════════════════════════════════
        
        pendingRefundsMonitorJob = cron.schedule('0 * * * *', async () => {
            try {
                const pending = await getPendingRefunds()
                if (pending.length > 0) {
                    console.log(`📌 [CRON] Currently ${pending.length} orders pending auto-refund`)
                }
            } catch (error) {
                console.error('❌ [CRON] Pending refunds check error:', error.message)
            }
        })

        console.log('✅ Pending refunds monitor initialized (runs every hour)')

        console.log('\n✨ All cron jobs initialized successfully!\n')

    } catch (error) {
        console.error('❌ Failed to initialize cron jobs:', error.message)
    }
}

/**
 * Stop all cron jobs
 * Call this on server shutdown
 */
exports.stopCronJobs = () => {
    if (schedulerInstance) {
        schedulerInstance.stop()
    }

    if (dailyRefundReportJob) {
        dailyRefundReportJob.stop()
    }

    if (pendingRefundsMonitorJob) {
        pendingRefundsMonitorJob.stop()
    }

    schedulerInstance = null
    dailyRefundReportJob = null
    pendingRefundsMonitorJob = null
    cronJobsInitialized = false

    console.log('🛑 Cron jobs stopped')
}

/**
 * Manually run auto-refund scheduler
 * Useful for testing or manual triggers
 */
exports.runAutoRefundManually = async (io = null) => {
    try {
        console.log('🚀 Running manual auto-refund trigger...')
        return await processAutoRefunds(io)
    } catch (error) {
        console.error('❌ Manual auto-refund error:', error.message)
        throw error
    }
}

/**
 * Get scheduler status
 */
exports.getSchedulerStatus = () => {
    return {
        initialized: cronJobsInitialized,
        running: schedulerInstance ? !schedulerInstance._destroyed : false,
        lastRun: new Date(),
        status: 'active'
    }
}
