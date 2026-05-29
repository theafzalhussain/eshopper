const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderId: { type: String, unique: true, required: true, index: true },
    userid: { type: String, required: true, index: true },
    userName: String,
    userEmail: String,
    paymentMethod: String,
    paymentStatus: { type: String, default: 'Pending' },
    paidAt: { type: Date, default: null },
    razorpayOrderId: { type: String, default: '' },
    razorpayPaymentId: { type: String, default: '' },
    razorpaySignature: { type: String, default: '' },
    orderStatus: { type: String, default: 'Order Placed' },
    totalAmount: Number,
    shippingAmount: Number,
    finalAmount: Number,
    couponCode: { type: String, default: '', uppercase: true, trim: true, index: true },
    couponDiscount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    giftWrapCharge: { type: Number, default: 0 },
    protectionCharge: { type: Number, default: 0 },
    ecoCharge: { type: Number, default: 0 },
    paymentFee: { type: Number, default: 0 },
    extraCharges: { type: Number, default: 0 },
    preDiscountTotal: { type: Number, default: 0 },
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
    deliveryOtp: String,
    deliveryOtpSentAt: Date,
    deliveryOtpExpiresAt: Date,
    deliveryOtpVerifiedAt: Date,
    // 🔴 DELIVERY SCHEDULE FOR REAL-TIME FRONTEND UPDATES
    deliverySchedule: {
        date: Date,
        time: String,
        scheduledAt: Date,
        estimatedDays: Number,
        estimatedDelivery: Date,
        deliveryAgent: String,
        riderPhone: String,
        locationName: String,
        latitude: Number,
        longitude: Number
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
                estimatedDelivery: Date,
                deliveryAgent: String,
                riderPhone: String,
                locationName: String,
                latitude: Number,
                longitude: Number
            },
            adminNote: String,
            deliveryAgent: String,
            riderPhone: String,
            locationName: String,
            latitude: Number,
            longitude: Number,
            deliveryOtp: String,
            deliveryOtpExpiresAt: Date,
            deliveryOtpVerifiedAt: Date
        }
    ],
    // 🔴 CANCELLATION FIELDS
    cancellation: {
        status: {
            type: String,
            enum: ['NOT_CANCELLED', 'REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED'],
            default: 'NOT_CANCELLED'
        },
        requestedAt: { type: Date, default: null },
        approvedAt: { type: Date, default: null },
        reason: { type: String, default: null },
        cancelledBy: { 
            type: String, 
            enum: ['USER', 'ADMIN', 'SYSTEM'],
            default: null
        },
        adminNotes: { type: String, default: null },
        rejectionReason: { type: String, default: null }
    },
    // 🔴 REFUND FIELDS (For online payments)
    refund: {
        status: {
            type: String,
            enum: ['NOT_APPLICABLE', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIALLY_REFUNDED'],
            default: 'NOT_APPLICABLE'
        },
        amount: { type: Number, default: 0 },
        method: { 
            type: String,
            enum: ['ORIGINAL_PAYMENT_METHOD', 'WALLET', 'STORE_CREDIT'],
            default: null
        },
        razorpayRefundId: { type: String, default: null },
        processedAt: { type: Date, default: null },
        initiatedAt: { type: Date, default: null },
        failureReason: { type: String, default: null },
        adminNotes: { type: String, default: null }
    },
    // 🔴 RETURN FIELDS
    return: {
        status: {
            type: String,
            enum: ['NOT_INITIATED', 'REQUESTED', 'APPROVED', 'REJECTED', 'PICKED_UP', 'IN_TRANSIT', 'RECEIVED', 'INSPECTED', 'REFUND_COMPLETED', 'REFUND_FAILED'],
            default: 'NOT_INITIATED'
        },
        requestedAt: { type: Date, default: null },
        approvedAt: { type: Date, default: null },
        pickupDate: { type: Date, default: null },
        deliveredBackDate: { type: Date, default: null },
        reason: { type: String, default: null },
        condition: {
            type: String,
            enum: ['UNOPENED', 'OPENED_UNUSED', 'USED', 'DAMAGED', 'NOT_SPECIFIED'],
            default: 'NOT_SPECIFIED'
        },
        description: { type: String, default: null },
        returnTrackingId: { type: String, default: null },
        pickupAgent: { type: String, default: null },
        adminInspectionNotes: { type: String, default: null },
        returnRefundAmount: { type: Number, default: 0 },
        rejectionReason: { type: String, default: null }
    },
    // 🔴 CANCELLATION POLICY CONFIG
    cancellationPolicy: {
        canCancelUntilMinutes: { type: Number, default: null },
        cancellableStatuses: { type: [String], default: ['Order Placed', 'Confirmed', 'Packed'] },
        isAutoExpired: { type: Boolean, default: false },
        expiredAt: { type: Date, default: null }
    },
    orderDate: { type: Date, default: Date.now }
}, { timestamps: true });

// Additional indexes to support admin filters and user order lookups
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
