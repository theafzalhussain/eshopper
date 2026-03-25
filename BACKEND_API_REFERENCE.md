# Backend API Reference - Order Management

## Full-Stack Connection Overview

This document explains how the React frontend connects to Node.js backend and MongoDB database for order management.

---

## 📡 API Endpoints

### 1. Get All Orders (with Filters)

**Endpoint:** `GET /api/admin/orders`

**Query Parameters:**
- `page` (number): Page number for pagination
- `limit` (number): Items per page
- `search` (string): Search by Order ID or Email
- `status` (string): Filter by order status
- `fromDate` (string): Filter orders from this date
- `toDate` (string): Filter orders until this date
- `paymentStatus` (string): Filter by payment status

**Response:**
```json
{
  "success": true,
  "orders": [
    {
      "orderId": "12345678",
      "userName": "John Doe",
      "userEmail": "john@example.com",
      "finalAmount": 2500,
      "orderStatus": "Confirmed",
      "productCount": 3,
      "products": [...],
      "deliverySchedule": {
        "date": "2026-04-15",
        "time": "14:30",
        "scheduledAt": "2026-04-15T14:30:00.000Z"
      },
      "statusHistory": [
        {
          "status": "Order Placed",
          "timestamp": "2026-03-25T10:00:00.000Z",
          "message": "Order placed successfully"
        },
        {
          "status": "Confirmed",
          "timestamp": "2026-03-25T10:30:00.000Z",
          "message": "Order confirmed and email sent"
        }
      ],
      "updatedAt": "2026-03-25T10:30:00.000Z",
      "createdAt": "2026-03-25T10:00:00.000Z"
    }
  ],
  "pages": 5,
  "currentPage": 1,
  "total": 48
}
```

---

### 2. Update Order Status

**Endpoint:** `POST /api/update-order-status`

**Request Body:**
```json
{
  "orderId": "12345678",
  "status": "Shipped",
  "deliverySchedule": {
    "date": "2026-04-15",
    "time": "14:30",
    "scheduledAt": "2026-04-15T14:30:00.000Z"
  }
}
```

**MongoDB Update Operation:**
```javascript
await Order.findOneAndUpdate(
  { orderId: req.body.orderId },
  {
    $set: {
      orderStatus: req.body.status,
      deliverySchedule: req.body.deliverySchedule,
      updatedAt: new Date()
    },
    $push: {
      statusHistory: {
        status: req.body.status,
        timestamp: new Date(),
        message: `Status updated to ${req.body.status}`,
        deliverySchedule: req.body.deliverySchedule
      }
    }
  },
  { new: true }
);
```

**Response:**
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "order": {
    "orderId": "12345678",
    "orderStatus": "Shipped",
    "deliverySchedule": {
      "date": "2026-04-15",
      "time": "14:30",
      "scheduledAt": "2026-04-15T14:30:00.000Z"
    },
    "statusHistory": [...]
  }
}
```

---

### 3. Confirm Order (with Premium Email)

**Endpoint:** `POST /api/admin/confirm-order`

**Headers:**
```
x-admin-secret: YOUR_ADMIN_SECRET
```

**Request Body:**
```json
{
  "orderId": "12345678",
  "deliverySchedule": {
    "date": "2026-04-15",
    "time": "14:30",
    "scheduledAt": "2026-04-15T14:30:00.000Z"
  }
}
```

**MongoDB Update Operation:**
```javascript
const order = await Order.findOneAndUpdate(
  { orderId: req.body.orderId },
  {
    $set: {
      orderStatus: "Confirmed",
      deliverySchedule: req.body.deliverySchedule,
      updatedAt: new Date()
    },
    $push: {
      statusHistory: {
        status: "Confirmed",
        timestamp: new Date(),
        message: "Order confirmed by admin",
        deliverySchedule: req.body.deliverySchedule
      }
    }
  },
  { new: true }
);

// Send premium confirmation email
await sendConfirmationEmail(order);
```

**Response:**
```json
{
  "success": true,
  "message": "Order confirmed successfully",
  "emailSent": true,
  "order": {...}
}
```

---

### 4. Get Single Order Details

**Endpoint:** `GET /api/admin/order/:orderId`

**Headers:**
```
x-admin-secret: YOUR_ADMIN_SECRET
```

**Response:**
```json
{
  "success": true,
  "order": {
    "orderId": "12345678",
    "userName": "John Doe",
    "userEmail": "john@example.com",
    "products": [...],
    "deliverySchedule": {...},
    "statusHistory": [...]
  }
}
```

---

### 5. Bulk Confirm Orders

**Endpoint:** `POST /api/admin/bulk-confirm-orders`

**Headers:**
```
x-admin-secret: YOUR_ADMIN_SECRET
```

**Request Body:**
```json
{
  "orderIds": ["12345678", "87654321", "11223344"]
}
```

**Response:**
```json
{
  "success": true,
  "confirmedCount": 3,
  "message": "3 orders confirmed successfully"
}
```

---

### 6. Bulk Delete Orders

**Endpoint:** `POST /api/admin/delete-orders`

**Headers:**
```
x-admin-secret: YOUR_ADMIN_SECRET
```

**Request Body:**
```json
{
  "orderIds": ["12345678", "87654321"]
}
```

**Response:**
```json
{
  "success": true,
  "deletedCount": 2,
  "message": "2 orders deleted successfully"
}
```

---

## 📊 MongoDB Schema

### Order Model

```javascript
const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true,
    index: true
  },
  finalAmount: {
    type: Number,
    required: true
  },
  orderStatus: {
    type: String,
    enum: ['Order Placed', 'Ordered', 'Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'],
    default: 'Order Placed',
    index: true
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
    default: 'Pending'
  },
  products: [{
    productId: String,
    name: String,
    quantity: Number,
    price: Number,
    image: String
  }],
  productCount: {
    type: Number,
    default: 0
  },
  deliverySchedule: {
    date: {
      type: String,
      default: null
    },
    time: {
      type: String,
      default: null
    },
    scheduledAt: {
      type: Date,
      default: null
    }
  },
  statusHistory: [{
    status: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    message: String,
    deliverySchedule: {
      date: String,
      time: String,
      scheduledAt: Date
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient filtering
orderSchema.index({ createdAt: -1 });
orderSchema.index({ userEmail: 1, orderStatus: 1 });

module.exports = mongoose.model('Order', orderSchema);
```

---

## 🔄 Real-Time Updates (Socket.io)

### Server-Side (Node.js)

```javascript
const io = require('socket.io')(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true
  }
});

// When order status is updated
io.emit('statusUpdate', {
  orderId: order.orderId,
  status: order.orderStatus,
  updatedAt: order.updatedAt
});
```

### Client-Side (React)

```javascript
// Already implemented in AdminOrders.jsx
const socket = io(BASE_URL, { auth: { userId } });

socket.on('statusUpdate', (payload) => {
  setOrders(prev => prev.map(order =>
    order.orderId === payload.orderId
      ? { ...order, orderStatus: payload.status, updatedAt: payload.updatedAt }
      : order
  ));
});
```

---

## 🎯 Backend Implementation Example

### Example: Update Order Status Handler

```javascript
// routes/admin.js
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { verifyAdmin } = require('../middleware/auth');

router.post('/update-order-status', async (req, res) => {
  try {
    const { orderId, status, deliverySchedule } = req.body;

    // Validate status
    const validStatuses = ['Order Placed', 'Ordered', 'Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    // Update order in MongoDB
    const order = await Order.findOneAndUpdate(
      { orderId },
      {
        $set: {
          orderStatus: status,
          ...(deliverySchedule && { deliverySchedule }),
          updatedAt: new Date()
        },
        $push: {
          statusHistory: {
            status,
            timestamp: new Date(),
            message: `Status updated to ${status}`,
            ...(deliverySchedule && { deliverySchedule })
          }
        }
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Emit real-time update via Socket.io
    req.io.emit('statusUpdate', {
      orderId: order.orderId,
      status: order.orderStatus,
      updatedAt: order.updatedAt
    });

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
});

module.exports = router;
```

---

## 📝 Environment Variables

Add these to your `.env` file:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/eshopper
# or for production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/eshopper

# Admin Secret
ADMIN_SECRET=your_secure_admin_secret_here

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Email Configuration (for order confirmations)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

---

## ✅ Testing the Integration

### Test Filters
1. Open React app at `http://localhost:3000/admin/orders`
2. Type in search box → Backend receives `GET /api/admin/orders?search=12345678`
3. Select status filter → Backend receives `GET /api/admin/orders?status=Confirmed`
4. Pick date range → Backend receives `GET /api/admin/orders?fromDate=2026-03-01&toDate=2026-03-31`

### Test Status Update
1. Click "Update Status" on any order
2. Select new status + set delivery schedule
3. Click "Update Status" button
4. Backend receives POST request to `/api/update-order-status`
5. MongoDB updates `orderStatus`, `deliverySchedule`, and pushes to `statusHistory`
6. Socket.io emits real-time update to all connected clients

---

## 🎨 Features Implemented

✅ **React State Management**: All filters trigger API calls via useEffect
✅ **Debounced Search**: 400ms delay prevents excessive API calls
✅ **Real-time Updates**: Socket.io syncs order status across all admin users
✅ **Delivery Scheduling**: Date + Time picker sends `deliverySchedule` to backend
✅ **Status History**: Array of status changes with timestamps
✅ **Responsive Design**: CSS Grid toolbar + Mobile card view for table
✅ **Premium Modal**: Animated status update modal with Date/Time pickers
✅ **Glowing Badges**: Status-specific colors with pulse animations

---

## 📚 Additional Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Socket.io Documentation](https://socket.io/docs/)
- [React useEffect Hook](https://react.dev/reference/react/useEffect)
- [Axios Request Config](https://axios-http.com/docs/req_config)
