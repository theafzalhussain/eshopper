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
        // Emit socket.io event for each deleted order
        if (typeof req.app.get === 'function') {
            const io = req.app.get('io');
            if (io) {
                orderIds.forEach(orderId => {
                    io.emit('orderDeleted', { orderId });
                });
            }
        }
        res.json({ success: true, deletedCount: result.deletedCount });
    } catch (err) {
        console.error('Bulk delete error:', err.message);
        res.status(500).json({ success: false, message: 'Bulk delete failed.' });
    }
};

const { sendTransactionalEmail } = require('../src/utils/email');
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
        res.json({ success: true, notes: order.orderNotes });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to add note.' });
    }
};

// Order confirmation email logic
exports.sendOrderConfirmation = async (req, res) => {
        const path = require('path');
        const templatePath = path.join(__dirname, '..', 'views', 'emails', 'order-confirmed.hbs');
    try {

        const { orderId } = req.body;
        if (!orderId) return res.status(400).json({ message: 'Order ID required.' });
        // Use populate to fetch product details
        const orderData = await Order.findOne({ orderId }).populate('products.productid');
        if (!orderData) return res.status(404).json({ message: 'Order not found.' });

        // Map variables for Handlebars/email template
        const populatedProducts = (orderData.products || []).map(item => {
            // If productid is populated, use its fields
            if (item.productid && typeof item.productid === 'object') {
                return {
                    ...item,
                    name: item.productid.name,
                    price: item.productid.finalprice,
                    pic1: item.productid.pic1,
                    brand: item.productid.brand,
                    color: item.color || item.productid.color,
                    size: item.size || item.productid.size,
                    description: item.productid.description,
                };
            }
            // Fallback to original item
            return item;
        });

        // Map variables for Handlebars/email template
        const emailVars = {
            orderId: orderData.orderId,
            userName: orderData.userName,
            userEmail: orderData.userEmail,
            paymentMethod: orderData.paymentMethod,
            paymentStatus: orderData.paymentStatus,
            finalAmount: orderData.finalAmount,
            totalAmount: orderData.totalAmount,
            shippingAmount: orderData.shippingAmount,
            shippingAddress: orderData.shippingAddress,
            products: populatedProducts,
            orderDate: orderData.orderDate,
        };

        // Render email using Handlebars (example)
        // const html = renderTemplate('order-confirmed.hbs', emailVars);
        // For now, send simple email
        await sendTransactionalEmail({
            to: orderData.userEmail,
            subject: `Order Confirmation - ${orderData.orderId}`,
            htmlContent: `<h1>Thank you for your order, ${orderData.userName}!</h1><p>Your order ID is ${orderData.orderId}.</p><ul>${populatedProducts.map(p => `<li>${p.name} - ₹${p.price} <img src='${p.pic1}' width='60'/></li>`).join('')}</ul>`
        });
        res.json({ result: 'Order confirmation email sent.' });
    } catch (err) {
        console.error('Order email error:', err.message);
        res.status(500).json({ error: 'Failed to send order confirmation email.' });
    }
};
