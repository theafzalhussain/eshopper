const axios = require('axios');
const RefundJob = require('../models/RefundJob');
const Order = require('../models/Order');

const RAZORPAY_KEY_ID = String(process.env.RAZORPAY_KEY_ID || '').trim();
const RAZORPAY_KEY_SECRET = String(process.env.RAZORPAY_KEY_SECRET || '').trim();

const MAX_ATTEMPTS = 5;
const POLL_INTERVAL_MS = Math.max(5000, Number(process.env.REFUND_WORKER_INTERVAL_MS || 10000));

async function processOneJob() {
  const job = await RefundJob.findOneAndUpdate(
    { status: 'PENDING', attempts: { $lt: MAX_ATTEMPTS } },
    { $inc: { attempts: 1 }, $set: { status: 'PROCESSING' } },
    { new: true }
  );
  if (!job) return null;

  try {
    // Double-check order hasn't already been refunded
    const order = await Order.findOne({ orderId: job.orderId });
    if (!order) {
      job.status = 'FAILED';
      job.lastError = 'Order not found';
      await job.save();
      return job;
    }
    if (order.refund && order.refund.status === 'COMPLETED' && order.refund.razorpayRefundId) {
      job.status = 'COMPLETED';
      job.razorpayRefundId = order.refund.razorpayRefundId;
      await job.save();
      return job;
    }

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      job.status = 'FAILED';
      job.lastError = 'Razorpay credentials missing';
      await job.save();
      return job;
    }

    if (!order.razorpayPaymentId) {
      job.status = 'FAILED';
      job.lastError = 'Missing razorpayPaymentId on order';
      await job.save();
      return job;
    }

    // Call Razorpay refund API
    const payload = {
      amount: Math.max(1, Math.round(Number(job.amount || 0) * 100)),
      currency: job.currency || 'INR',
      speed: 'normal',
      notes: { source: 'eshopper-refund-worker', orderId: job.orderId }
    };

    const resp = await axios.post(
      `https://api.razorpay.com/v1/payments/${order.razorpayPaymentId}/refund`,
      payload,
      { auth: { username: RAZORPAY_KEY_ID, password: RAZORPAY_KEY_SECRET }, timeout: 30000 }
    );

    const refundData = resp.data || {};
    job.status = 'COMPLETED';
    job.razorpayRefundId = refundData.id || refundData.refund_id || null;
    job.lastError = null;
    await job.save();

    // Update order refund record
    order.refund = {
      ...(order.refund || {}),
      status: 'COMPLETED',
      amount: job.amount,
      razorpayRefundId: job.razorpayRefundId,
      processedAt: new Date()
    };
    order.paymentStatus = 'Refunded';
    try { order.statusHistory = Array.isArray(order.statusHistory) ? order.statusHistory : []; order.statusHistory.push({ status: 'Refunded', timestamp: new Date(), message: `Refund processed: ${job.razorpayRefundId || ''}` }); } catch (e) {}
    await order.save();

    // emit socket if app available via global (server sets app 'io')
    try {
      const getApp = require('../server').getApp || (() => null);
      const app = getApp();
      if (app && typeof app.get === 'function') {
        const io = app.get('io');
        if (io) io.emit('orderRefundProcessed', { orderId: job.orderId, refundId: job.razorpayRefundId, status: 'COMPLETED' });
      }
    } catch (e) {}

    return job;
  } catch (err) {
    job.status = 'FAILED';
    job.lastError = String(err?.message || err);
    await job.save();
    return job;
  }
}

async function processRefundJobData(payload = {}) {
  const orderId = String(payload.orderId || '').trim();
  if (!orderId) throw new Error('Missing orderId for refund job');

  let jobRecord = null;
  if (payload.refundJobId) {
    jobRecord = await RefundJob.findById(payload.refundJobId);
  }

  try {
    const order = await Order.findOne({ orderId });
    if (!order) {
      if (jobRecord) {
        jobRecord.status = 'FAILED';
        jobRecord.lastError = 'Order not found';
        await jobRecord.save();
      }
      throw new Error('Order not found');
    }

    if (order.refund && order.refund.status === 'COMPLETED' && order.refund.razorpayRefundId) {
      if (jobRecord) {
        jobRecord.status = 'COMPLETED';
        jobRecord.razorpayRefundId = order.refund.razorpayRefundId;
        await jobRecord.save();
      }
      return { skipped: true, reason: 'already-refunded' };
    }

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      if (jobRecord) {
        jobRecord.status = 'FAILED';
        jobRecord.lastError = 'Razorpay credentials missing';
        await jobRecord.save();
      }
      throw new Error('Razorpay credentials missing');
    }

    if (!order.razorpayPaymentId) {
      if (jobRecord) {
        jobRecord.status = 'FAILED';
        jobRecord.lastError = 'Missing razorpayPaymentId on order';
        await jobRecord.save();
      }
      throw new Error('Missing razorpayPaymentId on order');
    }

    const payloadAmount = Number(payload.amount || 0);
    const amount = Number.isFinite(payloadAmount) && payloadAmount > 0 ? payloadAmount : Number(order.refund?.amount || order.finalAmount || 0);
    const requestPayload = {
      amount: Math.max(1, Math.round(Number(amount || 0) * 100)),
      currency: payload.currency || 'INR',
      speed: 'normal',
      notes: { source: 'eshopper-refund-worker', orderId }
    };

    const resp = await axios.post(
      `https://api.razorpay.com/v1/payments/${order.razorpayPaymentId}/refund`,
      requestPayload,
      { auth: { username: RAZORPAY_KEY_ID, password: RAZORPAY_KEY_SECRET }, timeout: 30000 }
    );

    const refundData = resp.data || {};
    const refundId = refundData.id || refundData.refund_id || null;

    if (jobRecord) {
      jobRecord.status = 'COMPLETED';
      jobRecord.razorpayRefundId = refundId;
      jobRecord.lastError = null;
      await jobRecord.save();
    }

    order.refund = {
      ...(order.refund || {}),
      status: 'COMPLETED',
      amount,
      razorpayRefundId: refundId,
      processedAt: new Date()
    };
    order.paymentStatus = 'Refunded';
    try {
      order.statusHistory = Array.isArray(order.statusHistory) ? order.statusHistory : [];
      order.statusHistory.push({ status: 'Refunded', timestamp: new Date(), message: `Refund processed: ${refundId || ''}` });
    } catch (e) {}
    await order.save();

    try {
      const getApp = require('../server').getApp || (() => null);
      const app = getApp();
      if (app && typeof app.get === 'function') {
        const io = app.get('io');
        if (io) io.emit('orderRefundProcessed', { orderId, refundId, status: 'COMPLETED' });
      }
    } catch (e) {}

    return { success: true, refundId };
  } catch (err) {
    if (jobRecord) {
      jobRecord.status = 'FAILED';
      jobRecord.lastError = String(err?.message || err);
      await jobRecord.save();
    }
    throw err;
  }
}

let _workerInterval = null;

function startRefundWorker(intervalMs = POLL_INTERVAL_MS) {
  if (_workerInterval) return;
  _workerInterval = setInterval(() => {
    processOneJob().catch((e) => console.error('RefundWorker error:', e.message || e));
  }, intervalMs);
  console.log('Refund worker started, polling every', intervalMs, 'ms');
}

function stopRefundWorker() {
  if (_workerInterval) clearInterval(_workerInterval);
  _workerInterval = null;
}

module.exports = { startRefundWorker, stopRefundWorker, processOneJob, processRefundJobData };
