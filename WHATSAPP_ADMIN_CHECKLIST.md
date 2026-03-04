# WhatsApp Admin Troubleshooting Checklist

## 🔧 Backend Diagnostics

### Check 1: Environment Variables

Verify all WhatsApp credentials are set in `.env`:

```bash
# Check these variables exist and are not empty:
EVOLUTION_API_URL=https://api.evolution-api.com/v1
WHATSAPP_TOKEN=<your-token>
EVOLUTION_API_KEY=<optional-api-key>
WHATSAPP_INSTANCE=eshopper_bot
WHATSAPP_SENDER_NUMBER=918234567890
```

**How to verify:**
1. SSH into your production server
2. Run: `cat .env | grep WHATSAPP`
3. Check all 5 variables are present
4. Ensure no typos in keys

### Check 2: Evolution API Status

Test API connectivity:

```bash
# Replace <TOKEN> with your actual token
curl -X GET "https://api.evolution-api.com/v1/instance/<instance-name>" \
  -H "Authorization: Bearer <TOKEN>"
```

**Expected response:**
```json
{
  "status": "connected",
  "instance": "eshopper_bot",
  "connected": true
}
```

### Check 3: Database - User Phone Numbers

Check how many users have phone numbers saved:

```javascript
// In MongoDB:
db.users.find({ phone: { $exists: true, $ne: "" } }).count()
db.users.find({ phone: "NOT SET" }).count()
db.users.find({ phone: { $exists: false } }).count()
```

**Healthy metrics:**
- 70%+ of users should have phone numbers
- If <50%, send reminder email about WhatsApp feature

### Check 4: Recent Orders - WhatsApp Success Rate

Check server logs for WhatsApp sending success:

```bash
# On your server, check recent logs:
tail -f /var/log/app.log | grep "WhatsApp"

# Or in CloudWatch/Railway logs:
# Search for: "🔔 WhatsApp Notification Debug"
```

**Look for patterns:**

```
✅ WhatsApp sent for order ESHP-2025-0001
✅ WhatsApp sent for order ESHP-2025-0002
ℹ️  WhatsApp SKIPPED - No phone number in profile
✅ WhatsApp sent for order ESHP-2025-0003
⚠️  WhatsApp failed for order ESHP-2025-0004 (API error)
```

### Check 5: Phone Number Validation

Verify the normalization function is working:

```javascript
// Test in Node.js console:

const normalizePhoneStrict = (phone = '') => {
    let digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return '';

    if (digits.length === 11 && digits.startsWith('0')) {
        digits = digits.slice(1);
    }

    if (digits.length === 12 && digits.startsWith('91')) {
        return digits;
    }

    if (digits.length > 10 && digits.startsWith('91')) {
        digits = digits.slice(-10);
    }

    if (digits.length === 10) {
        return `91${digits}`;
    }

    if (digits.length > 10) {
        return `91${digits.slice(-10)}`;
    }

    return '';
};

// Test cases:
console.log(normalizePhoneStrict('8234567890'));        // ✅ '918234567890'
console.log(normalizePhoneStrict('+918234567890'));     // ✅ '918234567890'
console.log(normalizePhoneStrict('918234567890'));      // ✅ '918234567890'
console.log(normalizePhoneStrict('91 82345 67890'));    // ✅ '918234567890'
console.log(normalizePhoneStrict('08234567890'));       // ✅ '918234567890'
console.log(normalizePhoneStrict('123'));               // ❌ '' (invalid)
console.log(normalizePhoneStrict(''));                  // ❌ '' (empty)
```

---

## 🧪 Testing WhatsApp Manually

### Test 1: Send Test WhatsApp via API

```bash
# Using test endpoint (if available)
curl -X POST "https://eshopperr.me/api/test-notification" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "918234567890",
    "email": "test@example.com",
    "testType": "whatsapp"
  }'

# Expected response:
{
  "success": true,
  "message": "Test notification sent successfully"
}
```

### Test 2: Check Logs for Specific Order

```bash
# Find order logs:
tail -n 1000 /var/log/app.log | grep "ESHP-2025-0001"

# Should show:
# ✅ WhatsApp sent for order ESHP-2025-0001
# OR
# ℹ️  WhatsApp SKIPPED - No phone number
```

### Test 3: Manual Database Check

```javascript
// Check a specific user:
db.users.findOne({ email: "customer@example.com" })

// Output should show:
{
  _id: ObjectId(...),
  name: "Raj Kumar",
  email: "customer@example.com",
  phone: "918234567890",  // ✅ Must be present
  ...
}
```

---

## 🐛 Common Issues & Fixes

### Issue 1: "Phone from profile: NOT SET"

**Symptoms:**
- Logs show: `Phone from profile: "NOT SET"`
- Users not receiving WhatsApp
- Emails still working

**Root Cause:** Users haven't saved phone in profile

**Solution:**
1. Run email campaign: "Update Profile for WhatsApp"
2. Direct users to: https://eshopperr.me/profile
3. Provide step-by-step guide (see WHATSAPP_USER_GUIDE.md)
4. Monitor success rate after 2-3 days

### Issue 2: "Invalid phone format"

**Symptoms:**
- Logs show: `❌ Contact number is invalid or too short`
- Some users get WhatsApp, others don't

**Root Cause:** Phone number validation failing

**Solution:**
1. Check normalizePhoneStrict function
2. Look for edge cases: special chars, + sign, spaces
3. Verify with the user what they entered
4. Update profile with correct format

### Issue 3: "WhatsApp failed - HTTP 400"

**Symptoms:**
- Logs show: `⚠️ WhatsApp failed: HTTP 400`
- Error message: "Malformed phone number"

**Root Cause:** Evolution API received invalid phone format

**Solution:**
1. Check if normalizePhoneStrict is working
2. Add more robust validation
3. Test with sample phone numbers
4. Contact Evolution API support

### Issue 4: "WhatsApp failed - HTTP 401"

**Symptoms:**
- Logs show: `⚠️ WhatsApp failed: HTTP 401`
- Error message: "Unauthorized"

**Root Cause:** Invalid API token or credentials

**Solution:**
1. Verify WHATSAPP_TOKEN is correct in .env
2. Check if token has expired
3. Regenerate token from Evolution API dashboard
4. Redeploy with new token

### Issue 5: "WhatsApp failed - HTTP 429"

**Symptoms:**
- Logs show: `⚠️ WhatsApp failed: HTTP 429`
- Error message: "Too many requests"

**Root Cause:** Rate limiting (API quota exceeded)

**Solution:**
1. Check number of orders placed (spike?)
2. Add delay between WhatsApp sends
3. Contact Evolution API about limits
4. Consider pagination or queue system

---

## 📊 Monitoring Dashboard

Create a monitoring script to track WhatsApp stats:

```javascript
// Cron job to run daily
async function trackWhatsAppStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Orders with successful WhatsApp
  const successOrders = await Order.find({
    createdAt: { $gte: today },
    whatsappSent: true
  }).count();

  // Orders without phone
  const noPhoneOrders = await Order.find({
    createdAt: { $gte: today },
    whatsappSkipped: true,
    skipReason: "NO_PHONE"
  }).count();

  // Orders with WhatsApp errors
  const failedOrders = await Order.find({
    createdAt: { $gte: today },
    whatsappError: true
  }).count();

  // Users with phone saved
  const usersWithPhone = await User.find({
    phone: { $exists: true, $ne: "" }
  }).count();

  // Total users
  const totalUsers = await User.countDocuments();

  const stats = {
    date: today,
    whatsappSuccess: successOrders,
    whatsappSkipped: noPhoneOrders,
    whatsappFailed: failedOrders,
    usersWithPhone: usersWithPhone,
    phoneAdoptionRate: `${((usersWithPhone / totalUsers) * 100).toFixed(2)}%`
  };

  console.log("📊 WhatsApp Daily Stats:", stats);
  // Send to monitoring service (DataDog, New Relic, etc.)
}
```

---

## 🎯 Performance Optimization

### 1. Reduce Message Size

Keep WhatsApp message under 4096 characters:

```javascript
// Current: ~500 characters ✅ (good)
// Monitor: If over 1000 chars, consider truncating
const msgLength = whatsappMsg.length;
if (msgLength > 1000) {
  console.warn(`⚠️ WhatsApp message too long: ${msgLength} chars`);
  // Truncate or optimize
}
```

### 2. Add Rate Limiting

```javascript
// Prevent too rapid sends
const sendWhatsApp = async (number, message) => {
  // Add queue if more than X orders/min
  if (recentSendCount > 10) {
    await sleep(1000); // Wait 1 second between sends
  }
  // Then proceed with send
};
```

### 3. Implement Retry Logic

```javascript
// Retry failed WhatsApp sends
async function retryFailedWhatsApps() {
  const failed = await Order.find({
    whatsappError: true,
    whatsappRetries: { $lt: 3 },
    lastWhatsappRetry: { $lt: new Date(Date.now() - 5 * 60000) } // 5 mins ago
  });

  for (const order of failed) {
    try {
      await sendWhatsApp(order.userPhone, buildMessage(order));
      order.whatsappError = false;
      await order.save();
    } catch (e) {
      order.whatsappRetries++;
      order.lastWhatsappRetry = new Date();
      await order.save();
    }
  }
}
```

---

## ✅ Health Check Endpoint

Add this endpoint to monitor WhatsApp health:

```javascript
app.get('/api/health/whatsapp', async (req, res) => {
  const stats = {
    evolutionApiConfigured: !!process.env.EVOLUTION_API_URL,
    whatsappToken: !!process.env.WHATSAPP_TOKEN,
    instanceName: process.env.WHATSAPP_INSTANCE,
    recentOrders: await Order.countDocuments({ createdAt: { $gte: new Date(Date.now() - 3600000) } }),
    successRate: 0,
    lastError: null
  };

  // Calculate success rate from last 100 orders
  const last100 = await Order.find().sort({ createdAt: -1 }).limit(100);
  const successful = last100.filter(o => o.whatsappSent).length;
  stats.successRate = `${((successful / 100) * 100).toFixed(2)}%`;

  res.json(stats);
});
```

---

## 🚨 Alert Rules

Set up alerts for:

1. **WhatsApp Success Rate < 70%**
   - Check API status
   - Review logs for errors
   - Verify credentials

2. **Users with Phone < 50%**
   - Launch awareness campaign
   - Add onboarding step for phone
   - Incentivize filling profile

3. **API Error Rate > 10%**
   - Check Evolution API status page
   - Contact API support
   - Check token expiry

4. **Message Send Time > 5s**
   - Check network latency
   - Optimize message size
   - Consider async queue

---

## 📞 Support Escalation

If issues persist:

1. **Contact Evolution API support**
   - Provide account ID
   - Share error logs
   - Ask about limits/quotas

2. **Check Brevo SMTP** (fallback email)
   - Verify email is being sent
   - Check spam filters
   - Review bounce rates

3. **Review Database**
   - Backup before making changes
   - Check phone field data types
   - Validate phone format consistency

---

## 🔄 Deployment Checklist

Before deploying WhatsApp changes:

- [ ] All environment variables set
- [ ] Phone validation tested
- [ ] Edge cases handled
- [ ] Logs configured properly
- [ ] Error handling in place
- [ ] Fallback to email if WhatsApp fails
- [ ] Rate limiting implemented
- [ ] Message preview logged
- [ ] Test order placed successfully
- [ ] Phone format conversion verified
- [ ] API health check passing
- [ ] Database backup created

