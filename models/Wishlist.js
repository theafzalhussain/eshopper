const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    products: [
        {
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
            size: { type: String, default: '' },
            color: { type: String, default: '' },
            price: { type: Number, default: 0 },
            pic: { type: String, default: '' },
            name: { type: String, default: '' }
        }
    ],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Wishlist || mongoose.model('Wishlist', wishlistSchema);