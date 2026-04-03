#!/usr/bin/env node
/**
 * One-time quantity normalization migration for legacy orders.
 *
 * Usage:
 *   node fix-order-quantities.js --dry-run
 *   node fix-order-quantities.js --apply
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
    products: Array,
    totalAmount: Number,
    shippingAmount: Number,
    finalAmount: Number
  },
  { timestamps: true }
);

const Checkout = mongoose.models.Checkout || mongoose.model('Checkout', checkoutSchema);

function toSafeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeQty(item = {}) {
  const directQty = toSafeNumber(
    item?.qty ??
      item?.quantity ??
      item?.count ??
      item?.orderedQty ??
      item?.quantityOrdered ??
      item?.cartQuantity ??
      item?.productQty ??
      item?.productid?.qty ??
      item?.productid?.quantity,
    0
  );

  if (directQty > 0) return directQty;

  const price = toSafeNumber(item?.price ?? item?.finalprice ?? item?.salePrice ?? item?.productid?.finalprice, 0);
  const total = toSafeNumber(item?.total ?? item?.lineTotal ?? item?.totalPrice, 0);

  if (price > 0 && total > 0) {
    const inferred = total / price;
    if (Number.isFinite(inferred) && inferred > 0) {
      return Number.isInteger(inferred) ? inferred : Math.max(1, Math.round(inferred));
    }
  }

  return 1;
}

function normalizeProducts(products = []) {
  const list = Array.isArray(products) ? products : [];

  let changed = false;
  const normalized = list.map((entry) => {
    const qty = normalizeQty(entry);
    const price = toSafeNumber(entry?.price ?? entry?.finalprice ?? entry?.salePrice, 0);
    const total = toSafeNumber(entry?.total ?? entry?.lineTotal ?? entry?.totalPrice, qty * price);

    const next = {
      ...entry,
      qty,
      quantity: qty,
      price,
      total
    };

    const hasDiff =
      toSafeNumber(entry?.qty, -1) !== qty ||
      toSafeNumber(entry?.quantity, -1) !== qty ||
      toSafeNumber(entry?.price, -1) !== price ||
      toSafeNumber(entry?.total, -1) !== total;

    if (hasDiff) changed = true;
    return next;
  });

  return { normalized, changed, itemCount: normalized.length };
}

async function patchCollection({ model, label }) {
  const docs = await model.find({ products: { $exists: true, $ne: [] } }).lean();
  let changedDocs = 0;
  let changedItems = 0;

  for (const doc of docs) {
    const { normalized, changed } = normalizeProducts(doc.products);
    if (!changed) continue;

    changedDocs += 1;
    changedItems += normalized.length;

    if (!isDryRun) {
      await model.updateOne({ _id: doc._id }, { $set: { products: normalized } });
    }
  }

  return {
    label,
    scanned: docs.length,
    changedDocs,
    changedItems
  };
}

async function run() {
  try {
    await mongoose.connect(MONGO_URI);

    console.log('\n=== Quantity Normalization Migration ===');
    console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'APPLY'}`);
    console.log(`Database: ${MONGO_URI}\n`);

    const orderResult = await patchCollection({ model: Order, label: 'Order' });
    const checkoutResult = await patchCollection({ model: Checkout, label: 'Checkout' });

    [orderResult, checkoutResult].forEach((result) => {
      console.log(`${result.label} collection:`);
      console.log(`  Scanned docs   : ${result.scanned}`);
      console.log(`  Changed docs   : ${result.changedDocs}`);
      console.log(`  Affected items : ${result.changedItems}`);
      console.log('');
    });

    if (isDryRun) {
      console.log('Dry run complete. Use --apply to persist changes.\n');
    } else {
      console.log('Migration applied successfully.\n');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      // no-op
    }
    process.exit(1);
  }
}

run();
