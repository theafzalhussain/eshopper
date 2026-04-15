const Wishlist = require('../models/Wishlist');
const mongoose = require('mongoose');

// Add to wishlist
exports.addToWishlist = async (req, res) => {
  try {
    const { user, product, size, color, price, pic, name } = req.body;
    console.log('[WISHLIST] addToWishlist payload:', req.body);
    if (!user || !product) {
      console.error('[WISHLIST] 400 error: User or Product missing', { user, product });
      return res.status(400).json({ success: false, message: 'User and Product required.' });
    }
    let wishlist = await Wishlist.findOne({ user: new mongoose.Types.ObjectId(user) });
    if (!wishlist) {
      wishlist = await Wishlist.create({ user: new mongoose.Types.ObjectId(user), products: [] });
    }
    // Check if product with same size and color already exists
    const exists = wishlist.products.find(p =>
      p.product?.toString() === product &&
      p.size === size &&
      p.color === color
    );
    if (exists) {
      return res.status(200).json({ success: true, message: 'Already in wishlist.' });
    }
    wishlist.products.push({ product, size, color, price, pic, name });
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
    const user = req.query.user || req.body.user;
    if (!user) return res.status(400).json({ success: false, message: 'User required.' });
    let wishlist = await Wishlist.findOne({ user: new mongoose.Types.ObjectId(user) });
    if (!wishlist) return res.json([]);
    res.json(wishlist.products || []);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch wishlist.' });
  }
};

// Remove from wishlist
exports.removeFromWishlist = async (req, res) => {
  try {
    const user = req.body.user || req.query.user;
    const { id } = req.params;
    let wishlist = await Wishlist.findOne({ user: new mongoose.Types.ObjectId(user) });
    if (!wishlist) return res.status(404).json({ success: false, message: 'Wishlist not found.' });
    wishlist.products = wishlist.products.filter(p => p._id.toString() !== id);
    await wishlist.save();
    res.json({ success: true, message: 'Removed from wishlist.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to remove from wishlist.' });
  }
};
