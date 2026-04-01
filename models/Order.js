const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderId: { type: String, unique: true, required: true, index: true },
    userid: { type: String, required: true, index: true },
    userName: String,
    userEmail: String,
    paymentMethod: String,
    paymentStatus: { type: String, default: 'Pending' },
    orderStatus: { type: String, default: 'Order Placed' },
    totalAmount: Number,
    shippingAmount: Number,
    finalAmount: Number,
    couponCode: { type: String, default: '', uppercase: true, trim: true, index: true },
    couponDiscount: { type: Number, default: 0 },
    shippingAddress: {
        fullName: String,
        phone: String,
        addressline1: String,
        city: String,
        state: String,
        pin: String,
        country: { type: String, default: 'India' }
    },
    products: Array,
    estimatedArrival: Date,
    // 🔴 DELIVERY SCHEDULE FOR REAL-TIME FRONTEND UPDATES
    deliverySchedule: {
        date: Date,
        time: String,
        scheduledAt: Date,
        estimatedDays: Number,
        estimatedDelivery: Date
    },
    // Admin notes/comments for this order
    orderNotes: [
        {
            note: { type: String, required: true },
            author: { type: String }, // admin name or id
            createdAt: { type: Date, default: Date.now }
        }
    ],
    statusHistory: [
        {
            status: String,
            timestamp: { type: Date, default: Date.now },
            message: String,
            deliverySchedule: {
                date: Date,
                time: String,
                scheduledAt: Date,
                estimatedDays: Number,
                estimatedDelivery: Date
            },
            adminNote: String
        }
    ],
    orderDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
