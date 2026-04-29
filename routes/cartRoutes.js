const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

// Add item to cart
router.post('/cart', cartController.addToCart);

// Apply coupon to cart
router.post('/cart/apply-coupon', cartController.applyCoupon);

// List active coupons
router.get('/cart/coupons', cartController.getAvailableCoupons);

// Get cart for current user
router.get('/cart', cartController.getCart);

// Update quantity for a cart item
router.put('/cart/update-quantity/:itemId', cartController.updateQuantity);

// Remove an item from cart
router.delete('/cart/remove-item/:itemId', cartController.removeItem);

// Save-for-later cart actions
router.post('/cart/save-for-later/:itemId', cartController.saveForLater);
router.post('/cart/move-saved-to-cart/:itemId', cartController.moveSavedToCart);
router.delete('/cart/remove-saved-item/:itemId', cartController.removeSavedItem);

// Delivery estimate by pincode
router.post('/cart/delivery-estimate', cartController.setDeliveryEstimate);

// Get order summary for current cart
router.get('/cart/order-summary', cartController.getOrderSummary);

// Update Cart Options (Delivery Speed & Insurance)
router.post('/cart/options', cartController.updateCartOptions);

// Toggle Gift Wrap for an Item
router.put('/cart/item/:itemId', cartController.updateCartItem);

module.exports = router;
