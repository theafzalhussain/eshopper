# 📱 WhatsApp Notifications Troubleshooting Guide

## ❌ Issue: WhatsApp notifications not arriving

### 🔍 Step 1: Check If API Is Connected

The Evolution API seems to be working fine. Test it:

```bash
node test-whatsapp.js
```

**Expected Output:**
```
✅ Instance Status: { instance: { instanceName: 'eshopper_bot', state: 'open' } }
✅ Message Sent Successfully!
```

If you see "state": "open", the API is connected ✅

---

### 🔍 Step 2: Check User's Phone Number

This is the **#1 most common issue**. Users need to have a phone number saved in their profile!

**How to check:**
```bash
# Replace USER_ID with actual MongoDB user ID
curl "http://localhost:5000/api/check-whatsapp-status/USER_ID"
```

**Or from the frontend, after login**, you'll see in the order response:
```json
{
  "notifications": {
    "email": "✅ Sent",
    "whatsapp": "⚠️ Skipped - Please add phone in profile"
  }
}
```

---

### ✅ Solution: Add Phone Number to Profile

**For Existing Users:**

1. Go to: **https://eshopperr.me/profile**
2. Scroll to the **Phone** field
3. Enter your phone number (10 digits or with country code)
4. Click **Save**
5. Place a new order to test

**For New Users (During Signup):**
- Phone is optional but should be added before checkout
- Or update it in profile after signup

---

### 🧪 Step 3: Test WhatsApp After Adding Phone

**Test Endpoint:**
```bash
curl -X POST "http://localhost:5000/api/test-notification" \
  -H "Content-Type: application/json" \
  -d '{"phone": "918447859784", "email": "your@email.com", "testType": "whatsapp"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "All notifications sent successfully",
  "results": {
    "whatsapp": {
      "success": true,
      "message": "WhatsApp notification sent successfully"
    }
  }
}
```

---

### 📋 Phone Number Format

WhatsApp notifications require:
- **Format:** 91 + 10 digits (Indian)
- **Examples:**
  - ✅ `918447859784`
  - ✅ `+918447859784`
  - ✅ `8447859784` (auto-converted to 918447859784)
  - ❌ `04XXXXXXXXXX` (invalid - too many digits)
  - ❌ `9XXXXXXXXX` (invalid - needs 91 prefix for India)

---

## 🔍 Advanced Debugging

### Check Railway Logs

Look for these patterns:

**When phone is missing:**
```
❌ WHATSAPP SKIPPED: No phone number found for order...
   → User needs to update profile with phone number
   → Go to: https://eshopperr.me/profile
```

**When sending fails:**
```
❌ WHATSAPP SEND ERROR for order...
   Error: [error message]
   Phone: 918447859784
   Status: [HTTP status]
   Data: [response data]
```

### Check Order Response

After placing order, you'll see:
```json
{
  "notifications": {
    "whatsapp": "✅ Sent" OR "⚠️ Skipped - Please add phone in profile"
  }
}
```

---

## ✅ Verification Checklist

- [ ] Phone number is in user profile (edit: https://eshopperr.me/profile)
- [ ] Phone format is correct (91 + 10 digits for India)
- [ ] Evolution API instance is "open" (state: "open")
- [ ] Test message sends successfully
- [ ] Order placed with phone in shipping address
- [ ] Check Railway logs for confirmation

---

## 🆘 If Still Not Working

1. **Check user phone field:**
   - Go to MongoDB Atlas
   - Look at the User record
   - Verify `phone` field is populated

2. **Check order logs:**
   - Railway → Logs
   - Filter for user's order ID
   - Look for "WhatsApp Debug Info" messages

3. **Verify sender number:**
   - Check env: `WHATSAPP_SENDER_NUMBER=918447859784`
   - Should NOT be the same as customer phone (causes self-loop prevention)

4. **Test Evolution API directly:**
   ```bash
   node test-whatsapp.js
   ```

---

## 📞 Support

If WhatsApp still isn't working after all steps:

1. Check order ID in logs: `#ORDER_12345`
2. Get the phone number from Railways logs
3. Verify Evolution API response shows: `"status": "PENDING"`
4. Contact Evolution API support if API is down

---

## 🎯 Quick Fix Commands

**Test everything at once:**
```bash
node test-whatsapp.js && \
curl -X GET "http://localhost:5000/api/check-whatsapp-status/[USER_ID]"
```

**Send test to yourself:**
```bash
curl -X POST "http://localhost:5000/api/test-notification" \
  -H "Content-Type: application/json" \
  -d "{\"phone\": \"91[YOUR_10_DIGITS]\", \"testType\": \"whatsapp\"}"
```
