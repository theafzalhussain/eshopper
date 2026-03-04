# WhatsApp Notification Diagnostic Guide

## 🔴 Problem
WhatsApp notifications are not being sent to users after order placement.

## 🔍 Root Cause Analysis

The WhatsApp API requires **phone numbers in user profiles**. Here's the flow:

```
Order Placed → Check user.phone → If exists → Send WhatsApp → ✅ Success
                                 ↓
                            If NOT saved
                                 ↓
                            Skip WhatsApp ❌
```

## ✅ How to Fix

### Step 1: User Updates Profile with Phone Number

Users need to save their phone number before placing orders:

1. Go to: **https://eshopperr.me/profile**
2. Find the **Phone** field (currently blank for most users)
3. Enter phone number: **`918XXXXXXXXX`** (India format: 91 + 10 digits)
4. Click **Update Profile**
5. Phone is now saved ✅

### Step 2: Verify Phone Format

Phone must be in this format:
- **India**: `918123456789` (91 + 10 digits)
- **Starts with**: `91` (country code)
- **Exactly**: 12 digits total
- **No spaces or special characters**

**Examples:**
- ✅ `918234567890` → Valid
- ❌ `+918234567890` → Invalid (has +)
- ❌ `98234567890` → Invalid (missing 91)
- ❌ `91 82345 67890` → Invalid (has spaces)

### Step 3: Test WhatsApp Notification

After updating profile:

1. Place a test order
2. Confirmation page will show email + order details
3. **Check your WhatsApp**:
   - **Message from**: eShopper bot (Evolution API)
   - **Contains**: Order ID, items, total amount
   - **Example**: "Your order ESHP-2025-0001 confirmed! ₹ 3,499"

## 🧪 Server-Side Debugging

When an order is placed, check server logs for this debug output:

```
🔔 WhatsApp Notification Debug for Order ESHP-2025-0001:
   User: Raj Kumar (60abc123def456......)
   Email: raj@example.com
   Phone from profile: "918234567890"
   Phone from address: "NOT PROVIDED"
   Final phone: "918234567890"
   WhatsApp Status: ✅ SENT (HTTP 201)
```

### What Each Field Means:

| Field | What It Shows |
|-------|---------------|
| **Phone from profile** | Value saved in user profile |
| **Phone from address** | Phone from current order address |
| **Final phone** | Which one was used (profile takes priority) |
| **WhatsApp Status** | ✅ SENT (201) or ❌ FAILED |

## 🔴 Common Issues & Solutions

### Issue 1: "Phone from profile: NOT SET"

**Problem**: User hasn't saved phone in profile yet

**Solution**:
1. Direct user to: `https://eshopperr.me/profile`
2. Click on phone field
3. Enter: `918234567890`
4. Click Update
5. Try placing order again

### Issue 2: "Phone from address: NOT PROVIDED"

**Problem**: During checkout, user didn't fill address phone field

**Current Fix**: Using profile phone automatically (checkout phone field removed)

### Issue 3: WhatsApp API Error

**Problem**: Even with phone, message fails

**Debug**: Check server logs for:
- `HTTP 400` → Malformed phone number
- `HTTP 401` → API authentication failed
- `HTTP 429` → Rate limited (sending too many)
- `HTTP 500` → Evolution API server error

## 📱 Example WhatsApp Message Format

```
eShopper Order Confirmation

Order ID: ESHP-2025-0001
Customer: Raj Kumar
Items: 2

Subtotal: ₹ 3,349
Shipping: ₹ 99
Total: ₹ 3,448

Status: ✅ Confirmed
Payment: Credited

📧 Email: raj@example.com
📱 Support: +91 8234567890 (WhatsApp)
```

## 🚀 Quick Checklist

- [ ] User has phone in profile? Check profile page
- [ ] Phone format correct? Must be `91XXXXXXXXXX`
- [ ] No spaces/special chars? Must be digits only
- [ ] Server logs showing debug output? Check if WhatsApp API called
- [ ] Integration key valid? Check Evolution API credentials in server.js
- [ ] Message approved? Some messages need Flow approval

## 🔗 Related Files

- **Frontend**: [src/Component/UpdateProfile.jsx](src/Component/UpdateProfile.jsx#L139)
- **Backend**: [server.js](server.js) lines 2560-2620 (WhatsApp sending logic)
- **Debug Logging**: [server.js](server.js) lines 2560-2572

## 📊 Success Metrics

After implementing:
- ✅ All users with phone in profile receive WhatsApp
- ✅ Debug logs show "SENT (HTTP 201)"
- ✅ WhatsApp message arrives within 5 seconds
- ✅ No duplicates or errors

## 🎯 Next Steps

1. **Communicate to users**: Tell them to update profile with phone
2. **Verify**: Check that their phone is saved
3. **Test**: Place a test order and verify WhatsApp arrives
4. **Monitor**: Watch server logs for success/failure patterns

---

**Questions?** Check server logs or contact support.
