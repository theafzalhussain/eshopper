const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, index: true },
    userid: { type: String, index: true },
    items: [
        {
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: false },
            productid: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
            quantity: { type: Number, default: 1 },
            qty: { type: Number, default: 1 },
            price: { type: Number, default: 0 },
            size: { type: String, default: '' },
            color: { type: String, default: '' },
            name: { type: String, default: '' },
            pic: { type: String, default: '' },
            pic1: { type: String, default: '' }
        }
    ],
    savedItems: [
        {
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
            productid: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
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
}, { strict: false, timestamps: true });

module.exports = mongoose.models.Cart || mongoose.model('Cart', cartSchema);