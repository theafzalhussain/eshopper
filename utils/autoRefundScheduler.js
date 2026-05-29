/**
 * Auto-Refund Scheduler
 * Processes refunds automatically 24 hours after item is marked as received
 * 
 * This scheduler runs every 5 minutes to check for pending refunds
 * and processes them according to the refund policy
 */

const Order = require('../models/Order')
const axios = require('axios')

// Razorpay refund helper
const refundViaRazorpay = async (order, amount) => {
    const keyId = String(process.env.RAZORPAY_KEY_ID || '').trim()
    const keySecret = String(process.env.RAZORPAY_KEY_SECRET || '').trim()

    if (!keyId || !keySecret) {
        throw new Error('Razorpay credentials not configured')
    }

    if (!order?.razorpayPaymentId) {
        throw new Error('Missing Razorpay payment ID for refund')
    }

    const response = await axios.post(
        `https://api.razorpay.com/v1/payments/${order.razorpayPaymentId}/refund`,
        {
            amount: Math.max(1, Math.round(Number(amount || 0) * 100)),
            currency: 'INR',
            speed: 'normal',
            notes: { source: 'eshopper-auto-return-refund' }
        },
        {
            auth: { username: keyId, password: keySecret },
            timeout: 30000
        }
    )

    return response.data
}

// Send refund confirmation email
const sendRefundEmail = async (order) => {
    try {
        const { sendEmail } = require('../emailService')
        const refundAmount = order.refund?.amount || order.finalAmount

        await sendEmail({
            to: order.userEmail,
            subject: `Refund Processed - Order ${order.orderId}`,
            template: 'refund-processed',
            context: {
                orderId: order.orderId,
                userName: order.userName,
                amount: refundAmount,
                returnTrackingId: order.return?.returnTrackingId,
                refundDate: new Date().toLocaleDateString('en-IN'),
                estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')
            }
        })
    } catch (error) {
        console.error('Failed to send refund email:', error.message)
    }
}

// Emit socket event for real-time updates
const emitRefundUpdate = (io, orderId, userId, refundStatus) => {
    if (io) {
        io.emit('orderRefundProcessed', {
            orderId,
            userid: userId,
            refundStatus,
            timestamp: new Date()
        })
        io.emit('dashboardUpdate')
    }
}

/**
 * Main Scheduler Function
 * Called periodically (every 5 minutes recommended)
 */
exports.processAutoRefunds = async (io = null) => {
    try {
        console.log('[AUTO-REFUND] Starting scheduler run at:', new Date().toISOString())

        // Find orders that:
        // 1. Have items marked as RECEIVED
        // 2. Have refund status as PENDING
        // 3. 24 hours have passed since item was received
        const now = new Date()
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

        const orders = await Order.find({
            'return.status': 'RECEIVED',
            'refund.status': 'PENDING',
            'return.deliveredBackDate': { $lte: twentyFourHoursAgo }
        })

        console.log(`[AUTO-REFUND] Found ${orders.length} orders ready for auto-refund`)

        let successCount = 0
        let failureCount = 0

        for (const order of orders) {
            try {
                const refundAmount = order.refund?.amount || order.finalAmount

                console.log(`[AUTO-REFUND] Processing refund for order ${order.orderId}, amount: ₹${refundAmount}`)

                // Check if it's an online payment (Razorpay)
                if (order.paymentMethod?.toLowerCase() === 'razorpay' && order.razorpayPaymentId) {
                    try {
                        const refundData = await refundViaRazorpay(order, refundAmount)

                        order.refund = {
                            ...(order.refund || {}),
                            status: 'COMPLETED',
                            amount: refundAmount,
                            razorpayRefundId: refundData.id,
                            processedAt: new Date(),
                            adminNotes: 'Automatically processed refund after 24h item received'
                        }

                        console.log(`[AUTO-REFUND] ✓ Razorpay refund successful for ${order.orderId}:`, refundData.id)
                    } catch (razorpayError) {
                        console.error(`[AUTO-REFUND] ✗ Razorpay refund failed for ${order.orderId}:`, razorpayError.message)

                        order.refund = {
                            ...(order.refund || {}),
                            status: 'FAILED',
                            failureReason: razorpayError.message,
                            adminNotes: 'Razorpay refund failed - manual intervention required'
                        }

                        failureCount++
                        await order.save()
                        continue
                    }
                } else {
                    // For COD or other payment methods, mark as completed
                    order.refund = {
                        ...(order.refund || {}),
                        status: 'COMPLETED',
                        amount: refundAmount,
                        processedAt: new Date(),
                        adminNotes: 'Automatically processed refund after 24h item received (Non-online payment)'
                    }

                    console.log(`[AUTO-REFUND] ✓ Refund marked completed for ${order.orderId} (Non-online payment)`)
                }

                // Update return status
                order.return.status = 'REFUND_COMPLETED'

                await order.save()

                // Send refund email to customer
                await sendRefundEmail(order)

                // Emit socket event for real-time dashboard update
                emitRefundUpdate(io, order.orderId, order.userid, 'COMPLETED')

                successCount++
            } catch (orderError) {
                console.error(`[AUTO-REFUND] Error processing order ${order.orderId}:`, orderError.message)
                failureCount++
            }
        }

        console.log(`[AUTO-REFUND] Scheduler completed:`, {
            total: orders.length,
            success: successCount,
            failed: failureCount,
            timestamp: new Date().toISOString()
        })

        return {
            success: true,
            total: orders.length,
            successCount,
            failureCount
        }
    } catch (error) {
        console.error('[AUTO-REFUND] Scheduler error:', error.message)
        return {
            success: false,
            error: error.message
        }
    }
}

/**
 * Manual refund trigger (for admin)
 * Allows admin to manually process a refund immediately
 */
exports.manualRefund = async (orderId, io = null) => {
    try {
        const order = await Order.findOne({ orderId })

        if (!order) {
            throw new Error('Order not found')
        }

        if (order.return?.status !== 'RECEIVED') {
            throw new Error('Item must be marked as received to process refund')
        }

        const refundAmount = order.refund?.amount || order.finalAmount

        // Process Razorpay refund if applicable
        if (order.paymentMethod?.toLowerCase() === 'razorpay' && order.razorpayPaymentId) {
            const refundData = await refundViaRazorpay(order, refundAmount)

            order.refund = {
                ...(order.refund || {}),
                status: 'COMPLETED',
                amount: refundAmount,
                razorpayRefundId: refundData.id,
                processedAt: new Date(),
                adminNotes: 'Manually processed refund by admin'
            }
        } else {
            order.refund = {
                ...(order.refund || {}),
                status: 'COMPLETED',
                amount: refundAmount,
                processedAt: new Date(),
                adminNotes: 'Manually processed refund by admin (Non-online payment)'
            }
        }

        order.return.status = 'REFUND_COMPLETED'
        await order.save()

        // Send email and emit events
        await sendRefundEmail(order)
        emitRefundUpdate(io, orderId, order.userid, 'COMPLETED')

        return { success: true, order }
    } catch (error) {
        console.error('[MANUAL-REFUND] Error:', error.message)
        throw error
    }
}

/**
 * Get pending refunds
 * Returns list of orders waiting for auto-refund
 */
exports.getPendingRefunds = async () => {
    try {
        const now = new Date()
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

        const pending = await Order.find({
            'return.status': 'RECEIVED',
            'refund.status': 'PENDING',
            'return.deliveredBackDate': { $lte: twentyFourHoursAgo }
        }).select('orderId userid userName finalAmount return refund createdAt')

        return pending
    } catch (error) {
        console.error('[GET-PENDING] Error:', error.message)
        return []
    }
}

/**
 * Refund Status Report
 * Daily report of refund statistics
 */
exports.getRefundReport = async (days = 7) => {
    try {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        const report = {
            period: `${days} days`,
            startDate,
            endDate: new Date(),
            totalRefunds: await Order.countDocuments({
                'refund.status': 'COMPLETED',
                'refund.processedAt': { $gte: startDate }
            }),
            totalAmount: 0,
            byPaymentMethod: {},
            byRefundType: {
                razorpay: 0,
                manual: 0
            }
        }

        const refunds = await Order.aggregate([
            {
                $match: {
                    'refund.status': 'COMPLETED',
                    'refund.processedAt': { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: '$paymentMethod',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$refund.amount' }
                }
            }
        ])

        refunds.forEach((item) => {
            report.byPaymentMethod[item._id || 'Unknown'] = {
                count: item.count,
                amount: item.totalAmount
            }
            report.totalAmount += item.totalAmount
        })

        return report
    } catch (error) {
        console.error('[REFUND-REPORT] Error:', error.message)
        return null
    }
}

// Export for direct invocation if needed
module.exports.runScheduler = async (io) => {
    return exports.processAutoRefunds(io)
}
