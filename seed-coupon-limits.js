#!/usr/bin/env node
/**
 * Coupon Limits Seed Script
 * Run this script ONCE to add default usage limits to existing coupons
 * Usage: node seed-coupon-limits.js
 * 
 * Behavior:
 * - Only updates coupons that DO NOT already have limits set
 * - Leaves perUserOnce, totalUsageCap, firstOrderOnly AS-IS if already present
 * - Adds sensible defaults for each coupon type
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Coupon = require('./models/Coupon');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eshopper';

async function seedCouponLimits() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Fetch all existing coupons
        const coupons = await Coupon.find({});
        
        if (coupons.length === 0) {
            console.log('⚠️  No coupons found in database.');
            console.log('   Run the app once to seed default coupons, then run this script again.');
            await mongoose.disconnect();
            return;
        }

        console.log(`📋 Found ${coupons.length} coupon(s) to update...\n`);

        let updated = 0;
        let skipped = 0;

        for (const coupon of coupons) {
            // Check if coupon already has limits configured
            const hasLimitsConfigured = 
                coupon.perUserOnce || 
                coupon.totalUsageCap || 
                coupon.firstOrderOnly;

            if (hasLimitsConfigured) {
                console.log(`⏭️  SKIPPED: ${coupon.code} (already has limits)`);
                console.log(`   perUserOnce: ${coupon.perUserOnce}, totalUsageCap: ${coupon.totalUsageCap}, firstOrderOnly: ${coupon.firstOrderOnly}\n`);
                skipped++;
                continue;
            }

            // Assign sensible defaults based on coupon characteristics
            let updateData = {
                perUserOnce: false,
                totalUsageCap: 0,
                firstOrderOnly: false
            };

            // DEFAULT RULES:
            // 1. If value > 200 (high discount), limit per-user usage + set cap
            if ((coupon.type === 'flat' && coupon.value > 200) || (coupon.type === 'percent' && coupon.value > 20)) {
                updateData.perUserOnce = true;
                updateData.totalUsageCap = 50;
                console.log(`💎 HIGH-VALUE COUPON: ${coupon.code}`);
                console.log(`   → Set perUserOnce=true, totalUsageCap=50\n`);
            }
            // 2. If minCartValue is high, it's probably premium → limit usage
            else if (coupon.minCartValue > 2000) {
                updateData.perUserOnce = true;
                updateData.totalUsageCap = 100;
                console.log(`👑 PREMIUM COUPON: ${coupon.code}`);
                console.log(`   → Set perUserOnce=true, totalUsageCap=100\n`);
            }
            // 3. Otherwise, moderate limits
            else {
                updateData.totalUsageCap = 200;
                console.log(`📌 STANDARD COUPON: ${coupon.code}`);
                console.log(`   → Set totalUsageCap=200 (no per-user limit)\n`);
            }

            // Update the coupon
            await Coupon.findByIdAndUpdate(coupon._id, updateData);
            updated++;
        }

        console.log('\n' + '='.repeat(60));
        console.log(`✅ SUMMARY:`);
        console.log(`   Updated: ${updated}`);
        console.log(`   Skipped: ${skipped}`);
        console.log(`   Total:   ${coupons.length}`);
        console.log('='.repeat(60) + '\n');

        if (updated > 0) {
            console.log('📝 Coupon limits have been applied successfully!');
            console.log('   Check admin panel to verify or customize further.\n');
        }

        await mongoose.disconnect();
        console.log('✅ Done!\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
}

// Run the script
seedCouponLimits();
