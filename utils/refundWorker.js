const axios = require('axios');
const crypto = require('crypto');
const RefundJob = require('../models/RefundJob');
const Order = require('../models/Order');
const realtimeBus = require('./realtimeBus');

const RAZORPAY_KEY_ID = String(process.env.RAZORPAY_KEY_ID || '').trim();
const RAZORPAY_KEY_SECRET = String(process.env.RAZORPAY_KEY_SECRET || '').trim();

const MAX_ATTEMPTS = 5;
const POLL_INTERVAL_MS = Math.max(5000, Number(process.env.REFUND_WORKER_INTERVAL_MS || 10000));
const RAZORPAY_TIMEOUT_MS = 20000;

const razorpayAuth = { username: RAZORPAY_KEY_ID, password: RAZORPAY_KEY_SECRET };

/* Deterministic per order, so every retry of the same refund presents the same
   key to Razorpay and cannot produce a second refund. RefundJob has carried an
   `idempotencyKey` field all along; nothing ever populated it. */
const buildIdempotencyKey = (orderId, amount) => {
    const digest = crypto
        .createHash('sha256')
        .update(`${orderId}|${Math.round(Number(amount || 0) * 100)}`)
        .digest('hex');
    /* Razorpay accepts 4-36 chars of alphanumerics, hyphens and underscores. */
    return `rf_${digest.slice(0, 30)}`;
};

/* Errors that will never succeed on a retry. Anything else — a timeout, a 5xx, a
   dropped connection — is transient and must be retried, which is exactly what
   the old code got wrong: every error path set FAILED, and the claim query only
   ever looked at PENDING, so MAX_ATTEMPTS was unreachable and a single network
   blip stranded the refund permanently. */
const isPermanentFailure = (err) => {
    const status = Number(err?.response?.status || 0);
    return status === 400 || status === 401 || status === 403 || status === 404;
};

/* Ask Razorpay whether this payment already has our refund. This is the real
   protection against a double refund — the idempotency header only covers
   requests that reach Razorpay, not a job already processed by another worker.
   Refunds are rare, so the extra round-trip costs nothing that matters. */
const findExistingRefund = async (paymentId, orderId) => {
    try {
        const resp = await axios.get(
            `https://api.razorpay.com/v1/payments/${paymentId}/refunds`,
            { auth: razorpayAuth, timeout: RAZORPAY_TIMEOUT_MS }
        );
        const items = (resp.data && resp.data.items) || [];
        return items.find((r) => String(r?.notes?.orderId || '') === String(orderId)) || null;
    } catch (err) {
        /* If we cannot check, do not guess — proceed and rely on the header. */
        return null;
    }
};

const applyRefundToOrder = async (order, { amount, refundId }) => {
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
    } catch (e) { /* history is best-effort */ }
    await order.save();

    /* Scoped to the customer and the admin dashboard rather than broadcast to
       every connected socket — a refund id is nobody else's business. */
    const payload = { orderId: order.orderId, refundId, status: 'COMPLETED' };
    realtimeBus.emit('orderRefundProcessed', payload, `user:${order.userid}`);
    realtimeBus.emit('orderRefundProcessed', payload, 'admin:dashboard');
};

async function processOneJob() {
  const job = await RefundJob.findOneAndUpdate(
    { status: 'PENDING', attempts: { $lt: MAX_ATTEMPTS } },
    { $inc: { attempts: 1 }, $set: { status: 'PROCESSING' } },
    { new: true }
  );
  if (!job) return null;

  /* Give up permanently, or hand the job back for another attempt. */
  const fail = async (message, permanent = false) => {
    job.status = (permanent || job.attempts >= MAX_ATTEMPTS) ? 'FAILED' : 'PENDING';
    job.lastError = message;
    await job.save();
    if (job.status === 'PENDING') {
      console.warn(`↻ Refund ${job.orderId} attempt ${job.attempts}/${MAX_ATTEMPTS} failed, will retry: ${message}`);
    } else {
      console.error(`✖ Refund ${job.orderId} permanently failed after ${job.attempts} attempt(s): ${message}`);
    }
    return job;
  };

  try {
    // Double-check order hasn't already been refunded
    const order = await Order.findOne({ orderId: job.orderId });
    if (!order) return fail('Order not found', true);

    if (order.refund && order.refund.status === 'COMPLETED' && order.refund.razorpayRefundId) {
      job.status = 'COMPLETED';
      job.razorpayRefundId = order.refund.razorpayRefundId;
      await job.save();
      return job;
    }

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) return fail('Razorpay credentials missing', true);
    if (!order.razorpayPaymentId) return fail('Missing razorpayPaymentId on order', true);

    const amount = Number(job.amount || 0);
    const idempotencyKey = job.idempotencyKey || buildIdempotencyKey(job.orderId, amount);
    if (!job.idempotencyKey) {
      job.idempotencyKey = idempotencyKey;
      await job.save();
    }

    /* Already refunded on Razorpay's side? Adopt it instead of issuing a second. */
    const existing = await findExistingRefund(order.razorpayPaymentId, job.orderId);
    if (existing) {
      console.log(`♻️  Refund already exists at Razorpay for ${job.orderId} (${existing.id}) — adopting it`);
      job.status = 'COMPLETED';
      job.razorpayRefundId = existing.id;
      job.lastError = null;
      await job.save();
      await applyRefundToOrder(order, { amount, refundId: existing.id });
      return job;
    }

    // Call Razorpay refund API
    const payload = {
      amount: Math.max(1, Math.round(amount * 100)),
      currency: job.currency || 'INR',
      speed: 'normal',
      notes: { source: 'eshopper-refund-worker', orderId: job.orderId }
    };

    const resp = await axios.post(
      `https://api.razorpay.com/v1/payments/${order.razorpayPaymentId}/refund`,
      payload,
      {
        auth: razorpayAuth,
        timeout: RAZORPAY_TIMEOUT_MS,
        headers: { 'X-Refund-Idempotency': idempotencyKey }
      }
    );

    const refundData = resp.data || {};
    job.status = 'COMPLETED';
    job.razorpayRefundId = refundData.id || refundData.refund_id || null;
    job.lastError = null;
    await job.save();

    await applyRefundToOrder(order, { amount, refundId: job.razorpayRefundId });

    return job;
  } catch (err) {
    return fail(String(err?.response?.data?.error?.description || err?.message || err), isPermanentFailure(err));
  }
}

async function processRefundJobData(payload = {}) {
  const orderId = String(payload.orderId || '').trim();
  if (!orderId) throw new Error('Missing orderId for refund job');

  /* Claim the job atomically. This function had no claim at all — unlike
     processOneJob — so with two consumers on the same queue (server.js registers
     the processors AND worker.js registers them again) the same payload could be
     handled twice concurrently and issue two Razorpay refunds for one order. */
  let jobRecord = null;
  if (payload.refundJobId) {
    jobRecord = await RefundJob.findOneAndUpdate(
      { _id: payload.refundJobId, status: { $in: ['PENDING', 'FAILED'] } },
      { $inc: { attempts: 1 }, $set: { status: 'PROCESSING' } },
      { new: true }
    );

    if (!jobRecord) {
      const current = await RefundJob.findById(payload.refundJobId).lean();
      if (current && (current.status === 'PROCESSING' || current.status === 'COMPLETED')) {
        return { skipped: true, reason: `already-${current.status.toLowerCase()}` };
      }
    }
  }

  const markJob = async (status, error = null, refundId = undefined) => {
    if (!jobRecord) return;
    jobRecord.status = status;
    jobRecord.lastError = error;
    if (refundId !== undefined) jobRecord.razorpayRefundId = refundId;
    await jobRecord.save();
  };

  try {
    const order = await Order.findOne({ orderId });
    if (!order) {
      await markJob('FAILED', 'Order not found');
      throw new Error('Order not found');
    }

    if (order.refund && order.refund.status === 'COMPLETED' && order.refund.razorpayRefundId) {
      await markJob('COMPLETED', null, order.refund.razorpayRefundId);
      return { skipped: true, reason: 'already-refunded' };
    }

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      await markJob('FAILED', 'Razorpay credentials missing');
      throw new Error('Razorpay credentials missing');
    }

    if (!order.razorpayPaymentId) {
      await markJob('FAILED', 'Missing razorpayPaymentId on order');
      throw new Error('Missing razorpayPaymentId on order');
    }

    const payloadAmount = Number(payload.amount || 0);
    const amount = Number.isFinite(payloadAmount) && payloadAmount > 0 ? payloadAmount : Number(order.refund?.amount || order.finalAmount || 0);
    const idempotencyKey = (jobRecord && jobRecord.idempotencyKey) || buildIdempotencyKey(orderId, amount);
    if (jobRecord && !jobRecord.idempotencyKey) {
      jobRecord.idempotencyKey = idempotencyKey;
      await jobRecord.save();
    }

    const existing = await findExistingRefund(order.razorpayPaymentId, orderId);
    if (existing) {
      console.log(`♻️  Refund already exists at Razorpay for ${orderId} (${existing.id}) — adopting it`);
      await markJob('COMPLETED', null, existing.id);
      await applyRefundToOrder(order, { amount, refundId: existing.id });
      return { success: true, refundId: existing.id, adopted: true };
    }

    const requestPayload = {
      amount: Math.max(1, Math.round(Number(amount || 0) * 100)),
      currency: payload.currency || 'INR',
      speed: 'normal',
      notes: { source: 'eshopper-refund-worker', orderId }
    };

    const resp = await axios.post(
      `https://api.razorpay.com/v1/payments/${order.razorpayPaymentId}/refund`,
      requestPayload,
      {
        auth: razorpayAuth,
        timeout: RAZORPAY_TIMEOUT_MS,
        headers: { 'X-Refund-Idempotency': idempotencyKey }
      }
    );

    const refundData = resp.data || {};
    const refundId = refundData.id || refundData.refund_id || null;

    await markJob('COMPLETED', null, refundId);
    await applyRefundToOrder(order, { amount, refundId });

    return { success: true, refundId };
  } catch (err) {
    /* Hand the job back to PENDING while attempts remain so BullMQ's retry (or
       the polling worker) can pick it up again. Only a genuinely hopeless error
       is parked as FAILED. */
    if (jobRecord && jobRecord.status === 'PROCESSING') {
      const permanent = isPermanentFailure(err) || Number(jobRecord.attempts || 0) >= MAX_ATTEMPTS;
      await markJob(permanent ? 'FAILED' : 'PENDING', String(err?.response?.data?.error?.description || err?.message || err));
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
