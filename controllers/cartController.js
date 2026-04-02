// Add item to cart (POST /api/cart)
exports.addToCart = async (req, res) => {
    try {
        const { userId, productId, quantity, price } = req.body;
        if (!userId || !productId) {
            return res.status(400).json({ success: false, message: 'User ID and Product ID required.' });
        }
        const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
        const normalizedPrice = Number(price || 0);
        let cart = await Cart.findOne({ user: new mongoose.Types.ObjectId(userId) });
        if (!cart) {
            cart = await Cart.create({ user: new mongoose.Types.ObjectId(userId), items: [] });
        }
        // Check if product already exists in cart
        const existingItem = cart.items.find(item => item.product.toString() === productId);
        if (existingItem) {
            existingItem.quantity += qty;
            if (normalizedPrice > 0) existingItem.price = normalizedPrice;
        } else {
            cart.items.push({ product: productId, quantity: qty, price: normalizedPrice > 0 ? normalizedPrice : 0 });
        }
        await cart.save();
        cart = await Cart.findById(cart._id).populate('items.product');
        // Map cart items to frontend-friendly format
        const mappedCart = {
            _id: cart._id,
            user: cart.user,
            items: cart.items.map(item => ({
                _id: item._id,
                productid: item.product?._id || item.product,
                userid: cart.user,
                name: item.product?.name || '',
                color: item.product?.color || '',
                size: item.product?.size || '',
                price: Number(item.price || item.product?.finalprice || item.product?.price || 0),
                quantity: item.quantity,
                pic: item.product?.pic1 || '',
            })),
            createdAt: cart.createdAt
        };
        res.json({ success: true, cart: mappedCart });
    } catch (err) {
        console.error('[ERROR] /api/cart (addToCart):', err);
        res.status(500).json({ success: false, message: 'Failed to add item to cart.' });
    }
};
// Apply promo code to cart (POST /api/cart/apply-coupon)
exports.applyCoupon = async (req, res) => {
    try {
        const { userId, coupon } = req.body;
        if (!userId || !coupon) return res.status(400).json({ success: false, message: 'User ID and coupon required.' });
        if (!mongoose.Types.ObjectId.isValid(String(userId))) {
            return res.status(400).json({ success: false, message: 'Invalid user id.' });
        }

        await ensureDefaultCoupons();

        // Fetch cart for user
        let cart = await Cart.findOne({ user: new mongoose.Types.ObjectId(userId) }).populate('items.product');
        if (!cart) return res.status(404).json({ success: false, message: 'Cart not found.' });
        let subtotal = 0;
        cart.items.forEach(item => {
            subtotal += ((item.product?.finalprice || item.product?.price || 0) * item.quantity);
        });

        const code = String(coupon).trim().toUpperCase();
        const couponDoc = await Coupon.findOne({ code, isActive: true });
        if (!couponDoc) {
            return res.status(400).json({ success: false, message: 'Invalid coupon code.' });
        }

        const now = new Date();
        if (couponDoc.startsAt && now < couponDoc.startsAt) {
            return res.status(400).json({ success: false, message: 'Coupon is not active yet.' });
        }
        if (couponDoc.expiresAt && now > couponDoc.expiresAt) {
            return res.status(400).json({ success: false, message: 'Coupon has expired.' });
        }
        if (subtotal < Number(couponDoc.minCartValue || 0)) {
            return res.status(400).json({
                success: false,
                message: `Minimum cart value Rs${couponDoc.minCartValue} required for this coupon.`
            });
        }

        if (Number(couponDoc.totalUsageCap || 0) > 0) {
            const totalUsed = await Order.countDocuments({ couponCode: couponDoc.code });
            if (totalUsed >= Number(couponDoc.totalUsageCap)) {
                return res.status(400).json({ success: false, message: 'Coupon usage limit reached.' });
            }
        }

        if (couponDoc.perUserOnce) {
            const userUsed = await Order.countDocuments({ userid: String(userId), couponCode: couponDoc.code });
            if (userUsed > 0) {
                return res.status(400).json({ success: false, message: 'You have already used this coupon.' });
            }
        }

        if (couponDoc.firstOrderOnly) {
            const completedOrders = await Order.countDocuments({ userid: String(userId) });
            if (completedOrders > 0) {
                return res.status(400).json({ success: false, message: 'This coupon is valid only on first order.' });
            }
        }

        let discount = 0;
        if (couponDoc.type === 'percent') {
            discount = Math.round((subtotal * Number(couponDoc.value || 0)) / 100);
            if (Number(couponDoc.maxDiscount || 0) > 0) {
                discount = Math.min(discount, Number(couponDoc.maxDiscount));
            }
        } else {
            discount = Math.round(Number(couponDoc.value || 0));
        }

        discount = Math.max(0, Math.min(discount, subtotal));

        return res.json({
            success: true,
            discount,
            message: 'Coupon applied successfully.',
            coupon: {
                code: couponDoc.code,
                title: couponDoc.title,
                description: couponDoc.description,
                type: couponDoc.type,
                value: couponDoc.value,
                minCartValue: couponDoc.minCartValue,
                maxDiscount: couponDoc.maxDiscount,
                perUserOnce: couponDoc.perUserOnce,
                totalUsageCap: couponDoc.totalUsageCap,
                firstOrderOnly: couponDoc.firstOrderOnly,
            }
        });
    } catch (err) {
        console.error('[ERROR] /api/cart/apply-coupon:', err);
        res.status(500).json({ success: false, message: 'Failed to apply coupon.' });
    }
};

// List currently active coupons so frontend can show users what to apply
exports.getAvailableCoupons = async (req, res) => {
    try {
        await ensureDefaultCoupons();
        const userId = req.query.userId;
        const now = new Date();
        const coupons = await Coupon.find({ isActive: true }).sort({ createdAt: -1 });

        const activeCoupons = [];
        for (const c of coupons) {
            if (c.startsAt && now < c.startsAt) continue;
            if (c.expiresAt && now > c.expiresAt) continue;

            if (Number(c.totalUsageCap || 0) > 0) {
                const totalUsed = await Order.countDocuments({ couponCode: c.code });
                if (totalUsed >= Number(c.totalUsageCap)) continue;
            }

            if (userId) {
                if (c.perUserOnce) {
                    const userUsed = await Order.countDocuments({ userid: String(userId), couponCode: c.code });
                    if (userUsed > 0) continue;
                }

                if (c.firstOrderOnly) {
                    const completedOrders = await Order.countDocuments({ userid: String(userId) });
                    if (completedOrders > 0) continue;
                }
            }

            activeCoupons.push({
                code: c.code,
                title: c.title,
                description: c.description,
                type: c.type,
                value: c.value,
                minCartValue: c.minCartValue,
                maxDiscount: c.maxDiscount,
                perUserOnce: c.perUserOnce,
                totalUsageCap: c.totalUsageCap,
                firstOrderOnly: c.firstOrderOnly,
            });
        }

        return res.json({ success: true, coupons: activeCoupons });
    } catch (err) {
        console.error('[ERROR] /api/cart/coupons:', err);
        return res.status(500).json({ success: false, coupons: [], message: 'Failed to fetch coupons.' });
    }
};
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const Order = require('../models/Order');
const mongoose = require('mongoose');

const DEFAULT_COUPONS = [
    {
        code: 'ESHOPPER10',
        title: 'Flat Rs100 Off',
        description: 'Flat Rs100 off on cart value above Rs1000',
        type: 'flat',
        value: 100,
        minCartValue: 1000,
        isActive: true,
    },
    {
        code: 'LUXE15',
        title: '15% Off',
        description: '15% off up to Rs500 on cart value above Rs2000',
        type: 'percent',
        value: 15,
        minCartValue: 2000,
        maxDiscount: 500,
        isActive: true,
    },
];

async function ensureDefaultCoupons() {
    const count = await Coupon.countDocuments();
    if (count > 0) return;
    await Coupon.insertMany(DEFAULT_COUPONS);
}

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
        // Map cart items to frontend-friendly format
        const mappedCart = cart ? {
            _id: cart._id,
            user: cart.user,
            items: cart.items.map(item => ({
                _id: item._id,
                productid: item.product?._id || item.product,
                userid: cart.user,
                name: item.product?.name || '',
                color: item.product?.color || '',
                size: item.product?.size || '',
                price: Number(item.price || item.product?.finalprice || item.product?.price || 0),
                quantity: item.quantity,
                pic: item.product?.pic1 || '',
            })),
            createdAt: cart.createdAt
        } : null;
        res.json({ success: true, cart: mappedCart });
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
        cart = await Cart.findOne({ user: new mongoose.Types.ObjectId(userId) }).populate('items.product');
        const mappedCart = cart ? {
            _id: cart._id,
            user: cart.user,
            items: cart.items.map(item => ({
                _id: item._id,
                productid: item.product?._id || item.product,
                userid: cart.user,
                name: item.product?.name || '',
                color: item.product?.color || '',
                size: item.product?.size || '',
                price: item.product?.finalprice || item.product?.price || 0,
                quantity: item.quantity,
                pic: item.product?.pic1 || '',
            })),
            createdAt: cart.createdAt
        } : null;
        res.json({ success: true, cart: mappedCart });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update quantity.' });
    }
};

// Remove an item from cart
exports.removeItem = async (req, res) => {
    try {
        const userId = req.user?._id || req.body?.userId || req.body?.userid || req.query?.userId || req.query?.userid;
        const { itemId } = req.params;
        if (!itemId) return res.status(400).json({ success: false, message: 'Missing item id.' });

        const queryByUser = (userId && mongoose.Types.ObjectId.isValid(String(userId)))
            ? { user: new mongoose.Types.ObjectId(userId) }
            : {};

        let cart = null;

        if (mongoose.Types.ObjectId.isValid(String(itemId))) {
            const oid = new mongoose.Types.ObjectId(itemId);

            // 1) Try remove by cart sub-item id.
            cart = await Cart.findOneAndUpdate(
                { ...queryByUser, 'items._id': oid },
                { $pull: { items: { _id: oid } } },
                { new: true }
            );

            // 2) Fallback remove by product id (legacy/frontend id mismatches).
            if (!cart) {
                cart = await Cart.findOneAndUpdate(
                    { ...queryByUser, 'items.product': oid },
                    { $pull: { items: { product: oid } } },
                    { new: true }
                );
            }
        }

        if (!cart) {
            return res.status(404).json({ success: false, message: 'Item not found in cart.' });
        }

        res.json({ success: true, message: 'Item removed from cart.', cartId: cart._id, itemCount: cart.items.length });
    } catch (err) {
        console.error('[ERROR] /api/cart/remove-item:', err);
        res.status(500).json({ success: false, message: 'Failed to remove item.', error: err.message });
    }
};

// Get order summary for current cart
exports.getOrderSummary = async (req, res) => {
    try {
        const userId = req.user?._id || req.query.userId;
        if (!userId) return res.status(400).json({ success: false, message: 'User ID required.' });
        const user = await require('../models/User').findById(userId).select('membershipType totalOrders');
        let cart = await Cart.findOne({ user: new mongoose.Types.ObjectId(userId) }).populate('items.product');
        if (!cart) return res.json({ success: true, summary: { subtotal: 0, discount: 0, shipping: 0, gst: 0, grandTotal: 0 } });
        let subtotal = 0;
        cart.items.forEach(item => {
            subtotal += ((item.price || item.product?.finalprice || item.product?.price || 0) * item.quantity);
        });
        // Luxury logic: 10% discount if subtotal > 2000
        let discount = subtotal > 2000 ? Math.round(subtotal * 0.1) : 0;
        // Shipping: FREE for Elite users, otherwise free if subtotal >= 2000, else 150
        const isElite = String(user?.membershipType || '').toLowerCase() === 'elite';
        let shipping = isElite ? 0 : (subtotal >= 2000 ? 0 : (subtotal > 0 ? 150 : 0));
        // GST: 5% on (subtotal - discount)
        let gst = Math.round((subtotal - discount) * 0.05);
        let grandTotal = subtotal - discount + shipping + gst;
        res.json({ success: true, summary: { subtotal, discount, shipping, gst, grandTotal } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to get summary.' });
    }
};
