const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');

// Add to wishlist
router.post('/', wishlistController.addToWishlist);
// Get wishlist
router.get('/', wishlistController.getWishlist);
// Remove from wishlist
router.delete('/:id', wishlistController.removeFromWishlist);

module.exports = router;
