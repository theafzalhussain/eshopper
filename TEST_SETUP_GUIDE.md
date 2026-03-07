# 🧪 Omni-Flow Test Setup Guide

## Quick Setup (Before Running Tests)

### 1. **Create Test Environment File**
Create a file `.env.test` in the root directory:

```bash
# Server Configuration
BASE_URL=http://localhost:8000

# Test User (use an existing user from your database)
TEST_USER_ID=your-mongodb-user-id-here
TEST_USER_EMAIL=test@example.com
TEST_USER_NAME=Test User

# Admin Secret (from your .env file)
ADMIN_SECRET=your-admin-secret-here

# Feature Flags (ensure these are enabled)
FEATURE_EMAIL_NOTIFICATIONS=true
FEATURE_INVOICE_SYSTEM=true
FEATURE_WHATSAPP_NOTIFICATIONS=false
```

### 2. **Get Real User ID**
Open MongoDB Compass or run in terminal:
```javascript
// In MongoDB shell or Compass
use eshopperdb
db.users.findOne({ email: "your-email@example.com" })
// Copy the _id value
```

Or use existing test account if you have one.

### 3. **Verify Server is Running**
```bash
# Start the server if not already running
npm start
# or
node server.js
```

Check: http://localhost:8000/api/health (should respond with 200 OK)

---

## Running the Automated Tests

### **Option 1: Full Automated Test Suite**

```bash
# Load test environment
$env:BASE_URL="http://localhost:8000"
$env:TEST_USER_ID="your-user-id-here"
$env:TEST_USER_EMAIL="test@example.com"
$env:TEST_USER_NAME="Test User"
$env:ADMIN_SECRET="your-admin-secret"

# Run complete test matrix
node test-omni-flow.js
```

This will:
- Create a test order
- Confirm it via admin API
- Update status through all stages
- Test all 4 email triggers
- Test dynamic invoice downloads
- Generate detailed log file (`test-results.log`)

**Expected Output:**
```
🚀 ================================================================================
🎯 OMNI-FLOW EMAIL & INVOICE SYSTEM - COMPLETE TEST MATRIX
...
✅ Passed Tests: 5
  ✓ Test 1: Order Placed Trigger
  ✓ Test 2: Admin Confirm Trigger
  ✓ Test 3: Status Updates (Packed/Shipped/OFD)
  ✓ Test 4: Delivered Trigger (Final Invoice)
  ✓ Test 5: Dynamic Invoice Download
🎉 ALL TESTS PASSED! System is production-ready! 🚀
```

---

## Manual Testing (Step-by-Step)

If automated tests fail or you want manual verification:

### **Test 1: Order Placed (Receipt)**

```bash
# 1. Place order
curl -X POST http://localhost:8000/api/place-order `
  -H "Content-Type: application/json" `
  -d '{
    "userId": "YOUR_USER_ID",
    "paymentMethod": "COD",
    "totalAmount": 2500,
    "shippingAmount": 150,
    "finalAmount": 2650,
    "products": [{
      "name": "Test Product",
      "qty": 1,
      "price": 2500,
      "total": 2500,
      "pic": "https://via.placeholder.com/150"
    }]
  }'

# Expected server logs:
# ✅ Order placed successfully: ESHP-2026-XXXX
# 📧 Order Placed email sent for ESHP-2026-XXXX
# 📄 OrderReceipt-ESHP-2026-XXXX.pdf attached
```

### **Test 2: Admin Confirm (Proforma)**

```bash
# 2. Confirm order (use orderId from step 1)
curl -X POST http://localhost:8000/api/admin/confirm-order `
  -H "Content-Type: application/json" `
  -H "x-admin-secret: YOUR_ADMIN_SECRET" `
  -d '{
    "orderId": "ESHP-2026-XXXX",
    "estimatedArrival": "2026-03-14T00:00:00.000Z"
  }'

# Expected server logs:
# ✅ Order confirmed successfully
# 📧 Confirmation email queued
# 📄 Confirmation-ESHP-2026-XXXX.pdf attached
```

### **Test 3: Status Updates (No PDF)**

```bash
# 3a. Update to Packed
curl -X POST http://localhost:8000/api/update-order-status `
  -H "Content-Type: application/json" `
  -d '{
    "orderId": "ESHP-2026-XXXX",
    "status": "Packed"
  }'

# 3b. Update to Shipped
curl -X POST http://localhost:8000/api/update-order-status `
  -H "Content-Type: application/json" `
  -d '{
    "orderId": "ESHP-2026-XXXX",
    "status": "Shipped"
  }'

# 3c. Update to Out for Delivery
curl -X POST http://localhost:8000/api/update-order-status `
  -H "Content-Type: application/json" `
  -d '{
    "orderId": "ESHP-2026-XXXX",
    "status": "Out for Delivery"
  }'

# Expected server logs (for each):
# ✅ Status updated to [Packed/Shipped/Out for Delivery]
# 📧 Status email queued
# ⚠️ NO PDF attachment (this is correct!)
```

### **Test 4: Delivered (Final Invoice)**

```bash
# 4. Mark as Delivered
curl -X POST http://localhost:8000/api/update-order-status `
  -H "Content-Type: application/json" `
  -d '{
    "orderId": "ESHP-2026-XXXX",
    "status": "Delivered"
  }'

# Expected server logs:
# ✅ Status updated to Delivered
# 📧 Delivered email queued
# 📄 FinalTaxInvoice-ESHP-2026-XXXX.pdf attached
```

### **Test 5: Dynamic Invoice Download**

```bash
# 5. Download invoice (status-based)
curl -X GET "http://localhost:8000/api/orders/ESHP-2026-XXXX/download-invoice?userId=YOUR_USER_ID" `
  -H "Accept: application/pdf" `
  --output test-invoice.pdf

# Expected:
# - Filename based on current status:
#   - Ordered → Receipt-ESHP-2026-XXXX.pdf
#   - Confirmed → Confirmation-ESHP-2026-XXXX.pdf
#   - Delivered → TaxInvoice-ESHP-2026-XXXX.pdf
```

---

## What to Check in Server Logs

### ✅ **Success Indicators:**

1. **Order Placed:**
   ```
   📧 Order Placed email sent for ESHP-2026-XXXX → user@example.com
   📄 Attachment: OrderReceipt-ESHP-2026-XXXX.pdf (XXXXX bytes)
   ```

2. **Order Confirmed:**
   ```
   ✅ Email queued for ESHP-2026-XXXX (Confirmed)
   📄 Confirmation-ESHP-2026-XXXX.pdf attached
   ```

3. **Status Updates (Packed/Shipped/OFD):**
   ```
   ✅ Status template email sent via [provider]: ESHP-2026-XXXX -> [Status]
   ⚠️ NO attachment (expected for these statuses)
   ```

4. **Delivered:**
   ```
   ✅ Status template email sent via [provider]: ESHP-2026-XXXX -> Delivered
   📄 FinalTaxInvoice-ESHP-2026-XXXX.pdf attached (XXXXX bytes)
   ```

5. **Dynamic Download:**
   ```
   📥 Dynamic Invoice Download: ESHP-2026-XXXX | Status: [status] → PDF Type: [receipt/confirmation/final]
   ✅ Dynamic invoice generated: [filename].pdf (XXXXX bytes)
   ```

### ❌ **Error Indicators to Watch:**

- `❌ PDF generation failed` - Check Puppeteer logs
- `⚠️ Email queue failed` - Check email provider credentials
- `⚠️ Final invoice generation skipped` - Check PDF builder
- `❌ Dynamic invoice download error` - Check endpoint logs

---

## Troubleshooting

### Issue: "Cannot find user"
**Fix:** Update `TEST_USER_ID` with a valid MongoDB ObjectId from your users collection

### Issue: "401 Unauthorized" on admin endpoints
**Fix:** Verify `ADMIN_SECRET` matches the value in server's `.env` file

### Issue: Email not sending
**Fix:** Check `FEATURE_EMAIL_NOTIFICATIONS=true` and email provider config (Brevo/SMTP)

### Issue: PDF generation timeout
**Fix:** Increase timeout in test script or check server resources

### Issue: "Order not found" when downloading
**Fix:** Use the actual `orderId` returned from order placement step

---

## Expected Success Criteria

Before production push, verify:

- [x] All 5 tests pass in automated suite
- [x] Server logs show correct email queue dispatch
- [x] PDFs attach only on correct triggers (1, 2, 4)
- [x] No PDFs on status updates (3)
- [x] Dynamic download returns correct PDF type
- [x] No errors in server console
- [x] Email provider shows sent emails (check inbox/queue)
- [x] Downloaded PDFs open correctly

---

## Next Steps After Success

1. ✅ Run automated test suite
2. ✅ Verify all logs
3. ✅ Check email provider dashboard
4. ✅ Download and verify all 3 PDF types
5. 🚀 **Commit changes**
6. 🚀 **Push to production**

```bash
git add .
git commit -m "feat: Complete Omni-Flow email & dynamic invoice system"
git push origin main
```

---

**Test Duration:** ~2-3 minutes for full automated suite  
**Manual Test Duration:** ~10-15 minutes with verification
