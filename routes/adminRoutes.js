const express = require('express');
const router = express.Router();


const adminController = require('../controllers/adminController');

// Modular admin routes
router.post('/login', adminController.login);
router.get('/dashboard', adminController.getDashboard);
router.get('/dashboard-analytics', adminController.getDashboardAnalytics);
router.get('/test-connection', adminController.testConnection);
router.get('/users', adminController.getUsers);
router.get('/orders', adminController.getOrders);

module.exports = router;
