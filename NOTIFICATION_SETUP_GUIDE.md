# WhatsApp & Email Notification Setup Guide 🔔

## Overview
This guide will help you configure WhatsApp and Email notifications for your Eshopper application. Notifications are automatically sent when:
- A customer places an order
- Order status changes (Packed, Shipped, Out for Delivery, Delivered)
- Payment confirmation

---

## 🔧 Environment Variables Required

### 1. **Email Notifications (Brevo)**

```env
BREVO_API_KEY="xkeysib-xxxxx_your_brevo_api_key_xxxxx"
SENDER_EMAIL="support@eshopperr.me"
```

**How to get Brevo API Key:**
1. Go to [Brevo.com](https://www.brevo.com) (formerly Sendinblue)
2. Sign up for a free account
3. Navigate to **Settings** → **API Keys**
4. Create a new API key
5. Copy the key and add it to your environment variables

---

### 2. **WhatsApp Notifications (Evolution API)**

```env
EVOLUTION_API_URL="https://your-evolution-api-url.railway.app"
WHATSAPP_TOKEN="your-whatsapp-token-here"
EVOLUTION_API_KEY="your-evolution-api-key-here"
WHATSAPP_INSTANCE="eshopper_bot"
WHATSAPP_SENDER_NUMBER="918447859784"
```

**How to setup Evolution API:**

#### Option A: Deploy on Railway (Recommended)
1. Go to [Railway.app](https://railway.app)
2. Create a new project
3. Deploy Evolution API:
   - GitHub: https://github.com/EvolutionAPI/evolution-api
   - Or use Railway template if available
4. Once deployed, you'll get an API URL like: `https://evolution-api-production-xxxx.up.railway.app`
5. Set up your WhatsApp instance:
   - Access the Evolution API dashboard
   - Create a new instance named "eshopper_bot"
   - Scan QR code with your WhatsApp Business number
   - Copy the API key/token provided

#### Option B: Self-hosted
1. Clone Evolution API: `git clone https://github.com/EvolutionAPI/evolution-api`
2. Follow their installation guide
3. Deploy on your server
4. Get API URL and keys

**Environment Variables Explanation:**
- `EVOLUTION_API_URL`: The base URL of your Evolution API instance
- `WHATSAPP_TOKEN` or `EVOLUTION_API_KEY`: Authentication token (use either one)
- `WHATSAPP_INSTANCE`: Name of your WhatsApp instance (default: eshopper_bot)
- `WHATSAPP_SENDER_NUMBER`: Your WhatsApp Business number with country code (e.g., 918447859784)

---

## 🚀 Setting Up Environment Variables in Railway

### Method 1: Railway Dashboard
1. Go to your Railway project
2. Select your service
3. Click on **Variables** tab
4. Click **+ New Variable**
5. Add each variable name and value
6. Click **Add** for each variable
7. Railway will automatically redeploy

### Method 2: Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link your project
railway link

# Add variables
railway variables set BREVO_API_KEY="your-key-here"
railway variables set EVOLUTION_API_URL="your-url-here"
railway variables set WHATSAPP_TOKEN="your-token-here"
# ... add all other variables
```

---

## ✅ Testing Notifications

### 1. Use the Test Page
After deploying, visit:
```
https://eshopperr.me/test-notifications.html
```

Or locally:
```
http://localhost:5000/test-notifications.html
```

Enter your:
- Phone number (with country code, e.g., 918447859784)
- Email address

Click **Test Notifications** to verify setup.

### 2. Use API Endpoint
```bash
# Test with curl
curl -X POST https://eshopperr.me/api/test-notification \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "918447859784",
    "email": "test@example.com"
  }'
```

### 3. Check Configuration
Visit the test page and click **Check Config** to see which environment variables are properly configured.

---

## 📱 How Notifications Work

### Order Placement Flow:
1. Customer places order
2. System creates order in database
3. **Email notification sent** with:
   - Order confirmation
   - PDF invoice attachment
   - Order details and tracking link
4. **WhatsApp notification sent** with:
   - Order confirmation image
   - Order details (items, amount, delivery date)
   - Tracking link
   - Payment method info

### Order Status Update Flow:
1. Admin updates order status
2. System detects status change
3. **Real-time Socket.IO** notification to user's dashboard
4. **Email sent** with status update
5. **WhatsApp message sent** with status and tracking link

---

## 🔍 Troubleshooting

### WhatsApp Not Working

**Check 1: Environment Variables**
```bash
# Verify on Railway or locally
echo $EVOLUTION_API_URL
echo $WHATSAPP_TOKEN
```

**Check 2: Evolution API Status**
- Visit your Evolution API URL in browser
- Check if it's running and accessible
- Verify WhatsApp instance is connected (QR code scanned)

**Check 3: Phone Number Format**
- Must include country code
- For India: 91XXXXXXXXXX (12 digits total)
- No spaces, dashes, or special characters

**Check 4: WhatsApp Instance**
- Instance name must match `WHATSAPP_INSTANCE` variable
- WhatsApp must be connected (green status)
- Check Evolution API logs

### Email Not Working

**Check 1: Brevo API Key**
- Verify key is correct
- Check if key has necessary permissions
- Ensure account is verified on Brevo

**Check 2: Sender Email**
- Email must be verified in Brevo
- Check sender domain is configured

**Check 3: API Limits**
- Free plan: 300 emails/day
- Check if limit reached on Brevo dashboard

### Both Not Working

**Check 1: Server Logs**
Railway:
1. Go to your service
2. Click **Deployments**
3. Select latest deployment
4. View **Logs**
5. Look for notification errors

**Check 2: Network Issues**
- Ensure server can reach external APIs
- Check firewall/security rules

**Check 3: Sentry Errors**
If `SENTRY_DSN` is configured, check Sentry dashboard for error logs.

---

## 📊 Notification Status Responses

### Success Response:
```json
{
  "success": true,
  "message": "All notifications sent successfully",
  "results": {
    "email": {
      "attempted": true,
      "success": true,
      "message": "Email notification sent successfully"
    },
    "whatsapp": {
      "attempted": true,
      "success": true,
      "message": "WhatsApp notification sent successfully"
    }
  }
}
```

### Partial Success (Email works, WhatsApp fails):
```json
{
  "success": false,
  "message": "Some notifications failed",
  "results": {
    "email": {
      "attempted": true,
      "success": true
    },
    "whatsapp": {
      "attempted": true,
      "success": false,
      "error": "EVOLUTION_API_URL not configured"
    }
  }
}
```

---

## 🎯 Production Checklist

Before going live, ensure:

- [ ] All environment variables are set in Railway
- [ ] Brevo account is verified and API key is active
- [ ] Evolution API is deployed and running
- [ ] WhatsApp instance is connected (QR scanned)
- [ ] Test notifications work for both email and WhatsApp
- [ ] Phone numbers in database include country code
- [ ] Sender email is verified in Brevo
- [ ] Check daily email sending limits
- [ ] Monitor notification logs after deployment
- [ ] Set up Sentry for error tracking (optional but recommended)

---

## 🆘 Support

If you need help:
1. Check Railway logs for errors
2. Test notifications using `/test-notifications.html`
3. Verify all environment variables are set correctly
4. Check Evolution API dashboard for WhatsApp connection status
5. Review Brevo dashboard for email delivery status

---

## 📝 Quick Reference

### Test Notification Endpoint
```
POST /api/test-notification
Body: { "phone": "918447859784", "email": "test@example.com" }
```

### Order Placement Endpoint
```
POST /api/place-order
Body: { userId, paymentMethod, finalAmount, products, shippingAddress }
```

### Environment Variables Summary
```env
# Email
BREVO_API_KEY=xkeysib-xxxxx
SENDER_EMAIL=support@eshopperr.me

# WhatsApp
EVOLUTION_API_URL=https://your-api-url
WHATSAPP_TOKEN=your-token
WHATSAPP_INSTANCE=eshopper_bot
WHATSAPP_SENDER_NUMBER=918447859784
```

---

**Last Updated:** March 4, 2026
**Version:** 1.0.0
