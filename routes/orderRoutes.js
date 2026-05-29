const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// ════════════════════════════════════════════════════════════════════════════
// USER APIS
// ════════════════════════════════════════════════════════════════════════════

// User order APIs
router.get('/api/user/orders', orderController.getUserOrdersList);
router.get('/api/user/:userId/orders', orderController.getUserOrdersList);
router.get('/api/orders/:orderId', orderController.getUserOrderDetails);
router.post('/api/orders/:orderId/cancel', orderController.cancelOrder);
router.post('/api/orders/:orderId/return', orderController.requestReturn);

// ════════════════════════════════════════════════════════════════════════════
// ADMIN APIS - ORDER MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════

// Order details
router.get('/api/admin/order/:orderId', orderController.getAdminOrderDetails);
router.post('/api/admin/delete-orders', orderController.deleteOrders);

// Order notes
router.get('/api/admin/order/:orderId/notes', orderController.getOrderNotes);
router.post('/api/admin/order/:orderId/notes', orderController.addOrderNote);

// ════════════════════════════════════════════════════════════════════════════
// ADMIN APIS - RETURN MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════

// Get all returns for dashboard
router.get('/api/admin/returns', orderController.adminGetAllReturns);

// Get return statistics
router.get('/api/admin/returns/stats', orderController.adminGetReturnStats);

// Get specific return details
router.get('/api/admin/returns/:orderId', orderController.adminGetReturnDetails);

// Update return status (approve/reject/pickup/intransit)
router.put('/api/admin/returns/:orderId/status', orderController.adminUpdateReturnStatus);

// Mark return as received (triggers 24h auto-refund)
router.post('/api/admin/returns/:orderId/mark-received', orderController.adminMarkReturnReceived);

// Process refund manually
router.post('/api/admin/returns/:orderId/refund', orderController.adminProcessRefund);

// ════════════════════════════════════════════════════════════════════════════
// ADMIN APIS - SCHEDULER & REPORTING
// ════════════════════════════════════════════════════════════════════════════

// Manually trigger auto-refund scheduler
router.post('/api/admin/scheduler/trigger-refunds', orderController.adminTriggerAutoRefund);

// Get pending refunds waiting for auto-processing
router.get('/api/admin/scheduler/pending-refunds', orderController.adminGetPendingRefunds);

// Get refund report
router.get('/api/admin/scheduler/refund-report', orderController.adminGetRefundReport);

// ════════════════════════════════════════════════════════════════════════════
// EMAIL & STATUS
// ════════════════════════════════════════════════════════════════════════════

// Unified order status email trigger (admin or system)
router.post('/api/order/send-status-email', orderController.sendOrderStatusEmail);

// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'Order route working' });
});

module.exports = router;