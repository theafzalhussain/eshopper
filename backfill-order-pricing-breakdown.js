#!/usr/bin/env node
/**
 * One-time pricing breakdown backfill for legacy Order/Checkout documents.
 *
 * Usage:
 *   node backfill-order-pricing-breakdown.js --dry-run
 *   node backfill-order-pricing-breakdown.js --apply
 *
 * Env:
 *   MONGODB_URI (fallback: mongodb://localhost:27017/eshopper)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./models/Order');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eshopper';
const args = new Set(process.argv.slice(2));
const isDryRun = args.has('--dry-run') || !args.has('--apply');

const checkoutSchema = new mongoose.Schema(
  {
    userid: String,
    orderId: String,
    totalAmount: Number,
    shippingAmount: Number,
    finalAmount: Number,
    couponCode: { type: String, default: '' },
    couponDiscount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    giftWrapCharge: { type: Number, default: 0 },
    protectionCharge: { type: Number, default: 0 },
    ecoCharge: { type: Number, default: 0 },
    paymentFee: { type: Number, default: 0 },
    extraCharges: { type: Number, default: 0 },
    preDiscountTotal: { type: Number, default: 0 },
    products: Array
  },
  { timestamps: true }
);

const Checkout = mongoose.models.Checkout || mongoose.model('Checkout', checkoutSchema);

function toSafeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function sumProducts(products) {
  const list = Array.isArray(products) ? products : [];
  return list.reduce((sum, item) => {
    const qty = toSafeNumber(item?.qty ?? item?.quantity ?? item?.count, 1);
    const price = toSafeNumber(item?.price ?? item?.finalprice ?? item?.salePrice, 0);
    const lineTotalRaw = Number(item?.total ?? item?.lineTotal ?? item?.totalPrice);
    const lineTotal = Number.isFinite(lineTotalRaw) ? lineTotalRaw : qty * price;
    return sum + Math.max(0, lineTotal);
  }, 0);
}

function normalizeBreakdown(doc) {
  const subtotal = Math.max(0, toSafeNumber(doc.totalAmount, sumProducts(doc.products)));
  const shipping = Math.max(0, toSafeNumber(doc.shippingAmount, 0));
  const couponDiscount = Math.max(0, toSafeNumber(doc.couponDiscount, 0));
  let discountAmount = Math.max(0, toSafeNumber(doc.discountAmount, 0));

  const hasStoredGst = Number.isFinite(Number(doc.gstAmount));
  const hasStoredExtra = Number.isFinite(Number(doc.extraCharges));

  let gstAmount = Math.max(0, toSafeNumber(doc.gstAmount, 0));
  let extraCharges = Math.max(0, toSafeNumber(doc.extraCharges, 0));

  const finalFromDoc = Number(doc.finalAmount);
  const hasFinal = Number.isFinite(finalFromDoc);
  const expectedGst = Math.max(0, Math.round(subtotal * 0.05));

  if (hasFinal) {
    const residual = finalFromDoc - (subtotal + shipping - couponDiscount - discountAmount);

    if (!hasStoredGst || !hasStoredExtra) {
      if (residual >= 0) {
        if (!hasStoredGst) gstAmount = Math.min(expectedGst, residual);
        if (!hasStoredExtra) extraCharges = Math.max(0, residual - gstAmount);
      } else if (!Number.isFinite(Number(doc.discountAmount))) {
        discountAmount += Math.abs(residual);
      }
    }
  }

  const giftWrapCharge = Math.max(0, toSafeNumber(doc.giftWrapCharge, 0));
  const protectionCharge = Math.max(0, toSafeNumber(doc.protectionCharge, 0));
  const ecoCharge = Math.max(0, toSafeNumber(doc.ecoCharge, 0));
  const paymentFee = Math.max(0, toSafeNumber(doc.paymentFee, 0));

  // If segmented charges exist, trust them and keep aggregate synced.
  const segmentedTotal = giftWrapCharge + protectionCharge + ecoCharge + paymentFee;
  if (segmentedTotal > 0) {
    extraCharges = segmentedTotal;
  }

  const preDiscountTotal = Math.max(0, subtotal + shipping + gstAmount + extraCharges);
  const finalAmount = hasFinal
    ? Math.max(0, finalFromDoc)
    : Math.max(0, preDiscountTotal - couponDiscount - discountAmount);

  return {
    totalAmount: subtotal,
    shippingAmount: shipping,
    finalAmount,
    couponCode: String(doc.couponCode || '').trim().toUpperCase(),
    couponDiscount,
    discountAmount,
    gstAmount,
    giftWrapCharge,
    protectionCharge,
    ecoCharge,
    paymentFee,
    extraCharges,
    preDiscountTotal
  };
}

function hasDiff(doc, next) {
  return (
    toSafeNumber(doc.totalAmount, -1) !== toSafeNumber(next.totalAmount, -1) ||
    toSafeNumber(doc.shippingAmount, -1) !== toSafeNumber(next.shippingAmount, -1) ||
    toSafeNumber(doc.finalAmount, -1) !== toSafeNumber(next.finalAmount, -1) ||
    String(doc.couponCode || '') !== String(next.couponCode || '') ||
    toSafeNumber(doc.couponDiscount, -1) !== toSafeNumber(next.couponDiscount, -1) ||
    toSafeNumber(doc.discountAmount, -1) !== toSafeNumber(next.discountAmount, -1) ||
    toSafeNumber(doc.gstAmount, -1) !== toSafeNumber(next.gstAmount, -1) ||
    toSafeNumber(doc.giftWrapCharge, -1) !== toSafeNumber(next.giftWrapCharge, -1) ||
    toSafeNumber(doc.protectionCharge, -1) !== toSafeNumber(next.protectionCharge, -1) ||
    toSafeNumber(doc.ecoCharge, -1) !== toSafeNumber(next.ecoCharge, -1) ||
    toSafeNumber(doc.paymentFee, -1) !== toSafeNumber(next.paymentFee, -1) ||
    toSafeNumber(doc.extraCharges, -1) !== toSafeNumber(next.extraCharges, -1) ||
    toSafeNumber(doc.preDiscountTotal, -1) !== toSafeNumber(next.preDiscountTotal, -1)
  );
}

async function patchCollection({ model, label }) {
  const docs = await model.find({}).lean();
  let changedDocs = 0;

  for (const doc of docs) {
    const next = normalizeBreakdown(doc);
    if (!hasDiff(doc, next)) continue;

    changedDocs += 1;
    if (!isDryRun) {
      await model.updateOne({ _id: doc._id }, { $set: next });
    }
  }

  return {
    label,
    scanned: docs.length,
    changedDocs
  };
}

async function run() {
  try {
    await mongoose.connect(MONGO_URI);

    console.log('\n=== Order Pricing Breakdown Backfill ===');
    console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'APPLY'}`);
    console.log(`Database: ${MONGO_URI}\n`);

    const orderResult = await patchCollection({ model: Order, label: 'Order' });
    const checkoutResult = await patchCollection({ model: Checkout, label: 'Checkout' });

    [orderResult, checkoutResult].forEach((result) => {
      console.log(`${result.label} collection:`);
      console.log(`  Scanned docs : ${result.scanned}`);
      console.log(`  Changed docs : ${result.changedDocs}`);
      console.log('');
    });

    if (isDryRun) {
      console.log('Dry run complete. Use --apply to persist changes.\n');
    } else {
      console.log('Backfill applied successfully.\n');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Backfill failed:', error.message);
    try {
      await mongoose.disconnect();
    } catch (_) {
      // no-op
    }
    process.exit(1);
  }
}

run();
