const Wishlist = require('../models/Wishlist');
const mongoose = require('mongoose');
const { logActivity } = require('../utils/activityLogger');

// Add to wishlist
exports.addToWishlist = async (req, res) => {
  try {
    const userId = req.body.user || req.body.userId || req.body.userid;
    let productId = req.body.product || req.body.productId || req.body.productid;
    
    if (productId && typeof productId === 'object') {
        productId = productId._id || productId.id || String(productId);
    }

    const { size, color, price, pic, pic1, name, quantity, qty } = req.body;
    
    console.log('[WISHLIST] addToWishlist payload:', req.body);
    if (!userId || !productId) {
      console.error('[WISHLIST] 400 error: User or Product missing', { userId, productId });
      return res.status(400).json({ success: false, message: 'User and Product required.' });
    }

    const query = mongoose.Types.ObjectId.isValid(userId) 
        ? { $or: [{ user: new mongoose.Types.ObjectId(userId) }, { userid: userId }] }
        : { userid: userId };

    let wishlist = await Wishlist.findOne(query);
    if (!wishlist) {
      wishlist = new Wishlist({ user: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : undefined, userid: userId, products: [] });
    }
    // Check if product with same size and color already exists
    const exists = wishlist.products.find(p =>
      (String(p.product) === String(productId) || String(p.productid) === String(productId)) &&
      p.size === size &&
      p.color === color
    );
    if (exists) {
      return res.status(200).json({ success: true, message: 'Already in wishlist.' });
    }
    wishlist.products.push({ 
      product: mongoose.Types.ObjectId.isValid(productId) ? new mongoose.Types.ObjectId(productId) : undefined,
      productid: productId, size: size || '', color: color || '', 
      price: Number(price || 0), pic: pic || pic1 || '', pic1: pic1 || pic || '', name: name || '',
      quantity: Number(quantity || qty || 1),
      qty: Number(quantity || qty || 1)
    });
    await wishlist.save();
    await logActivity(req, {
      action: 'Wishlist item added',
      userId,
      meta: { productId, size, color, quantity: Number(quantity || qty || 1) }
    });
    res.json({ success: true, message: 'Added to wishlist.' });
  } catch (err) {
    console.error('[WISHLIST] 500 error:', err);
    res.status(500).json({ success: false, message: 'Failed to add to wishlist.' });
  }
};

// Get wishlist
exports.getWishlist = async (req, res) => {
  try {
    const user = req.query.user || req.body.user || req.query.userId || req.query.userid;
    if (!user) return res.status(400).json({ success: false, message: 'User required.' });

    const query = mongoose.Types.ObjectId.isValid(user) 
        ? { $or: [{ user: new mongoose.Types.ObjectId(user) }, { userid: user }] }
        : { userid: user };

    let wishlist = await Wishlist.findOne(query).populate('products.product', 'name finalprice price pic1').lean();
    if (!wishlist) return res.json([]);

    // Map products to ensure they never appear blank even if old data is broken
    const mappedProducts = (wishlist.products || []).map(p => {
        // Since we used .lean(), 'p' is already a plain object, we don't need .toObject()
        const obj = typeof p.toObject === 'function' ? p.toObject() : p;
        const flatId = obj.product?._id || obj.product || obj.productid || obj.productId;
        return {
            ...obj,
            product: flatId,
            productid: flatId,
            productId: flatId,
            name: obj.name || obj.product?.name || 'Product',
            pic: obj.pic || obj.pic1 || obj.product?.pic1 || '/assets/images/noimage.png',
            price: Number(obj.price || obj.product?.finalprice || obj.product?.price || 0)
        };
    });

    res.json(mappedProducts || []);
  } catch (err) {
    console.error('[WISHLIST] getWishlist error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch wishlist.' });
  }
};

// Remove from wishlist
exports.removeFromWishlist = async (req, res) => {
  try {
    let user = req.body.user || req.query.user || req.body.userId || req.body.userid || req.query.userId || req.query.userid;
    const { id } = req.params;

    const shouldRemoveItem = (item) => {
      return String(item?._id) === String(id) || String(item?.product) === String(id) || String(item?.productid) === String(id);
    };

    // Fallback: try Authorization header (frontend stores userid as bearer token)
    if (!user) {
      const authHeader = String(req.headers.authorization || req.headers.Authorization || '').trim();
      if (authHeader.toLowerCase().startsWith('bearer ')) {
        user = authHeader.split(' ')[1];
      } else if (req.headers['x-admin-userid']) {
        user = String(req.headers['x-admin-userid']);
      } else if (req.user && (req.user.sub || req.user._id || req.user.id)) {
        user = req.user.sub || req.user._id || req.user.id;
      }
    }

    const query = mongoose.Types.ObjectId.isValid(user) 
        ? { $or: [{ user: new mongoose.Types.ObjectId(user) }, { userid: user }] }
        : { userid: user };

    console.log('[WISHLIST] removeFromWishlist params:', { user, id });
    let wishlist = await Wishlist.findOne(query);

    // If no user-specific wishlist is found, fall back to removing the item from any wishlist that contains it.
    if (!wishlist) {
      const matchedWishlists = await Wishlist.find({
        $or: [
          { 'products._id': id },
          { 'products.product': mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id },
          { 'products.productid': mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id },
          { 'products.productid': id }
        ]
      });

      let modifiedCount = 0;
      for (const doc of matchedWishlists) {
        const before = doc.products.length;
        doc.products = doc.products.filter((item) => !shouldRemoveItem(item));
        if (doc.products.length !== before) {
          await doc.save();
          modifiedCount += 1;
        }
      }

      console.log('[WISHLIST] global removal result:', { matched: matchedWishlists.length, modified: modifiedCount });
      if (modifiedCount > 0) {
        await logActivity(req, {
          action: 'Wishlist item removed (global)',
          userId: user,
          meta: { itemId: id }
        });
        return res.json({ success: true, message: 'Removed from wishlist.' });
      }

      return res.status(404).json({ success: false, message: 'Wishlist not found.' });
    }

    wishlist.products = wishlist.products.filter((item) => !shouldRemoveItem(item));
    await wishlist.save();
    await logActivity(req, {
      action: 'Wishlist item removed',
      userId: user,
      meta: { itemId: id }
    });
    res.json({ success: true, message: 'Removed from wishlist.' });
  } catch (err) {
    console.error('[WISHLIST] removeFromWishlist error:', err);
    res.status(500).json({ success: false, message: 'Failed to remove from wishlist.' });
  }
};
