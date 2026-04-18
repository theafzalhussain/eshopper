const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [
        {
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
            quantity: { type: Number, default: 1 },
            price: { type: Number, default: 0 },
            size: { type: String, required: true },
            color: { type: String, required: true },
        }
    ],
    savedItems: [
        {
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
            quantity: { type: Number, default: 1 },
            price: { type: Number, default: 0 },
                size: { type: String, required: false },
                color: { type: String, required: false },
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