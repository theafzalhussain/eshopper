// Get order details for admin (including statusHistory)
exports.getAdminOrderDetails = async (req, res) => {
    try {
        const { orderId } = req.params;
        if (!orderId) return res.status(400).json({ success: false, message: 'Order ID required.' });
        // Security: Only allow admin (x-admin-secret header)
        if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        const order = await Order.findOne({ orderId });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
        res.json({ success: true, order });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch order.' });
    }
};
// Bulk delete orders
exports.deleteOrders = async (req, res) => {
    try {
        const { orderIds } = req.body;
        if (!Array.isArray(orderIds) || !orderIds.length) {
            return res.status(400).json({ success: false, message: 'No orderIds provided.' });
        }
        // Security: Only allow admin (x-admin-secret header)
        if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        const result = await Order.deleteMany({ orderId: { $in: orderIds } });
        // Emit socket.io event for each deleted order and dashboard update
        if (typeof req.app.get === 'function') {
            const io = req.app.get('io');
            if (io) {
                orderIds.forEach(orderId => {
                    io.emit('orderDeleted', { orderId });
                });
                io.emit('dashboardUpdate');
            }
        }
        res.json({ success: true, deletedCount: result.deletedCount });
    } catch (err) {
        console.error('Bulk delete error:', err.message);
        res.status(500).json({ success: false, message: 'Bulk delete failed.' });
    }
};

const { sendTransactionalEmail } = require('../src/utils/email');
const { sendEmail } = require('../emailService');
const {
    sendOrderStatus,
} = require('../mailController');
const { enqueueJob, isBullMQEnabled } = require('../utils/queues');
const axios = require('axios');
const Order = require('../models/Order');
const Product = require('../models/Product');

const CANCELLABLE_STATUSES = new Set([
    'Order Placed',
    'Ordered',
    'Confirmed',
    'Packed'
]);

const RETURN_WINDOW_DAYS = Math.max(1, Number(process.env.ORDER_RETURN_WINDOW_DAYS || 7));

const normalizeStatus = (status = '') => String(status || '').trim().toLowerCase();

const getRequestUserId = (req) => String(req.body?.userId || req.body?.userid || req.body?.user || req.query?.userId || req.query?.userid || req.params?.userId || req.params?.userid || '').trim();

const isAdminAuthorized = (req) => {
    if (req.user && (req.user.isAdmin || String(req.user.role || '').toLowerCase() === 'admin')) return true;
    return req.headers['x-admin-secret'] === process.env.ADMIN_SECRET;
};

const getStatusTimestamp = (order, targetStatus) => {
    const normalizedTarget = normalizeStatus(targetStatus);
    const history = Array.isArray(order?.statusHistory) ? order.statusHistory : [];
    const match = [...history].reverse().find((entry) => normalizeStatus(entry?.status) === normalizedTarget);
    return match?.timestamp ? new Date(match.timestamp) : null;
};

const getCancellationRules = (order) => {
    const policy = order?.cancellationPolicy || {};
    const cancellableStatuses = Array.isArray(policy.cancellableStatuses) && policy.cancellableStatuses.length
        ? policy.cancellableStatuses
        : Array.from(CANCELLABLE_STATUSES);
    return {
        cancellableStatuses: new Set(cancellableStatuses.map((value) => String(value || '').trim())),
        canCancelUntilMinutes: policy.canCancelUntilMinutes == null ? null : Number(policy.canCancelUntilMinutes)
    };
};

const canCancelOrder = (order) => {
    const currentStatus = String(order?.orderStatus || '').trim();
    const { cancellableStatuses } = getCancellationRules(order);
    if (!cancellableStatuses.has(currentStatus)) return false;
    if (['Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned'].includes(currentStatus)) return false;
    if (order?.cancellation?.status && order.cancellation.status !== 'NOT_CANCELLED') return false;
    return true;
};

const canRequestReturn = (order) => {
    const currentStatus = String(order?.orderStatus || '').trim();
    if (currentStatus !== 'Delivered') return false;
    if (order?.return?.status && order.return.status !== 'NOT_INITIATED') return false;
    const deliveredAt = getStatusTimestamp(order, 'Delivered') || order?.deliveryOtpVerifiedAt || order?.updatedAt || order?.orderDate;
    if (!deliveredAt) return false;
    const diffDays = (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= RETURN_WINDOW_DAYS;
};

const getOrderLifecycleFlags = (order) => ({
    canCancel: canCancelOrder(order),
    canReturn: canRequestReturn(order),
    cancellationStatus: order?.cancellation?.status || 'NOT_CANCELLED',
    refundStatus: order?.refund?.status || 'NOT_APPLICABLE',
    returnStatus: order?.return?.status || 'NOT_INITIATED'
});

const buildRazorpayRefundClientPayload = (amount, currency = 'INR') => ({
    amount: Math.max(1, Math.round(Number(amount || 0) * 100)),
    currency,
    speed: 'normal',
    notes: {
        source: 'eshopper-order-cancellation'
    }
});

const refundViaRazorpay = async (order, amount) => {
    const keyId = String(process.env.RAZORPAY_KEY_ID || '').trim();
    const keySecret = String(process.env.RAZORPAY_KEY_SECRET || '').trim();
    if (!keyId || !keySecret) {
        const error = new Error('Razorpay credentials are not configured');
        error.status = 500;
        throw error;
    }
    if (!order?.razorpayPaymentId) {
        const error = new Error('Missing Razorpay payment id for refund');
        error.status = 400;
        throw error;
    }
    const response = await axios.post(
        `https://api.razorpay.com/v1/payments/${order.razorpayPaymentId}/refund`,
        buildRazorpayRefundClientPayload(amount),
        {
            auth: { username: keyId, password: keySecret },
            timeout: 30000
        }
    );
    return response.data;
};

const sendOrderLifecycleSocketUpdate = (req, event, payload) => {
    if (typeof req.app.get !== 'function') return;
    const io = req.app.get('io');
    if (!io) return;
    io.emit(event, payload);
    io.emit('dashboardUpdate');
};

// Get all orders for a user
exports.getUserOrdersList = async (req, res) => {
    try {
        const userId = getRequestUserId(req) || (req.params.userId ? String(req.params.userId).trim() : '');
        if (!userId) return res.status(400).json({ success: false, message: 'User ID required.' });

        const orders = await Order.find({ userid: userId }).sort({ createdAt: -1 });
        return res.json({ success: true, orders: orders || [] });
    } catch (err) {
        console.error('Get user orders list error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch orders.' });
    }
};

exports.getUserOrderDetails = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = getRequestUserId(req);
        if (!orderId) return res.status(400).json({ success: false, message: 'Order ID required.' });
        if (!userId) return res.status(400).json({ success: false, message: 'User ID required.' });

        const order = await Order.findOne({ orderId, userid: userId });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

        return res.json({
            success: true,
            order,
            lifecycle: getOrderLifecycleFlags(order)
        });
    } catch (err) {
        console.error('Get user order details error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch order.' });
    }
};

exports.cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = getRequestUserId(req);
        const reason = String(req.body?.reason || '').trim();
        const publicMessage = String(req.body?.publicMessage || '').trim() || 'Your cancellation has been approved. Refunds will be processed.';
        if (!orderId) return res.status(400).json({ success: false, message: 'Order ID required.' });
        if (!userId) return res.status(400).json({ success: false, message: 'User ID required.' });
        // Read current order to validate cancellability (fast check)
        const current = await Order.findOne({ orderId, userid: userId });
        if (!current) return res.status(404).json({ success: false, message: 'Order not found.' });
        if (!canCancelOrder(current)) {
            return res.status(400).json({ success: false, message: 'Order can no longer be cancelled.' });
        }

        const idempotencyKey = String(req.headers['x-idempotency-key'] || req.body?.idempotencyKey || '').trim();
        const now = new Date();

        // Attempt an atomic conditional update so concurrent cancels cannot both proceed.
        const query = {
            orderId,
            userid: userId,
            $or: [
                { 'cancellation.status': { $exists: false } },
                { 'cancellation.status': 'NOT_CANCELLED' }
            ],
            orderStatus: { $nin: ['Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned'] }
        };

        const refundRequired = String(current.paymentMethod || '').toLowerCase() !== 'cod' && String(current.paymentStatus || '').toLowerCase() === 'paid';
        const finalAmount = Number(current.finalAmount || 0);

        const setObj = {
            'cancellation.status': 'APPROVED',
            'cancellation.requestedAt': current.cancellation?.requestedAt || now,
            'cancellation.approvedAt': now,
            'cancellation.reason': reason || current.cancellation?.reason || 'Customer requested cancellation',
            'cancellation.publicMessage': publicMessage,
            'cancellation.cancelledBy': 'USER',
            'cancellation.adminNotes': current.cancellation?.adminNotes || null,
            'cancellation.rejectionReason': null,
            orderStatus: 'Cancelled',
            paymentStatus: refundRequired ? 'Refund Pending' : (String(current.paymentMethod || '').toLowerCase() === 'cod' ? 'Not Applicable' : current.paymentStatus || 'Cancelled')
        };

        if (idempotencyKey) setObj['cancellation.idempotencyKey'] = idempotencyKey;

        const update = {
            $set: setObj,
            $push: { statusHistory: { status: 'Cancelled', timestamp: now, message: reason || 'Order cancelled by user' } }
        };

        const updated = await Order.findOneAndUpdate(query, update, { new: true });
        if (!updated) {
            // Either already cancelled/processing or a race occurred.
            return res.status(409).json({ success: false, message: 'Order cancellation already processed or in progress.' });
        }

        // If no refund required, mark refund not applicable and return.
        if (!refundRequired) {
            updated.refund = {
                ...(updated.refund || {}),
                status: 'NOT_APPLICABLE',
                amount: 0,
                method: null,
                razorpayRefundId: null,
                processedAt: null,
                initiatedAt: null,
                failureReason: null,
                adminNotes: null
            };
            await updated.save();
            sendOrderLifecycleSocketUpdate(req, 'orderCancelled', { orderId: updated.orderId, userid: updated.userid, amount: updated.finalAmount || updated.totalAmount || 0, refundStatus: updated.refund.status, reason: updated.cancellation.reason, publicMessage: updated.cancellation.publicMessage });
            return res.json({ success: true, message: 'Order cancelled successfully.', refund: { required: false, status: 'NOT_APPLICABLE' }, lifecycle: getOrderLifecycleFlags(updated) });
        }

        // Enqueue refund job for background processing (async refunds)
        updated.refund = {
            ...(updated.refund || {}),
            status: 'PENDING',
            amount: finalAmount,
            method: 'ORIGINAL_PAYMENT_METHOD',
            initiatedAt: now,
            processedAt: null,
            failureReason: null,
            adminNotes: null,
            razorpayRefundId: null
        };
        await updated.save();

        // Create refund job
        try {
            const RefundJob = require('../models/RefundJob');
            const job = new RefundJob({
                orderId: updated.orderId,
                userid: updated.userid,
                amount: finalAmount,
                currency: 'INR',
                status: 'PENDING',
                attempts: 0,
                idempotencyKey: updated.cancellation?.idempotencyKey || null
            });
            await job.save();

            if (isBullMQEnabled()) {
                await enqueueJob('refund', {
                    orderId: updated.orderId,
                    userid: updated.userid,
                    amount: finalAmount,
                    currency: 'INR',
                    refundJobId: job._id?.toString(),
                    idempotencyKey: updated.cancellation?.idempotencyKey || null
                }, { attempts: 5, backoff: { type: 'exponential', delay: 10000 } });
            } else {
                // Trigger worker immediately if available
                try { const worker = require('../utils/refundWorker'); if (worker && typeof worker.processOneJob === 'function') worker.processOneJob().catch(() => {}); } catch (e) {}
            }
        } catch (e) {
            console.error('Failed to enqueue refund job:', e.message || e);
        }

        sendOrderLifecycleSocketUpdate(req, 'orderCancelled', { orderId: updated.orderId, userid: updated.userid, amount: updated.finalAmount || updated.totalAmount || 0, refundStatus: updated.refund.status, reason: updated.cancellation.reason, publicMessage: updated.cancellation.publicMessage });
        return res.json({ success: true, message: 'Order cancelled. Refund has been queued for processing.', refund: { required: true, status: 'PENDING', amount: updated.refund.amount }, lifecycle: getOrderLifecycleFlags(updated) });
    } catch (err) {
        console.error('Cancel order error:', err.message);
        return res.status(err.status || 500).json({ success: false, message: err.message || 'Failed to cancel order.' });
    }
};

exports.requestReturn = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = getRequestUserId(req);
        const reason = String(req.body?.reason || '').trim();
        const condition = String(req.body?.condition || 'NOT_SPECIFIED').trim();
        const description = String(req.body?.description || '').trim();

        if (!orderId) return res.status(400).json({ success: false, message: 'Order ID required.' });
        if (!userId) return res.status(400).json({ success: false, message: 'User ID required.' });
        if (!reason) return res.status(400).json({ success: false, message: 'Return reason required.' });

        const order = await Order.findOne({ orderId, userid: userId });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
        if (!canRequestReturn(order)) {
            return res.status(400).json({ success: false, message: 'Return is not available for this order.' });
        }

        order.return = {
            ...(order.return || {}),
            status: 'REQUESTED',
            requestedAt: new Date(),
            approvedAt: null,
            pickupDate: null,
            deliveredBackDate: null,
            reason,
            condition,
            description,
            returnTrackingId: order.return?.returnTrackingId || `RET-${Date.now()}`,
            pickupAgent: null,
            adminInspectionNotes: null,
            returnRefundAmount: 0,
            rejectionReason: null
        };

        await order.save();
        sendOrderLifecycleSocketUpdate(req, 'orderReturnRequested', { orderId: order.orderId, userid: order.userid, returnStatus: order.return.status });

        return res.json({
            success: true,
            message: 'Return request submitted successfully.',
            returnRequest: order.return,
            lifecycle: getOrderLifecycleFlags(order)
        });
    } catch (err) {
        console.error('Return request error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to request return.' });
    }
};

exports.adminUpdateOrderCancellation = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, adminNotes, rejectionReason } = req.body;
        if (!orderId) return res.status(400).json({ success: false, message: 'Order ID required.' });
        if (!isAdminAuthorized(req)) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const order = await Order.findOne({ orderId });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

        const nextStatus = String(status || '').trim().toUpperCase();
        if (!['APPROVED', 'REJECTED', 'COMPLETED'].includes(nextStatus)) {
            return res.status(400).json({ success: false, message: 'Invalid cancellation status.' });
        }

        order.cancellation = {
            ...(order.cancellation || {}),
            status: nextStatus,
            approvedAt: nextStatus === 'APPROVED' || nextStatus === 'COMPLETED' ? new Date() : order.cancellation?.approvedAt || null,
            adminNotes: adminNotes || order.cancellation?.adminNotes || null,
            rejectionReason: nextStatus === 'REJECTED' ? (rejectionReason || order.cancellation?.rejectionReason || 'Rejected by admin') : null,
            publicMessage: String(req.body?.publicMessage || '').trim() || order.cancellation?.publicMessage || null
        };

        await order.save();
        sendOrderLifecycleSocketUpdate(req, 'orderCancellationUpdated', { orderId: order.orderId, cancellationStatus: order.cancellation.status, publicMessage: order.cancellation.publicMessage || null });
        return res.json({ success: true, order });
    } catch (err) {
        console.error('Admin cancellation update error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to update cancellation.' });
    }
};

exports.adminUpdateOrderRefund = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, amount, razorpayRefundId, adminNotes, failureReason } = req.body;
        if (!orderId) return res.status(400).json({ success: false, message: 'Order ID required.' });
        if (!isAdminAuthorized(req)) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const order = await Order.findOne({ orderId });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

        const nextStatus = String(status || '').trim().toUpperCase();
        if (!['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIALLY_REFUNDED'].includes(nextStatus)) {
            return res.status(400).json({ success: false, message: 'Invalid refund status.' });
        }

        order.refund = {
            ...(order.refund || {}),
            status: nextStatus,
            amount: amount == null ? (order.refund?.amount || 0) : Number(amount),
            razorpayRefundId: razorpayRefundId || order.refund?.razorpayRefundId || null,
            processedAt: nextStatus === 'COMPLETED' ? new Date() : order.refund?.processedAt || null,
            adminNotes: adminNotes || order.refund?.adminNotes || null,
            failureReason: nextStatus === 'FAILED' ? (failureReason || order.refund?.failureReason || 'Refund failed') : null
        };

        await order.save();
        sendOrderLifecycleSocketUpdate(req, 'orderRefundUpdated', { orderId: order.orderId, refundStatus: order.refund.status });
        return res.json({ success: true, order });
    } catch (err) {
        console.error('Admin refund update error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to update refund.' });
    }
};

exports.adminRetryRefund = async (req, res) => {
    try {
        const { orderId } = req.params;
        if (!orderId) return res.status(400).json({ success: false, message: 'Order ID required.' });
        if (!isAdminAuthorized(req)) return res.status(403).json({ success: false, message: 'Unauthorized' });

        const order = await Order.findOne({ orderId });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

        const amount = Number(order.refund?.amount || order.finalAmount || 0);
        const RefundJob = require('../models/RefundJob');
        const job = new RefundJob({ orderId: order.orderId, userid: order.userid, amount, currency: 'INR', status: 'PENDING', attempts: 0 });
        await job.save();

        // mark order refund as PENDING
        order.refund = { ...(order.refund || {}), status: 'PENDING', initiatedAt: new Date(), processedAt: null, failureReason: null };
        await order.save();

        if (isBullMQEnabled()) {
            await enqueueJob('refund', {
                orderId: order.orderId,
                userid: order.userid,
                amount,
                currency: 'INR',
                refundJobId: job._id?.toString()
            }, { attempts: 5, backoff: { type: 'exponential', delay: 10000 } });
        } else {
            // try immediate process trigger
            try { const worker = require('../utils/refundWorker'); if (worker && typeof worker.processOneJob === 'function') worker.processOneJob().catch(() => {}); } catch (e) {}
        }

        sendOrderLifecycleSocketUpdate(req, 'orderRefundQueued', { orderId: order.orderId, refundStatus: order.refund.status });
        return res.json({ success: true, message: 'Refund retried and queued.', jobId: job._id, order });
    } catch (err) {
        console.error('Admin retry refund error:', err.message || err);
        return res.status(500).json({ success: false, message: 'Failed to queue refund retry.' });
    }
};

exports.adminUpdateOrderReturn = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, pickupDate, deliveredBackDate, returnRefundAmount, pickupAgent, adminInspectionNotes, rejectionReason } = req.body;
        if (!orderId) return res.status(400).json({ success: false, message: 'Order ID required.' });
        if (!isAdminAuthorized(req)) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const order = await Order.findOne({ orderId });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

        const nextStatus = String(status || '').trim().toUpperCase();
        if (!['REQUESTED', 'APPROVED', 'REJECTED', 'PICKED_UP', 'IN_TRANSIT', 'RECEIVED', 'INSPECTED', 'REFUND_COMPLETED', 'REFUND_FAILED'].includes(nextStatus)) {
            return res.status(400).json({ success: false, message: 'Invalid return status.' });
        }

        order.return = {
            ...(order.return || {}),
            status: nextStatus,
            approvedAt: nextStatus === 'APPROVED' ? new Date() : order.return?.approvedAt || null,
            pickupDate: pickupDate ? new Date(pickupDate) : order.return?.pickupDate || null,
            deliveredBackDate: deliveredBackDate ? new Date(deliveredBackDate) : order.return?.deliveredBackDate || null,
            returnRefundAmount: returnRefundAmount == null ? (order.return?.returnRefundAmount || 0) : Number(returnRefundAmount),
            pickupAgent: pickupAgent || order.return?.pickupAgent || null,
            adminInspectionNotes: adminInspectionNotes || order.return?.adminInspectionNotes || null,
            rejectionReason: nextStatus === 'REJECTED' ? (rejectionReason || order.return?.rejectionReason || 'Rejected by admin') : null
        };

        await order.save();
        sendOrderLifecycleSocketUpdate(req, 'orderReturnUpdated', { orderId: order.orderId, returnStatus: order.return.status });
        return res.json({ success: true, order });
    } catch (err) {
        console.error('Admin return update error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to update return.' });
    }
};

// Get all notes for an order (admin only)
exports.getOrderNotes = async (req, res) => {
    try {
        const { orderId } = req.params;
        if (!orderId) return res.status(400).json({ success: false, message: 'Order ID required.' });
        // Security: Only allow admin (x-admin-secret header)
        if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        const order = await Order.findOne({ orderId });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
        res.json({ success: true, notes: order.orderNotes || [] });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch notes.' });
    }
};

// Add a new note to an order (admin only)
exports.addOrderNote = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { note, author } = req.body;
        if (!orderId || !note) return res.status(400).json({ success: false, message: 'Order ID and note required.' });
        // Security: Only allow admin (x-admin-secret header)
        if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        const order = await Order.findOne({ orderId });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
        order.orderNotes.push({ note, author });
        await order.save();
        // Emit dashboard update event
        if (typeof req.app.get === 'function') {
            const io = req.app.get('io');
            if (io) io.emit('dashboardUpdate');
        }
        res.json({ success: true, notes: order.orderNotes });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to add note.' });
    }
};


// Unified order status email logic
exports.sendOrderStatusEmail = async (req, res) => {
    try {
        const { orderId, status } = req.body;
        if (!orderId || !status) return res.status(400).json({ message: 'Order ID and status required.' });
        const orderData = await Order.findOne({ orderId }).populate('products.productid');
        if (!orderData) return res.status(404).json({ message: 'Order not found.' });

        // Prepare product summary for email
        const items = (orderData.products || []).map(item => {
            const prod = item.productid && typeof item.productid === 'object' ? item.productid : {};
            return {
                imageUrl: prod.pic1 || item.pic1 || '',
                name: prod.name || item.name || '',
                size: item.size || prod.size || '',
                color: item.color || prod.color || '',
                quantity: item.quantity || item.qty || 1,
                subtotal: (prod.finalprice || item.price || 0) * (item.quantity || item.qty || 1),
                brand: prod.brand || '',
                description: prod.description || '',
                sku: prod._id || item.productid || '',
            };
        });

        // Progress stepper logic (customize as needed)
        const allSteps = [
            { key: 'Order Received', label: 'Received', icon: '&#10003;' },
            { key: 'Order Confirmed', label: 'Confirmed', icon: '&#128179;' },
            { key: 'Order Packed', label: 'Packed', icon: '&#9671;' },
            { key: 'Order Shipped', label: 'Shipped', icon: '&#10148;' },
            { key: 'Out for Delivery', label: 'Out for Delivery', icon: '&#10022;' },
            { key: 'Delivered', label: 'Delivered', icon: '&#9989;' },
        ];
        const normalizedStatus = String(status).toLowerCase();
        const currentStep = allSteps.findIndex(s => s.key.toLowerCase() === normalizedStatus);
        const progressSteps = allSteps.map((step, idx) => ({
            ...step,
            state: idx < currentStep ? 'done' : idx === currentStep ? 'active' : 'pending',
            isCurrent: idx === currentStep,
        }));
        const progressPercent = Math.max(0, Math.round(((currentStep + 1) / allSteps.length) * 100));

        // Compose payload for template
        const payload = {
            orderId: orderData.orderId,
            customerName: orderData.userName,
            orderDate: orderData.orderDate ? new Date(orderData.orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
            items,
            shippingName: orderData.shippingAddress?.fullName || '',
            shippingAddressLine1: orderData.shippingAddress?.addressline1 || '',
            shippingAddressLine2: orderData.shippingAddress?.city || '',
            shippingAddressLine3: orderData.shippingAddress?.state ? `${orderData.shippingAddress.state} ${orderData.shippingAddress.pin}` : '',
            shippingPhone: orderData.shippingAddress?.phone || '',
            paymentMethod: orderData.paymentMethod,
            paymentStatus: orderData.paymentStatus,
            subtotal: orderData.totalAmount,
            shippingCharges: orderData.shippingAmount,
            totalAmount: orderData.finalAmount,
            progressSteps,
            progressPercent,
            trackingUrl: `${process.env.BRAND_SITE_URL || 'https://eshopperr.me'}/order-tracking/${orderData.orderId}`,
            placedInvoiceUrl: `${process.env.BRAND_SITE_URL || 'https://eshopperr.me'}/invoice/${orderData.orderId}`,
            orderDetailsUrl: `${process.env.BRAND_SITE_URL || 'https://eshopperr.me'}/order/${orderData.orderId}`,
            whatsappUrl: `https://wa.me/${process.env.SUPPORT_PHONE || '919999999999'}`,
            supportEmail: process.env.SUPPORT_EMAIL || 'support@eshopperr.me',
            companyAddress: process.env.COMPANY_ADDRESS || 'Eshopper Luxe, New Delhi, India',
            privacyPolicyUrl: `${process.env.BRAND_SITE_URL || 'https://eshopperr.me'}/privacy-policy`,
            termsUrl: `${process.env.BRAND_SITE_URL || 'https://eshopperr.me'}/terms`,
        };

        // Render and send email using mailController and emailService.js
        const html = await sendOrderStatus({ status, ...payload });
        await sendEmail({
            to: orderData.userEmail,
            subject: `Your Order ${orderData.orderId} - ${status}`,
            template: `order-${normalizedStatus.replace(/ /g, '-').toLowerCase()}.hbs`,
            context: payload
        });
        res.json({ result: `Order ${status} email sent.` });
    } catch (err) {
        console.error('Order status email error:', err.message);
        res.status(500).json({ error: 'Failed to send order status email.' });
    }
};

// ════════════════════════════════════════════════════════════════════════════
// 🔴 ADMIN RETURN MANAGEMENT APIS
// ════════════════════════════════════════════════════════════════════════════

// Get all returns for admin dashboard
exports.adminGetAllReturns = async (req, res) => {
    try {
        if (!isAdminAuthorized(req)) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const { status, orderId, userId, page = 1, limit = 20 } = req.query;
        const filter = { 'return.status': { $ne: 'NOT_INITIATED' } };

        if (status) filter['return.status'] = String(status).trim().toUpperCase();
        if (orderId) filter.orderId = new RegExp(String(orderId).trim(), 'i');
        if (userId) filter.userid = String(userId).trim();

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const returns = await Order.find(filter)
            .select('orderId userid userName userEmail finalAmount return createdAt orderDate')
            .sort({ 'return.requestedAt': -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Order.countDocuments(filter);

        return res.json({
            success: true,
            returns,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        console.error('Get all returns error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch returns.' });
    }
};

// Get return details for specific order
exports.adminGetReturnDetails = async (req, res) => {
    try {
        if (!isAdminAuthorized(req)) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const { orderId } = req.params;
        if (!orderId) return res.status(400).json({ success: false, message: 'Order ID required.' });

        const order = await Order.findOne({ orderId });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

        return res.json({
            success: true,
            order: {
                orderId: order.orderId,
                userid: order.userid,
                userName: order.userName,
                userEmail: order.userEmail,
                finalAmount: order.finalAmount,
                products: order.products,
                orderDate: order.orderDate,
                return: order.return,
                refund: order.refund,
                paymentMethod: order.paymentMethod,
                shippingAddress: order.shippingAddress
            }
        });
    } catch (err) {
        console.error('Get return details error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch return details.' });
    }
};

// Update return status (approve/reject/received/refunded)
exports.adminUpdateReturnStatus = async (req, res) => {
    try {
        if (!isAdminAuthorized(req)) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const { orderId } = req.params;
        const { status, pickupDate, pickupAgent, riderPhone, adminInspectionNotes, refundAmount, rejectionReason } = req.body;

        if (!orderId) return res.status(400).json({ success: false, message: 'Order ID required.' });
        if (!status) return res.status(400).json({ success: false, message: 'Status required.' });

        const order = await Order.findOne({ orderId });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

        const validStatuses = ['REQUESTED', 'APPROVED', 'REJECTED', 'PICKED_UP', 'IN_TRANSIT', 'RECEIVED', 'INSPECTED', 'REFUND_COMPLETED', 'REFUND_FAILED'];
        const nextStatus = String(status).trim().toUpperCase();

        if (!validStatuses.includes(nextStatus)) {
            return res.status(400).json({ success: false, message: 'Invalid return status.' });
        }

        // Update return status
        order.return = {
            ...(order.return || {}),
            status: nextStatus,
            approvedAt: nextStatus === 'APPROVED' ? new Date() : (nextStatus === 'REJECTED' ? null : order.return?.approvedAt),
            pickupDate: pickupDate ? new Date(pickupDate) : order.return?.pickupDate,
            deliveredBackDate: nextStatus === 'RECEIVED' ? new Date() : order.return?.deliveredBackDate,
            pickupAgent: pickupAgent || order.return?.pickupAgent,
            adminInspectionNotes: adminInspectionNotes || order.return?.adminInspectionNotes,
            returnRefundAmount: refundAmount ? Number(refundAmount) : order.return?.returnRefundAmount,
            rejectionReason: nextStatus === 'REJECTED' ? (rejectionReason || 'Rejected by admin') : null
        };

        // If item received, trigger refund if within 24 hours
        if (nextStatus === 'RECEIVED') {
            order.return.deliveredBackDate = new Date();
            // Schedule automatic refund for 24 hours later
            const refundScheduleTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
            order.refund = {
                ...(order.refund || {}),
                status: 'PENDING',
                amount: order.return.returnRefundAmount || order.finalAmount,
                initiatedAt: refundScheduleTime
            };
        }

        await order.save();
        sendOrderLifecycleSocketUpdate(req, 'orderReturnUpdated', {
            orderId: order.orderId,
            userid: order.userid,
            returnStatus: order.return.status,
            refundStatus: order.refund?.status
        });

        return res.json({
            success: true,
            message: 'Return status updated successfully.',
            order: {
                orderId: order.orderId,
                return: order.return,
                refund: order.refund
            }
        });
    } catch (err) {
        console.error('Update return status error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to update return status.' });
    }
};

// Mark item as received by admin (triggers 24h auto-refund)
exports.adminMarkReturnReceived = async (req, res) => {
    try {
        if (!isAdminAuthorized(req)) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const { orderId } = req.params;
        const { adminInspectionNotes, refundAmount } = req.body;

        if (!orderId) return res.status(400).json({ success: false, message: 'Order ID required.' });

        const order = await Order.findOne({ orderId });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

        if (order.return?.status !== 'IN_TRANSIT') {
            return res.status(400).json({ success: false, message: 'Return must be in transit to mark as received.' });
        }

        order.return.status = 'RECEIVED';
        order.return.deliveredBackDate = new Date();
        order.return.adminInspectionNotes = adminInspectionNotes || order.return.adminInspectionNotes;
        order.return.returnRefundAmount = refundAmount ? Number(refundAmount) : order.finalAmount;

        // Schedule automatic refund
        order.refund = {
            ...(order.refund || {}),
            status: 'PENDING',
            amount: order.return.returnRefundAmount,
            initiatedAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        };

        await order.save();
        sendOrderLifecycleSocketUpdate(req, 'orderReturnReceived', {
            orderId: order.orderId,
            userid: order.userid
        });

        return res.json({
            success: true,
            message: 'Item marked as received. Refund will be processed in 24 hours.',
            order: {
                orderId: order.orderId,
                return: order.return,
                refund: order.refund
            }
        });
    } catch (err) {
        console.error('Mark return received error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to mark return as received.' });
    }
};

// Manually trigger refund
exports.adminProcessRefund = async (req, res) => {
    try {
        if (!isAdminAuthorized(req)) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const { orderId } = req.params;
        const { amount, adminNotes } = req.body;

        if (!orderId) return res.status(400).json({ success: false, message: 'Order ID required.' });

        const order = await Order.findOne({ orderId });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

        const refundAmount = amount ? Number(amount) : (order.return?.returnRefundAmount || order.finalAmount);

        // Process Razorpay refund if online payment
        if (order.paymentMethod?.toLowerCase() === 'razorpay' && order.razorpayPaymentId) {
            try {
                const refundData = await refundViaRazorpay(order, refundAmount);
                order.refund = {
                    ...(order.refund || {}),
                    status: 'COMPLETED',
                    amount: refundAmount,
                    razorpayRefundId: refundData.id,
                    processedAt: new Date(),
                    adminNotes: adminNotes || 'Manually processed refund'
                };
            } catch (refundErr) {
                order.refund = {
                    ...(order.refund || {}),
                    status: 'FAILED',
                    amount: refundAmount,
                    failureReason: refundErr.message,
                    adminNotes: adminNotes || 'Refund processing failed'
                };
            }
        } else {
            // For COD or other payment methods, just mark as completed
            order.refund = {
                ...(order.refund || {}),
                status: 'COMPLETED',
                amount: refundAmount,
                processedAt: new Date(),
                adminNotes: adminNotes || 'Refund processed (manual)'
            };
        }

        order.return.status = 'REFUND_COMPLETED';
        await order.save();

        sendOrderLifecycleSocketUpdate(req, 'orderRefundProcessed', {
            orderId: order.orderId,
            userid: order.userid,
            refundStatus: order.refund.status
        });

        return res.json({
            success: true,
            message: 'Refund processed successfully.',
            order: {
                orderId: order.orderId,
                refund: order.refund,
                return: order.return
            }
        });
    } catch (err) {
        console.error('Process refund error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to process refund.' });
    }
};

// Get return statistics for admin dashboard
exports.adminGetReturnStats = async (req, res) => {
    try {
        if (!isAdminAuthorized(req)) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const stats = {
            totalRequests: await Order.countDocuments({ 'return.status': { $ne: 'NOT_INITIATED' } }),
            pending: await Order.countDocuments({ 'return.status': 'REQUESTED' }),
            approved: await Order.countDocuments({ 'return.status': 'APPROVED' }),
            pickedUp: await Order.countDocuments({ 'return.status': 'PICKED_UP' }),
            inTransit: await Order.countDocuments({ 'return.status': 'IN_TRANSIT' }),
            received: await Order.countDocuments({ 'return.status': 'RECEIVED' }),
            refundCompleted: await Order.countDocuments({ 'return.status': 'REFUND_COMPLETED' }),
            rejected: await Order.countDocuments({ 'return.status': 'REJECTED' }),
            totalRefundAmount: (await Order.aggregate([
                { $match: { 'return.status': 'REFUND_COMPLETED', 'refund.status': 'COMPLETED' } },
                { $group: { _id: null, total: { $sum: '$refund.amount' } } }
            ]))[0]?.total || 0
        };

        return res.json({ success: true, stats });
    } catch (err) {
        console.error('Get return stats error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch return statistics.' });
    }
};

// ════════════════════════════════════════════════════════════════════════════
// SCHEDULER & REPORTING ENDPOINTS
// ════════════════════════════════════════════════════════════════════════════

// Manually trigger auto-refund scheduler
exports.adminTriggerAutoRefund = async (req, res) => {
    try {
        if (!isAdminAuthorized(req)) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const { processAutoRefunds } = require('../utils/autoRefundScheduler');
        const io = req.app.get('io');
        
        const result = await processAutoRefunds(io);

        return res.json({
            success: true,
            message: `Auto-refund processing completed: ${result.successCount} successful, ${result.failureCount} failed`,
            result
        });
    } catch (err) {
        console.error('Trigger auto-refund error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to trigger auto-refund.' });
    }
};

// Get pending refunds list
exports.adminGetPendingRefunds = async (req, res) => {
    try {
        if (!isAdminAuthorized(req)) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const { getPendingRefunds } = require('../utils/autoRefundScheduler');
        const pending = await getPendingRefunds();

        return res.json({
            success: true,
            count: pending.length,
            pendingRefunds: pending
        });
    } catch (err) {
        console.error('Get pending refunds error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch pending refunds.' });
    }
};

// Get refund report
exports.adminGetRefundReport = async (req, res) => {
    try {
        if (!isAdminAuthorized(req)) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const { days = 7 } = req.query;
        const { getRefundReport } = require('../utils/autoRefundScheduler');
        const report = await getRefundReport(parseInt(days));

        return res.json({
            success: true,
            report
        });
    } catch (err) {
        console.error('Get refund report error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch refund report.' });
    }
};
