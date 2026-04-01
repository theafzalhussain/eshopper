#!/usr/bin/env node
/**
 * Manual Coupon Limits Update Script
 * Use this to quickly update specific coupons with custom limits
 * 
 * Usage:
 *   node update-coupon-limits.js COUPONCODE perUserOnce=true totalUsageCap=50 firstOrderOnly=false
 *   node update-coupon-limits.js --list (shows all coupons)
 *   node update-coupon-limits.js --remove-limits (resets all limits)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Coupon = require('./models/Coupon');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eshopper';
const args = process.argv.slice(2);

async function updateCouponLimits() {
    try {
        await mongoose.connect(MONGO_URI);

        // Show all coupons
        if (args[0] === '--list') {
            console.log('\n📋 ALL COUPONS:\n');
            const coupons = await Coupon.find({}).sort({ code: 1 });
            
            if (coupons.length === 0) {
                console.log('   No coupons found.');
            } else {
                coupons.forEach(c => {
                    console.log(`   Code: ${c.code}`);
                    console.log(`   Type: ${c.type}, Value: ${c.value}, Min: Rs${c.minCartValue}`);
                    console.log(`   Limits: perUserOnce=${c.perUserOnce}, cap=${c.totalUsageCap}, firstOrderOnly=${c.firstOrderOnly}`);
                    console.log('   ---');
                });
            }
            await mongoose.disconnect();
            return;
        }

        // Reset all limits
        if (args[0] === '--remove-limits') {
            const confirm = args[1] === '--confirm';
            if (!confirm) {
                console.log('\n⚠️  This will reset all coupon limits!');
                console.log('   Run: node update-coupon-limits.js --remove-limits --confirm\n');
                await mongoose.disconnect();
                return;
            }
            
            const result = await Coupon.updateMany({}, {
                perUserOnce: false,
                totalUsageCap: 0,
                firstOrderOnly: false
            });
            console.log(`✅ Reset ${result.modifiedCount} coupons\n`);
            await mongoose.disconnect();
            return;
        }

        // Update specific coupon
        if (!args[0]) {
            console.log('\nUsage:');
            console.log('  node update-coupon-limits.js CODE [field=value]');
            console.log('  node update-coupon-limits.js --list');
            console.log('  node update-coupon-limits.js --remove-limits --confirm\n');
            console.log('Examples:');
            console.log('  node update-coupon-limits.js LUXE15 perUserOnce=true totalUsageCap=100');
            console.log('  node update-coupon-limits.js WELCOME25 firstOrderOnly=true');
            console.log('  node update-coupon-limits.js SUMMER50 totalUsageCap=500\n');
            await mongoose.disconnect();
            return;
        }

        const code = String(args[0]).toUpperCase().trim();
        const coupon = await Coupon.findOne({ code });

        if (!coupon) {
            console.log(`\n❌ Coupon not found: ${code}\n`);
            await mongoose.disconnect();
            return;
        }

        // Parse update fields
        const updateData = {};
        for (let i = 1; i < args.length; i++) {
            const [key, val] = args[i].split('=');
            if (key === 'perUserOnce' || key === 'firstOrderOnly') {
                updateData[key] = val === 'true' || val === '1';
            } else if (key === 'totalUsageCap') {
                updateData[key] = Math.max(0, parseInt(val, 10) || 0);
            }
        }

        if (Object.keys(updateData).length === 0) {
            console.log(`\n⚠️  No valid fields provided to update.\n`);
            await mongoose.disconnect();
            return;
        }

        console.log(`\n✏️  Updating coupon: ${code}`);
        console.log(`   Before: perUserOnce=${coupon.perUserOnce}, cap=${coupon.totalUsageCap}, firstOrderOnly=${coupon.firstOrderOnly}`);

        await Coupon.findByIdAndUpdate(coupon._id, updateData);

        const updated = await Coupon.findById(coupon._id);
        console.log(`   After:  perUserOnce=${updated.perUserOnce}, cap=${updated.totalUsageCap}, firstOrderOnly=${updated.firstOrderOnly}\n`);
        console.log('✅ Updated!\n');

        await mongoose.disconnect();

    } catch (error) {
        console.error('❌ Error:', error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
}

updateCouponLimits();
