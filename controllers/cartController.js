// Apply promo code to cart (POST /api/cart/apply-coupon)
exports.applyCoupon = async (req, res) => {
    try {
        const { userId, coupon } = req.body;
        if (!userId || !coupon) return res.status(400).json({ success: false, message: 'User ID and coupon required.' });
        // Fetch cart for user
        let cart = await Cart.findOne({ user: new mongoose.Types.ObjectId(userId) }).populate('items.product');
        if (!cart) return res.status(404).json({ success: false, message: 'Cart not found.' });
        let subtotal = 0;
        cart.items.forEach(item => {
            subtotal += (item.product.price || 0) * item.quantity;
        });
        // Example: Only one valid coupon for demo
        if (coupon.trim().toLowerCase() === 'eshopper10') {
            // Flat ₹100 off if subtotal >= 1000
            if (subtotal >= 1000) {
                return res.json({ success: true, discount: 100, message: 'Coupon applied! ₹100 off.' });
            } else {
                return res.status(400).json({ success: false, message: 'Minimum cart value ₹1000 required for this coupon.' });
            }
        } else {
            return res.status(400).json({ success: false, message: 'Invalid coupon code.' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to apply coupon.' });
    }
};
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// Get cart for current user (expects req.user or req.query.userId)
exports.getCart = async (req, res) => {
    try {
        const userId = req.user?._id || req.query.userId;
        console.log('[DEBUG] /api/cart hit. userId:', userId);
        if (!userId) {
            console.error('[ERROR] /api/cart: Missing userId in request');
            return res.status(400).json({ success: false, message: 'User ID required.' });
        }
        let cart;
        try {
            cart = await Cart.findOne({ user: new mongoose.Types.ObjectId(userId) }).populate('items.product');
        } catch (dbErr) {
            console.error('[ERROR] /api/cart: Invalid userId or DB error:', dbErr);
            return res.status(400).json({ success: false, message: 'Invalid userId or database error.' });
        }
        if (!cart) {
            // Auto-create cart for new user
            try {
                cart = await Cart.create({ user: new mongoose.Types.ObjectId(userId), items: [] });
                cart = await Cart.findOne({ user: new mongoose.Types.ObjectId(userId) }).populate('items.product');
                console.log(`[INFO] /api/cart: Created new cart for userId ${userId}`);
            } catch (createErr) {
                console.error('[ERROR] /api/cart: Failed to create cart:', createErr);
                return res.status(500).json({ success: false, message: 'Failed to create cart for user.' });
            }
        }
        res.json({ success: true, cart });
    } catch (err) {
        console.error('[DEBUG] /api/cart error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch cart.' });
    }
};

// Update quantity for a cart item
exports.updateQuantity = async (req, res) => {
    try {
        const userId = req.user?._id || req.body.userId;
        const { itemId } = req.params;
        const { quantity } = req.body;
        if (!userId || !itemId || typeof quantity !== 'number') return res.status(400).json({ success: false, message: 'Missing data.' });
        let cart = await Cart.findOne({ user: new mongoose.Types.ObjectId(userId) }).populate('items.product');
        if (!cart) return res.status(404).json({ success: false, message: 'Cart not found.' });
        const item = cart.items.id(itemId);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });
        // Real-time stock check
        const product = item.product;
        let stock = 0;
        if (product && product.stock !== undefined && product.stock !== null) {
            stock = Number(product.stock);
        }
        if (stock > 0 && quantity > stock) {
            return res.status(400).json({ success: false, message: 'Out of Stock. Only ' + stock + ' left.' });
        }
        item.quantity = quantity;
        await cart.save();
        res.json({ success: true, cart });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update quantity.' });
    }
};

// Remove an item from cart
exports.removeItem = async (req, res) => {
    try {
        const userId = req.user?._id || req.body.userId;
        const { itemId } = req.params;
        if (!userId || !itemId) return res.status(400).json({ success: false, message: 'Missing data.' });
        let cart = await Cart.findOne({ user: new mongoose.Types.ObjectId(userId) });
        if (!cart) return res.status(404).json({ success: false, message: 'Cart not found.' });
        cart.items.id(itemId).remove();
        await cart.save();
        res.json({ success: true, cart });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to remove item.' });
    }
};

// Get order summary for current cart
exports.getOrderSummary = async (req, res) => {
    try {
        const userId = req.user?._id || req.query.userId;
        if (!userId) return res.status(400).json({ success: false, message: 'User ID required.' });
        let cart = await Cart.findOne({ user: new mongoose.Types.ObjectId(userId) }).populate('items.product');
        if (!cart) return res.json({ success: true, summary: { subtotal: 0, discount: 0, shipping: 0, gst: 0, grandTotal: 0 } });
        let subtotal = 0;
        cart.items.forEach(item => {
            subtotal += (item.product.price || 0) * item.quantity;
        });
        // Luxury logic: 10% discount if subtotal > 2000
        let discount = subtotal > 2000 ? Math.round(subtotal * 0.1) : 0;
        // Shipping: FREE if subtotal >= 2000, else 150 if subtotal > 0
        let shipping = subtotal >= 2000 ? 0 : (subtotal > 0 ? 150 : 0);
        // GST: 5% on (subtotal - discount)
        let gst = Math.round((subtotal - discount) * 0.05);
        let grandTotal = subtotal - discount + shipping + gst;
        res.json({ success: true, summary: { subtotal, discount, shipping, gst, grandTotal } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to get summary.' });
    }
};
