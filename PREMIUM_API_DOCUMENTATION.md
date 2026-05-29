# Premium System - Backend API Documentation

## 🔗 Required API Endpoints

### Authentication Endpoints

#### 1. Premium Login
```
POST /auth/premium-login
or
POST /auth/login
```

**Request:**
```json
{
    "email": "user@example.com",
    "password": "password123"
}
```

**Response (Success):**
```json
{
    "success": true,
    "token": "jwt_token_here",
    "user": {
        "id": "user_123",
        "email": "user@example.com",
        "name": "John Doe",
        "username": "johndoe",
        "role": "User",
        "pic": "profile_pic_url"
    },
    "membershipTier": "gold",
    "renewalDate": "2025-12-31"
}
```

#### 2. Premium Signup
```
POST /auth/premium-signup
or
POST /auth/signup
```

**Request:**
```json
{
    "name": "John Doe",
    "email": "john@example.com",
    "username": "johndoe",
    "password": "password123",
    "membershipTier": "gold"
}
```

**Response (Success):**
```json
{
    "success": true,
    "message": "OTP sent",
    "tempUserId": "temp_123"
}
```

#### 3. Verify Signup OTP
```
POST /auth/verify-signup-otp
```

**Request:**
```json
{
    "tempUserId": "temp_123",
    "otp": "123456"
}
```

**Response:**
```json
{
    "success": true,
    "token": "jwt_token_here",
    "user": { ... },
    "membershipTier": "gold"
}
```

#### 4. Check Username Availability
```
GET /auth/check-username?username=johndoe
```

**Response:**
```json
{
    "available": true
}
```

---

### Membership Endpoints

#### 5. Get User Membership Status
```
GET /api/membership/:userId
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Response:**
```json
{
    "membershipTier": "gold",
    "renewalDate": "2025-12-31",
    "totalSavings": 5420,
    "rewardPoints": 8500,
    "features": [
        "30% Extra Discount",
        "Free Express Shipping",
        "24/7 Priority Support"
    ],
    "memberSince": "2024-01-15"
}
```

#### 6. Upgrade Membership
```
POST /api/membership/upgrade
```

**Headers:**
```
Authorization: Bearer jwt_token
Content-Type: application/json
```

**Request:**
```json
{
    "userId": "user_123",
    "tier": "platinum",
    "paymentMethod": "credit_card",
    "amount": 1499
}
```

**Response:**
```json
{
    "success": true,
    "message": "Membership upgraded successfully",
    "membershipTier": "platinum",
    "renewalDate": "2025-12-31",
    "amount": 1499,
    "transactionId": "txn_123456"
}
```

#### 7. Cancel Membership
```
POST /api/membership/cancel
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Request:**
```json
{
    "userId": "user_123",
    "reason": "Not satisfied with service"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Membership cancelled successfully",
    "refundAmount": 500
}
```

#### 8. Renew Membership
```
POST /api/membership/renew
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Request:**
```json
{
    "userId": "user_123",
    "tier": "gold"
}
```

**Response:**
```json
{
    "success": true,
    "membershipTier": "gold",
    "renewalDate": "2026-12-31",
    "amount": 799
}
```

---

### User Stats Endpoints

#### 9. Get User Dashboard Stats
```
GET /api/user/stats/:userId
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Response:**
```json
{
    "totalSavings": 5420,
    "totalOrders": 24,
    "totalRewardPoints": 8500,
    "memberSince": "January 2024",
    "lastOrderDate": "2024-11-20",
    "monthlySpent": 8500
}
```

#### 10. Get Reward Points
```
GET /api/user/:userId/rewards
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Response:**
```json
{
    "totalPoints": 8500,
    "pointsUsed": 1500,
    "availablePoints": 7000,
    "pointsExpiry": "2025-12-31",
    "transactions": [
        {
            "id": "txn_123",
            "type": "purchase",
            "points": 500,
            "date": "2024-11-15"
        }
    ]
}
```

---

### Payment Endpoints

#### 11. Create Payment Intent
```
POST /api/payment/create-intent
```

**Headers:**
```
Authorization: Bearer jwt_token
Content-Type: application/json
```

**Request:**
```json
{
    "userId": "user_123",
    "amount": 799,
    "tier": "gold",
    "paymentMethod": "credit_card"
}
```

**Response:**
```json
{
    "success": true,
    "clientSecret": "pi_1234567890",
    "publishableKey": "pk_test_123"
}
```

#### 12. Confirm Payment
```
POST /api/payment/confirm
```

**Headers:**
```
Authorization: Bearer jwt_token
Content-Type: application/json
```

**Request:**
```json
{
    "paymentIntentId": "pi_1234567890",
    "userId": "user_123"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Payment successful",
    "membershipTier": "gold",
    "renewalDate": "2025-12-31"
}
```

---

## 🛠️ Backend Implementation Example (Node.js/Express)

### Setup

```bash
npm install express mongoose bcryptjs jsonwebtoken stripe razorpay
```

### Model: Premium Membership

```javascript
const premiumSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tier: {
        type: String,
        enum: ['silver', 'gold', 'platinum'],
        default: 'silver'
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    renewalDate: {
        type: Date,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    paymentMethod: String,
    transactionId: String,
    status: {
        type: String,
        enum: ['active', 'expired', 'cancelled'],
        default: 'active'
    },
    features: [String],
    createdAt: {
        type: Date,
        default: Date.now
    }
})

module.exports = mongoose.model('Premium', premiumSchema)
```

### Controller: Membership

```javascript
// Upgrade Membership
exports.upgradeMembership = async (req, res) => {
    try {
        const { userId, tier, paymentMethod, amount } = req.body

        // Validate payment first
        // Then create membership record

        const membership = new Premium({
            userId,
            tier,
            startDate: new Date(),
            renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            amount,
            paymentMethod,
            transactionId: 'txn_' + Date.now(),
            features: getTierFeatures(tier),
            status: 'active'
        })

        await membership.save()

        // Update user
        await User.findByIdAndUpdate(userId, {
            membershipTier: tier,
            renewalDate: membership.renewalDate
        })

        res.json({
            success: true,
            membershipTier: tier,
            renewalDate: membership.renewalDate
        })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

// Get Membership Status
exports.getMembership = async (req, res) => {
    try {
        const { userId } = req.params

        const membership = await Premium.findOne({
            userId,
            status: 'active'
        })

        if (!membership) {
            return res.json({ membershipTier: 'none' })
        }

        res.json({
            membershipTier: membership.tier,
            renewalDate: membership.renewalDate,
            features: membership.features,
            status: membership.status
        })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

// Helper function
function getTierFeatures(tier) {
    const features = {
        silver: [
            '15% Extra Discount',
            'Free Shipping',
            'Priority Support'
        ],
        gold: [
            '30% Extra Discount',
            'Free Express Shipping',
            '24/7 Priority Support',
            'Exclusive Sales Access'
        ],
        platinum: [
            '50% Extra Discount',
            'Free Next-Day Delivery',
            'VIP Support',
            'Personal Shopping Assistant'
        ]
    }
    return features[tier] || []
}
```

### Routes

```javascript
const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const membershipController = require('../controllers/membershipController')

router.post('/upgrade', auth, membershipController.upgradeMembership)
router.get('/:userId', auth, membershipController.getMembership)
router.post('/cancel', auth, membershipController.cancelMembership)
router.post('/renew', auth, membershipController.renewMembership)

module.exports = router
```

---

## 💳 Payment Integration

### Razorpay Integration

```javascript
const Razorpay = require('razorpay')

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
})

exports.createOrder = async (req, res) => {
    try {
        const { amount, tier } = req.body

        const order = await razorpay.orders.create({
            amount: amount * 100,
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
            notes: {
                tier,
                description: `Premium ${tier} membership`
            }
        })

        res.json({
            success: true,
            orderId: order.id,
            amount: amount,
            key: process.env.RAZORPAY_KEY_ID
        })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body
        
        // Verify signature
        const verified = verifySignature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        )

        if (!verified) {
            return res.status(400).json({ error: 'Payment verification failed' })
        }

        // Update membership
        res.json({ success: true, message: 'Payment verified' })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}
```

---

## 📋 Database Schema Additions

### User Collection Update
```json
{
    "membershipTier": "gold",
    "renewalDate": "2025-12-31",
    "premiumJoinedDate": "2024-01-01",
    "totalSavings": 5420,
    "rewardPoints": 8500
}
```

### New Collections

**Premium Collection:**
- userId
- tier
- startDate
- renewalDate
- amount
- paymentMethod
- transactionId
- status
- features

**RewardPoints Collection:**
- userId
- totalPoints
- usedPoints
- transactions[]

**Transactions Collection:**
- userId
- type (purchase, upgrade, refund)
- amount
- tier
- paymentMethod
- date
- status

---

## 🔐 Security Checklist

- [ ] Validate JWT tokens on all protected routes
- [ ] Encrypt sensitive data (payment info)
- [ ] Rate limit authentication endpoints
- [ ] Log all payment transactions
- [ ] Use HTTPS for all API calls
- [ ] Implement CORS properly
- [ ] Hash passwords with bcryptjs
- [ ] Store payment tokens securely
- [ ] Implement payment verification

---

## 🧪 Testing Endpoints

### Using cURL

```bash
# Premium Login
curl -X POST http://localhost:5000/auth/premium-login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Check Username
curl -X GET "http://localhost:5000/auth/check-username?username=johndoe"

# Get Membership
curl -X GET http://localhost:5000/api/membership/user_123 \
  -H "Authorization: Bearer jwt_token"

# Upgrade Membership
curl -X POST http://localhost:5000/api/membership/upgrade \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer jwt_token" \
  -d '{"userId":"user_123","tier":"gold","amount":799}'
```

---

## 📊 Database Indexes

For better performance:

```javascript
// Premium collection
db.premiums.createIndex({ userId: 1 })
db.premiums.createIndex({ renewalDate: 1 })
db.premiums.createIndex({ status: 1 })

// User collection
db.users.createIndex({ email: 1 })
db.users.createIndex({ username: 1 })
db.users.createIndex({ membershipTier: 1 })
```

---

## 📞 Support

For issues with API integration, check:
1. Auth tokens are valid
2. Correct endpoint URLs
3. Request/response format matches
4. CORS headers are set
5. Database connections are active

