const Wishlist = require('../models/Wishlist');
const mongoose = require('mongoose');

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

    let wishlist = await Wishlist.findOne(query).populate('products.product');
    if (!wishlist) return res.json([]);

    // Map products to ensure they never appear blank even if old data is broken
    const mappedProducts = wishlist.products.map(p => {
        const obj = p.toObject();
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
    const user = req.body.user || req.query.user || req.body.userId || req.body.userid;
    const { id } = req.params;

    const query = mongoose.Types.ObjectId.isValid(user) 
        ? { $or: [{ user: new mongoose.Types.ObjectId(user) }, { userid: user }] }
        : { userid: user };

    let wishlist = await Wishlist.findOne(query);
    if (!wishlist) return res.status(404).json({ success: false, message: 'Wishlist not found.' });

    wishlist.products = wishlist.products.filter(p => String(p._id) !== String(id) && String(p.product) !== String(id) && String(p.productid) !== String(id));
    await wishlist.save();
    res.json({ success: true, message: 'Removed from wishlist.' });
  } catch (err) {
    console.error('[WISHLIST] removeFromWishlist error:', err);
    res.status(500).json({ success: false, message: 'Failed to remove from wishlist.' });
  }
};
