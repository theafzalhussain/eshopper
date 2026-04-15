// Get order details for admin (including statusHistory)
exports.getAdminOrderDetails = async (req, res) => {
    try {
        const { orderId } = req.params;
        if (!orderId) return res.status(400).json({ success: false, message: 'Order ID required.' });
        // Security: Only allow admin (x-admin-secret header)
        if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        const order = await Order.findOne({ orderId });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
        res.json({ success: true, order });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch order.' });
    }
};
// Bulk delete orders
exports.deleteOrders = async (req, res) => {
    try {
        const { orderIds } = req.body;
        if (!Array.isArray(orderIds) || !orderIds.length) {
            return res.status(400).json({ success: false, message: 'No orderIds provided.' });
        }
        // Security: Only allow admin (x-admin-secret header)
        if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        const result = await Order.deleteMany({ orderId: { $in: orderIds } });
        // Emit socket.io event for each deleted order and dashboard update
        if (typeof req.app.get === 'function') {
            const io = req.app.get('io');
            if (io) {
                orderIds.forEach(orderId => {
                    io.emit('orderDeleted', { orderId });
                });
                io.emit('dashboardUpdate');
            }
        }
        res.json({ success: true, deletedCount: result.deletedCount });
    } catch (err) {
        console.error('Bulk delete error:', err.message);
        res.status(500).json({ success: false, message: 'Bulk delete failed.' });
    }
};

const { sendTransactionalEmail } = require('../src/utils/email');
const { sendEmail } = require('../emailService');
const {
    sendOrderStatus,
} = require('../mailController');
const Order = require('../models/Order');
const Product = require('../models/Product');

// Get all notes for an order (admin only)
exports.getOrderNotes = async (req, res) => {
    try {
        const { orderId } = req.params;
        if (!orderId) return res.status(400).json({ success: false, message: 'Order ID required.' });
        // Security: Only allow admin (x-admin-secret header)
        if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        const order = await Order.findOne({ orderId });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
        res.json({ success: true, notes: order.orderNotes || [] });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch notes.' });
    }
};

// Add a new note to an order (admin only)
exports.addOrderNote = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { note, author } = req.body;
        if (!orderId || !note) return res.status(400).json({ success: false, message: 'Order ID and note required.' });
        // Security: Only allow admin (x-admin-secret header)
        if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        const order = await Order.findOne({ orderId });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
        order.orderNotes.push({ note, author });
        await order.save();
        // Emit dashboard update event
        if (typeof req.app.get === 'function') {
            const io = req.app.get('io');
            if (io) io.emit('dashboardUpdate');
        }
        res.json({ success: true, notes: order.orderNotes });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to add note.' });
    }
};


// Unified order status email logic
exports.sendOrderStatusEmail = async (req, res) => {
    try {
        const { orderId, status } = req.body;
        if (!orderId || !status) return res.status(400).json({ message: 'Order ID and status required.' });
        const orderData = await Order.findOne({ orderId }).populate('products.productid');
        if (!orderData) return res.status(404).json({ message: 'Order not found.' });

        // Prepare product summary for email
        const items = (orderData.products || []).map(item => {
            const prod = item.productid && typeof item.productid === 'object' ? item.productid : {};
            return {
                imageUrl: prod.pic1 || item.pic1 || '',
                name: prod.name || item.name || '',
                size: item.size || prod.size || '',
                color: item.color || prod.color || '',
                quantity: item.quantity || item.qty || 1,
                subtotal: (prod.finalprice || item.price || 0) * (item.quantity || item.qty || 1),
                brand: prod.brand || '',
                description: prod.description || '',
                sku: prod._id || item.productid || '',
            };
        });

        // Progress stepper logic (customize as needed)
        const allSteps = [
            { key: 'Order Received', label: 'Received', icon: '&#10003;' },
            { key: 'Order Confirmed', label: 'Confirmed', icon: '&#128179;' },
            { key: 'Order Packed', label: 'Packed', icon: '&#9671;' },
            { key: 'Order Shipped', label: 'Shipped', icon: '&#10148;' },
            { key: 'Out for Delivery', label: 'Out for Delivery', icon: '&#10022;' },
            { key: 'Delivered', label: 'Delivered', icon: '&#9989;' },
        ];
        const normalizedStatus = String(status).toLowerCase();
        const currentStep = allSteps.findIndex(s => s.key.toLowerCase() === normalizedStatus);
        const progressSteps = allSteps.map((step, idx) => ({
            ...step,
            state: idx < currentStep ? 'done' : idx === currentStep ? 'active' : 'pending',
            isCurrent: idx === currentStep,
        }));
        const progressPercent = Math.max(0, Math.round(((currentStep + 1) / allSteps.length) * 100));

        // Compose payload for template
        const payload = {
            orderId: orderData.orderId,
            customerName: orderData.userName,
            orderDate: orderData.orderDate ? new Date(orderData.orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
            items,
            shippingName: orderData.shippingAddress?.fullName || '',
            shippingAddressLine1: orderData.shippingAddress?.addressline1 || '',
            shippingAddressLine2: orderData.shippingAddress?.city || '',
            shippingAddressLine3: orderData.shippingAddress?.state ? `${orderData.shippingAddress.state} ${orderData.shippingAddress.pin}` : '',
            shippingPhone: orderData.shippingAddress?.phone || '',
            paymentMethod: orderData.paymentMethod,
            paymentStatus: orderData.paymentStatus,
            subtotal: orderData.totalAmount,
            shippingCharges: orderData.shippingAmount,
            totalAmount: orderData.finalAmount,
            progressSteps,
            progressPercent,
            trackingUrl: `${process.env.BRAND_SITE_URL || 'https://eshopperr.me'}/order-tracking/${orderData.orderId}`,
            placedInvoiceUrl: `${process.env.BRAND_SITE_URL || 'https://eshopperr.me'}/invoice/${orderData.orderId}`,
            orderDetailsUrl: `${process.env.BRAND_SITE_URL || 'https://eshopperr.me'}/order/${orderData.orderId}`,
            whatsappUrl: `https://wa.me/${process.env.SUPPORT_PHONE || '919999999999'}`,
            supportEmail: process.env.SUPPORT_EMAIL || 'support@eshopperr.me',
            companyAddress: process.env.COMPANY_ADDRESS || 'Eshopper Luxe, New Delhi, India',
            privacyPolicyUrl: `${process.env.BRAND_SITE_URL || 'https://eshopperr.me'}/privacy-policy`,
            termsUrl: `${process.env.BRAND_SITE_URL || 'https://eshopperr.me'}/terms`,
        };

        // Render and send email using mailController and emailService.js
        const html = await sendOrderStatus({ status, ...payload });
        await sendEmail({
            to: orderData.userEmail,
            subject: `Your Order ${orderData.orderId} - ${status}`,
            template: `order-${normalizedStatus.replace(/ /g, '-').toLowerCase()}.hbs`,
            context: payload
        });
        res.json({ result: `Order ${status} email sent.` });
    } catch (err) {
        console.error('Order status email error:', err.message);
        res.status(500).json({ error: 'Failed to send order status email.' });
    }
};
