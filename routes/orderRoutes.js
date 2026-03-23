const express = require('express');
const router = express.Router();


const orderController = require('../controllers/orderController');


// Bulk delete orders
router.post('/api/admin/delete-orders', orderController.deleteOrders);

// Admin Order Notes
router.get('/api/admin/order/:orderId/notes', orderController.getOrderNotes);
router.post('/api/admin/order/:orderId/notes', orderController.addOrderNote);

// Example order route
router.get('/test', (req, res) => {
    res.json({ message: 'Order route working' });
});

module.exports = router;