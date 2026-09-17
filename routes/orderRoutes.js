const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const verifyAdmin = require('../middleware/verifyAdmin');

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

/* One gate in front of everything under /api/admin here.
   These routes previously relied on each handler checking the x-admin-secret
   header itself — and that secret had to be shipped to the browser through
   REACT_APP_ADMIN_SECRET, which CRA inlines into the JS bundle, so anyone
   could read it from the deployed app and use it. verifyAdmin accepts a signed
   admin JWT or a userid whose admin role it verifies against the database, so
   the browser no longer needs a shared secret at all. It also sets req.user,
   which is what the handlers' own isAdminAuthorized() check reads. */
router.use('/api/admin', verifyAdmin);

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