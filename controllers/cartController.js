// Add item to cart (POST /api/cart)
exports.addToCart = async (req, res) => {
    try {
        const { userId, productId, quantity, price, size, color } = req.body;
        if (!userId || !productId) {
            return res.status(400).json({ success: false, message: 'User ID and Product ID required.' });
        }
        if (!size || !color) {
            return res.status(400).json({ success: false, message: 'Size and color are required.' });
        }
        const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
        const normalizedPrice = Number(price || 0);
        let cart = await Cart.findOne({ user: new mongoose.Types.ObjectId(userId) });
        if (!cart) {
            cart = await Cart.create({ user: new mongoose.Types.ObjectId(userId), items: [] });
        }
        // Check if product with same size and color exists in cart
        const existingItem = cart.items.find(item =>
            item.product.toString() === productId &&
            String(item.size) === String(size || '') &&
            String(item.color) === String(color || '')
        );
        if (existingItem) {
            existingItem.quantity += qty;
            if (normalizedPrice > 0) existingItem.price = normalizedPrice;
        } else {
            cart.items.push({
                product: productId,
                quantity: qty,
                price: normalizedPrice > 0 ? normalizedPrice : 0,
                size: size || '',
                color: color || ''
            });
        }
        await cart.save();
        cart = await Cart.findById(cart._id).populate('items.product').populate('savedItems.product');
        const mappedCart = mapCartForClient(cart);
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

const formatDeliveryLabel = (dateValue) => {
    if (!dateValue) return '';
    const dt = new Date(dateValue);
    if (Number.isNaN(dt.getTime())) return '';
    const label = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
    }).format(dt);
    return `Delivery by ${label}`;
};

const buildMockDeliveryDate = (pincode = '') => {
    const digits = String(pincode).replace(/\D/g, '').split('').map(Number);
    const sum = digits.reduce((acc, val) => acc + Number(val || 0), 0);
    const etaDays = 2 + (sum % 5);
    const result = new Date();
    result.setHours(0, 0, 0, 0);
    result.setDate(result.getDate() + etaDays);
    return result;
};

// Validate pincode using real India Post API with strict checks
const validatePincodeWithAPI = async (pincode) => {
    try {
        const normalized = String(pincode).trim();
        
        // Reject dummy/placeholder pincodes
        if (/^0+$/.test(normalized) || /^1+$/.test(normalized) || /^9+$/.test(normalized)) {
            console.log(`Rejected dummy pincode: ${normalized}`);
            return false;
        }
        
        console.log(`Starting validation for pincode: ${normalized}`);
        
        // Call India Post API with simple timeout
        let response;
        try {
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('API timeout')), 6000)
            );
            const fetchPromise = fetch(`https://api.postalpincode.in/pincode/${normalized}`);
            response = await Promise.race([fetchPromise, timeoutPromise]);
        } catch (timeoutErr) {
            console.error(`Pincode ${normalized}: API timeout or failed`);
            return false;
        }
        
        if (!response.ok) {
            console.error(`Pincode ${normalized}: API returned status ${response.status}`);
            return false;
        }
        
        const data = await response.json();
        console.log(`API Response for ${normalized}:`, data);
        
        // Strict validation: must have Status "Success"
        if (!Array.isArray(data) || data.length === 0) {
            console.log(`Pincode ${normalized}: No data in response`);
            return false;
        }
        
        const result = data[0];
        
        // Check if status is Success AND has actual location data
        const isValid = result?.Status === 'Success' && 
                       result?.PostOffice && 
                       Array.isArray(result.PostOffice) && 
                       result.PostOffice.length > 0;
        
        console.log(`Pincode ${normalized} validation: ${isValid ? 'VALID ✓' : 'INVALID ✗'}`, {
            Status: result?.Status,
            PostOffices: result?.PostOffice?.length || 0,
            District: result?.PostOffice?.[0]?.District
        });
        
        return isValid;
    } catch (error) {
        console.error(`Pincode validation error for ${pincode}:`, error.message);
        return false;
    }
};

const mapCartItem = (item, userId) => ({
    _id: item._id,
    productid: item.product?._id || item.product,
    userid: userId,
    name: item.product?.name || '',
    color: item.color || item.product?.color || '',
    size: item.size || item.product?.size || '',
    price: Number(item.price || item.product?.finalprice || item.product?.price || 0),
    quantity: Number(item.quantity || 1),
    pic: item.product?.pic1 || '',
});

const mapCartForClient = (cart) => {
    if (!cart) return null;
    const deliveryEstimateLabel = formatDeliveryLabel(cart.deliveryEstimate?.estimatedDate);
    return {
        _id: cart._id,
        user: cart.user,
        items: Array.isArray(cart.items) ? cart.items.map((item) => mapCartItem(item, cart.user)) : [],
        savedItems: Array.isArray(cart.savedItems) ? cart.savedItems.map((item) => ({
            ...mapCartItem(item, cart.user),
            savedAt: item.savedAt || null,
        })) : [],
        deliveryEstimate: {
            pincode: cart.deliveryEstimate?.pincode || '',
            estimatedDate: cart.deliveryEstimate?.estimatedDate || null,
            label: deliveryEstimateLabel,
        },
        deliveryEstimateLabel,
        createdAt: cart.createdAt,
    };
};

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
            cart = await Cart.findOne({ user: new mongoose.Types.ObjectId(userId) }).populate('items.product').populate('savedItems.product');
        } catch (dbErr) {
            console.error('[ERROR] /api/cart: Invalid userId or DB error:', dbErr);
            return res.status(400).json({ success: false, message: 'Invalid userId or database error.' });
        }
        if (!cart) {
            // Auto-create cart for new user
            try {
                cart = await Cart.create({ user: new mongoose.Types.ObjectId(userId), items: [] });
                cart = await Cart.findOne({ user: new mongoose.Types.ObjectId(userId) }).populate('items.product').populate('savedItems.product');
                console.log(`[INFO] /api/cart: Created new cart for userId ${userId}`);
            } catch (createErr) {
                console.error('[ERROR] /api/cart: Failed to create cart:', createErr);
                return res.status(500).json({ success: false, message: 'Failed to create cart for user.' });
            }
        }
        const mappedCart = mapCartForClient(cart);
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
        cart = await Cart.findOne({ user: new mongoose.Types.ObjectId(userId) }).populate('items.product').populate('savedItems.product');
        const mappedCart = mapCartForClient(cart);
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

exports.saveForLater = async (req, res) => {
    try {
        const userId = req.user?._id || req.body?.userId || req.body?.userid || req.query?.userId || req.query?.userid;
        const { itemId } = req.params;
        if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) {
            return res.status(400).json({ success: false, message: 'Valid user id required.' });
        }
        if (!itemId || !mongoose.Types.ObjectId.isValid(String(itemId))) {
            return res.status(400).json({ success: false, message: 'Valid item id required.' });
        }

        const cart = await Cart.findOne({ user: new mongoose.Types.ObjectId(userId) });
        if (!cart) return res.status(404).json({ success: false, message: 'Cart not found.' });

        let srcItem = cart.items.id(itemId);
        if (!srcItem && mongoose.Types.ObjectId.isValid(String(itemId))) {
            srcItem = cart.items.find((entry) => String(entry.product) === String(itemId));
        }
        if (!srcItem) return res.status(404).json({ success: false, message: 'Cart item not found.' });

        const existingSaved = cart.savedItems.find((entry) => String(entry.product) === String(srcItem.product) && entry.size === srcItem.size && entry.color === srcItem.color);
        if (!srcItem.size || !srcItem.color) {
            return res.status(400).json({ success: false, message: 'Size and color are required to save for later.' });
        }
        if (existingSaved) {
            existingSaved.quantity += Number(srcItem.quantity || 1);
            if (Number(srcItem.price || 0) > 0) existingSaved.price = Number(srcItem.price || 0);
        } else {
            cart.savedItems.push({
                product: srcItem.product,
                quantity: Number(srcItem.quantity || 1),
                price: Number(srcItem.price || 0),
                size: srcItem.size,
                color: srcItem.color,
                savedAt: new Date(),
            });
        }

        srcItem.deleteOne();
        await cart.save();

        const freshCart = await Cart.findById(cart._id).populate('items.product').populate('savedItems.product');
        return res.json({ success: true, message: 'Item saved for later.', cart: mapCartForClient(freshCart) });
    } catch (err) {
        console.error('[ERROR] /api/cart/save-for-later:', err);
        return res.status(500).json({ success: false, message: 'Failed to save item for later.' });
    }
};

exports.moveSavedToCart = async (req, res) => {
    try {
        const userId = req.user?._id || req.body?.userId || req.body?.userid || req.query?.userId || req.query?.userid;
        const { itemId } = req.params;
        if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) {
            return res.status(400).json({ success: false, message: 'Valid user id required.' });
        }
        if (!itemId || !mongoose.Types.ObjectId.isValid(String(itemId))) {
            return res.status(400).json({ success: false, message: 'Valid saved item id required.' });
        }

        const cart = await Cart.findOne({ user: new mongoose.Types.ObjectId(userId) });
        if (!cart) return res.status(404).json({ success: false, message: 'Cart not found.' });

        let savedItem = cart.savedItems.id(itemId);
        if (!savedItem && mongoose.Types.ObjectId.isValid(String(itemId))) {
            savedItem = cart.savedItems.find((entry) => String(entry.product) === String(itemId));
        }
        if (!savedItem) return res.status(404).json({ success: false, message: 'Saved item not found.' });

        const finalSize = savedItem.size || req.body.size;
        const finalColor = savedItem.color || req.body.color;
        if (!finalSize || !finalColor) {
            return res.status(400).json({ success: false, message: 'Size and color are required to move item to cart.' });
        }
        // Find exact match (product + size + color)
        const existingCartItem = cart.items.find((entry) =>
            String(entry.product) === String(savedItem.product) &&
            String(entry.size) === String(finalSize) &&
            String(entry.color) === String(finalColor)
        );
        if (existingCartItem) {
            existingCartItem.quantity += Number(savedItem.quantity || 1);
            if (Number(savedItem.price || 0) > 0) existingCartItem.price = Number(savedItem.price || 0);
        } else {
            cart.items.push({
                product: savedItem.product,
                quantity: Number(savedItem.quantity || 1),
                price: Number(savedItem.price || 0),
                size: finalSize,
                color: finalColor
            });
        }

        savedItem.deleteOne();
        await cart.save();

        const freshCart = await Cart.findById(cart._id).populate('items.product').populate('savedItems.product');
        return res.json({ success: true, message: 'Saved item moved to cart.', cart: mapCartForClient(freshCart) });
    } catch (err) {
        console.error('[ERROR] /api/cart/move-saved-to-cart:', err);
        return res.status(500).json({ success: false, message: 'Failed to move saved item to cart.' });
    }
};

exports.removeSavedItem = async (req, res) => {
    try {
        const userId = req.user?._id || req.body?.userId || req.body?.userid || req.query?.userId || req.query?.userid;
        const { itemId } = req.params;
        if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) {
            return res.status(400).json({ success: false, message: 'Valid user id required.' });
        }
        if (!itemId || !mongoose.Types.ObjectId.isValid(String(itemId))) {
            return res.status(400).json({ success: false, message: 'Valid saved item id required.' });
        }

        const cart = await Cart.findOneAndUpdate(
            { user: new mongoose.Types.ObjectId(userId), 'savedItems._id': new mongoose.Types.ObjectId(itemId) },
            { $pull: { savedItems: { _id: new mongoose.Types.ObjectId(itemId) } } },
            { new: true }
        ).populate('items.product').populate('savedItems.product');

        if (!cart) {
            return res.status(404).json({ success: false, message: 'Saved item not found.' });
        }

        return res.json({ success: true, message: 'Saved item removed.', cart: mapCartForClient(cart) });
    } catch (err) {
        console.error('[ERROR] /api/cart/remove-saved-item:', err);
        return res.status(500).json({ success: false, message: 'Failed to remove saved item.' });
    }
};

exports.setDeliveryEstimate = async (req, res) => {
    try {
        const userId = req.user?._id || req.body?.userId || req.body?.userid || req.query?.userId || req.query?.userid;
        const { pincode } = req.body || {};
        const normalizedPincode = String(pincode || '').trim();

        console.log(`[DELIVERY] Request for pincode: ${normalizedPincode}, userId: ${userId}`);

        if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) {
            console.log(`[DELIVERY] Invalid userId`);
            return res.status(400).json({ success: false, message: 'Valid user id required.' });
        }
        if (!/^\d{6}$/.test(normalizedPincode)) {
            console.log(`[DELIVERY] Invalid pincode format: ${normalizedPincode}`);
            return res.status(400).json({ success: false, message: 'Please enter a valid 6-digit pincode.' });
        }

        // Validate pincode with real data
        console.log(`[DELIVERY] Validating pincode: ${normalizedPincode}`);
        const isValidPincode = await validatePincodeWithAPI(normalizedPincode);
        console.log(`[DELIVERY] Pincode validation result: ${isValidPincode}`);
        
        if (!isValidPincode) {
            console.log(`[DELIVERY] Pincode ${normalizedPincode} is INVALID - rejecting`);
            return res.status(400).json({ success: false, message: 'This pincode does not exist. Please enter a valid pincode.' });
        }

        console.log(`[DELIVERY] Pincode ${normalizedPincode} is VALID - generating delivery date`);
        const estimatedDate = buildMockDeliveryDate(normalizedPincode);

        let cart = await Cart.findOne({ user: new mongoose.Types.ObjectId(userId) });
        if (!cart) {
            cart = await Cart.create({ user: new mongoose.Types.ObjectId(userId), items: [] });
        }

        cart.deliveryEstimate = {
            pincode: normalizedPincode,
            estimatedDate,
        };
        await cart.save();

        const freshCart = await Cart.findById(cart._id).populate('items.product').populate('savedItems.product');
        const label = formatDeliveryLabel(estimatedDate);

        return res.json({
            success: true,
            message: label,
            estimate: {
                pincode: normalizedPincode,
                estimatedDate,
                label,
            },
            cart: mapCartForClient(freshCart),
        });
    } catch (err) {
        console.error('[ERROR] /api/cart/delivery-estimate:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch delivery estimate.' });
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
