const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Order = require('../models/Order');

// Razorpay webhook endpoint
router.post('/api/payments/razorpay/webhook', express.json({ type: '*/*' }), async (req, res) => {
  try {
    const secret = String(process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
    const signature = req.headers['x-razorpay-signature'] || req.headers['x-razorpay-signature'.toLowerCase()];
    const body = req.body || {};

    if (secret && signature) {
      const payload = JSON.stringify(body);
      const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      if (expected !== signature) {
        return res.status(400).json({ success: false, message: 'Invalid signature' });
      }
    }

    const event = String(body?.event || '').toLowerCase();
    // Handle refund events
    if (event === 'payment.refund.created' || event === 'refund.processed' || event.includes('refund')) {
      const refund = body?.payload?.refund?.entity || body?.payload?.payment?.entity?.refunds?.[0] || null;
      if (refund && refund.notes && refund.notes.orderId) {
        const orderId = refund.notes.orderId;
        const razorpayRefundId = refund.id || refund.refund_id || null;
        const status = String(refund.status || '').toUpperCase() || 'COMPLETED';
        const order = await Order.findOne({ orderId });
        if (order) {
          order.refund = {
            ...(order.refund || {}),
            status: status === 'COMPLETED' ? 'COMPLETED' : (status === 'FAILED' ? 'FAILED' : order.refund?.status || 'COMPLETED'),
            razorpayRefundId,
            processedAt: new Date()
          };
          if (order.refund.status === 'COMPLETED') order.paymentStatus = 'Refunded';
          try { order.statusHistory = Array.isArray(order.statusHistory) ? order.statusHistory : []; order.statusHistory.push({ status: 'Refunded', timestamp: new Date(), message: `Refund processed via webhook: ${razorpayRefundId || ''}` }); } catch (e) {}
          await order.save();
          // Emit socket if available
          try { const app = require('../server').getApp(); const io = app.get('io'); if (io) io.emit('orderRefundProcessed', { orderId: order.orderId, refundId: razorpayRefundId, status: order.refund.status }); } catch (e) {}
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Razorpay webhook error:', err.message || err);
    res.status(500).json({ success: false, message: 'Webhook processing failed.' });
  }
});

module.exports = router;
