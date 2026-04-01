#!/usr/bin/env node
/**
 * Quick Reference & Management Guide for Coupon Limits
 * This file documents all seed/update scripts and their usage
 */

console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                   COUPON LIMITS SEED/UPDATE SCRIPTS                        ║
╚════════════════════════════════════════════════════════════════════════════╝

📚 THREE WAYS TO MANAGE COUPON LIMITS:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣  AUTOMATIC SEED (Recommended for First Time)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Script: seed-coupon-limits.js

What it does:
  ✅ Auto-detects coupon type and value
  ✅ Applies sensible defaults to existing coupons
  ✅ Skips coupons that already have limits
  ✅ Reports what was updated

Usage:
  $ node seed-coupon-limits.js

Rules Applied:
  • HIGH-VALUE coupons (Rs200+ or 20%+):
    → perUserOnce = true
    → totalUsageCap = 50

  • PREMIUM coupons (min cart > Rs2000):
    → perUserOnce = true
    → totalUsageCap = 100

  • STANDARD coupons:
    → totalUsageCap = 200 (no per-user limit)

Example Output:
  💎 HIGH-VALUE COUPON: LUXE15
  → Set perUserOnce=true, totalUsageCap=50
  
  ✅ SUMMARY:
  Updated: 2
  Skipped: 1
  Total:   3


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2️⃣  MANUAL UPDATES (For Specific Coupons)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Script: update-coupon-limits.js

List all coupons:
  $ node update-coupon-limits.js --list

  Output:
    Code: ESHOPPER10
    Type: flat, Value: 100, Min: Rs1000
    Limits: perUserOnce=true, cap=50, firstOrderOnly=false
    ---


Update a specific coupon:
  $ node update-coupon-limits.js COUPONCODE [field=value ...]

  Examples:
    $ node update-coupon-limits.js LUXE15 perUserOnce=true totalUsageCap=100
    $ node update-coupon-limits.js WELCOME25 firstOrderOnly=true
    $ node update-coupon-limits.js SUMMER50 totalUsageCap=500
    $ node update-coupon-limits.js FLAT100 perUserOnce=false totalUsageCap=0

  Output:
    ✏️  Updating coupon: LUXE15
    Before: perUserOnce=false, cap=0, firstOrderOnly=false
    After:  perUserOnce=true, cap=100, firstOrderOnly=false
    ✅ Updated!


Reset ALL limits (dangerous!):
  $ node update-coupon-limits.js --remove-limits --confirm


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3️⃣  ADMIN PANEL (Manual + Visual)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Open: http://localhost:3000/admin-coupon

Then:
  1. Scroll to "All Coupons" section
  2. Click "Edit" (pencil icon) OR create new coupon
  3. Set checkboxes and numbers:
     ☐ Per-user once
     ☐ First-order only
     [Total Usage Cap: 0]
  4. Click "Save"
  5. Limits show as badges in table


╔════════════════════════════════════════════════════════════════════════════╗
║                              QUICK START                                   ║
╚════════════════════════════════════════════════════════════════════════════╝

STEP 1: Run auto-seed (first time only)
  $ node seed-coupon-limits.js

STEP 2: Check what was updated
  $ node update-coupon-limits.js --list

STEP 3: Customize specific coupons if needed
  $ node update-coupon-limits.js LUXE15 totalUsageCap=75
  $ node update-coupon-limits.js WELCOME25 perUserOnce=true firstOrderOnly=true

STEP 4: Verify in admin panel
  Open: http://localhost:3000/admin-coupon


╔════════════════════════════════════════════════════════════════════════════╗
║                         FIELD DEFINITIONS                                  ║
╚════════════════════════════════════════════════════════════════════════════╝

perUserOnce (Boolean):
  • true  = Each user can use this coupon ONLY ONCE ever
  • false = Each user can use this coupon multiple times (if other limits allow)

totalUsageCap (Number):
  • 0   = No global limit (infinite uses across all users)
  • 50  = Max 50 users total can use this coupon
  • 100 = Max 100 users total can use this coupon
  • etc

firstOrderOnly (Boolean):
  • true  = Only users placing their FIRST order can use this
  • false = Any user can use this (new or existing)

Examples:
  Welcome Discount (new customers only):
    perUserOnce=true, totalUsageCap=200, firstOrderOnly=true
  
  Premium Flash Sale (limited uses):
    perUserOnce=true, totalUsageCap=50, firstOrderOnly=false
  
  Loyalty Program (reusable for members):
    perUserOnce=false, totalUsageCap=0, firstOrderOnly=false


╔════════════════════════════════════════════════════════════════════════════╗
║                         TROUBLESHOOTING                                    ║
╚════════════════════════════════════════════════════════════════════════════╝

❌ "Cannot find module 'models/Coupon'"
   → Make sure you're in the project root directory

❌ "MongoDB connection failed"
   → Check MONGODB_URI env variable or set .env file
   → Make sure MongoDB is running

❌ "Coupon not found: SOMECODE"
   → Check coupon code is correct (case-insensitive but stored as uppercase)
   → Run: node update-coupon-limits.js --list

❌ Script doesn't update existing coupons in seed-coupon-limits.js
   → It skips coupons that already have limits to avoid overwriting
   → Use update-coupon-limits.js for manual updates

✅ Need help?
   → Check admin panel: http://localhost:3000/admin-coupon
   → All scripts are idempotent (safe to run multiple times)


═══════════════════════════════════════════════════════════════════════════════
`);
