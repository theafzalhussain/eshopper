const express = require('express');
const router = express.Router();


const adminController = require('../controllers/adminController');
const orderController = require('../controllers/orderController');
const verifyAdmin = require('../middleware/verifyAdmin');

// Modular admin routes
router.post('/login', adminController.login);

// Protect subsequent admin routes
router.use(verifyAdmin);

router.get('/dashboard', adminController.getDashboard);
router.get('/dashboard-analytics', adminController.getDashboardAnalytics);
router.get('/test-connection', adminController.testConnection);
router.get('/users', adminController.getUsers);
router.get('/activities', adminController.getActivities);
router.get('/orders', adminController.getOrders);

// Order lifecycle management
router.post('/orders/:orderId/cancellation', orderController.adminUpdateOrderCancellation);
router.post('/orders/:orderId/refund', orderController.adminUpdateOrderRefund);
router.post('/orders/:orderId/return', orderController.adminUpdateOrderReturn);
router.post('/orders/:orderId/refund/retry', orderController.adminRetryRefund);

module.exports = router;
