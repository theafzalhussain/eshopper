const mongoose = require('mongoose');

const checkoutSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    cart: { type: mongoose.Schema.Types.ObjectId, ref: 'Cart' },
    address: { type: String },
    paymentStatus: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Checkout', checkoutSchema);