#!/usr/bin/env node
/**
 * Recalculate and overwrite users' `totalOrders` and `membershipType`
 * based on current Order and Checkout collections.
 *
 * Usage:
 *   node scripts/recalculate-user-stats.js        # dry-run (no writes)
 *   node scripts/recalculate-user-stats.js --apply
 *
 * Env:
 *   MONGODB_URI (fallback: mongodb://localhost:27017/eshopper)
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eshopper';
const args = new Set(process.argv.slice(2));
const isDryRun = !args.has('--apply');

const userSchema = new mongoose.Schema({}, { strict: false });
const orderSchema = new mongoose.Schema({}, { strict: false });
const checkoutSchema = new mongoose.Schema({}, { strict: false });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
const Checkout = mongoose.models.Checkout || mongoose.model('Checkout', checkoutSchema);

function calculateMembershipType(totalOrders = 0) {
  const orders = Number(totalOrders || 0);
  if (orders >= 10) return 'Elite';
  if (orders >= 5) return 'Gold';
  return 'Silver';
}

async function run() {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log(`Connected to ${MONGO_URI}`);

    const users = await User.find({}).select('_id name email totalOrders membershipType').lean();
    console.log(`Found ${users.length} users. Starting reconciliation (dry-run=${isDryRun})...`);

    let updated = 0;
    for (const u of users) {
      const userId = String(u._id);
      const actualOrders = await Order.countDocuments({ userid: userId });
      const checkoutOrders = await Checkout.countDocuments({ userid: userId });
      const desiredTotal = Number(actualOrders || 0) + Number(checkoutOrders || 0);
      const desiredMembership = calculateMembershipType(desiredTotal);

      const storedTotal = Number(u.totalOrders || 0);
      const storedMembership = String(u.membershipType || 'Silver');

      if (storedTotal !== desiredTotal || storedMembership !== desiredMembership) {
        updated++;
        console.log(`User ${userId} (${u.email || u.name || 'n/a'}): stored=${storedTotal}, desired=${desiredTotal}; membership stored=${storedMembership}, desired=${desiredMembership}`);
        if (!isDryRun) {
          await User.updateOne({ _id: u._id }, { $set: { totalOrders: desiredTotal, membershipType: desiredMembership } });
        }
      }
    }

    console.log(`Reconciliation complete. Users needing update: ${updated}`);
    if (isDryRun) console.log('Dry-run mode - no changes were written. Re-run with --apply to persist updates.');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err.message || err);
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(1);
  }
}

run();
