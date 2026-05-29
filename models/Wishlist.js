const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, index: true },
    userid: { type: String, index: true },
    products: [
        {
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: false },
            productid: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
            size: { type: String, default: '' },
            color: { type: String, default: '' },
            price: { type: Number, default: 0 },
            pic: { type: String, default: '' },
            pic1: { type: String, default: '' },
            name: { type: String, default: '' },
            quantity: { type: Number, default: 1 },
            qty: { type: Number, default: 1 }
        }
    ],
    createdAt: { type: Date, default: Date.now }
}, { strict: false, timestamps: true });

module.exports = mongoose.models.Wishlist || mongoose.model('Wishlist', wishlistSchema);