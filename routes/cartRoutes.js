
const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

// Apply coupon to cart
router.post('/cart/apply-coupon', cartController.applyCoupon);

// Get cart for current user
router.get('/cart', cartController.getCart);

// Update quantity for a cart item
router.put('/cart/update-quantity/:itemId', cartController.updateQuantity);

// Remove an item from cart
router.delete('/cart/remove-item/:itemId', cartController.removeItem);

// Get order summary for current cart
router.get('/cart/order-summary', cartController.getOrderSummary);

module.exports = router;
