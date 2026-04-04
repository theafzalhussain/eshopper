const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [
        {
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
            quantity: { type: Number, default: 1 },
            price: { type: Number, default: 0 },
        }
    ],
    savedItems: [
        {
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
            quantity: { type: Number, default: 1 },
            price: { type: Number, default: 0 },
            savedAt: { type: Date, default: Date.now },
        }
    ],
    deliveryEstimate: {
        pincode: { type: String, default: '' },
        estimatedDate: { type: Date, default: null },
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Cart || mongoose.model('Cart', cartSchema);