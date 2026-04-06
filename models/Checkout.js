const mongoose = require('mongoose');

const checkoutSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    cart: { type: mongoose.Schema.Types.ObjectId, ref: 'Cart' },
    address: { type: String },
    paymentStatus: { type: String },
    paidAt: { type: Date, default: null },
    razorpayOrderId: { type: String, default: '' },
    razorpayPaymentId: { type: String, default: '' },
    razorpaySignature: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Checkout || mongoose.model('Checkout', checkoutSchema);