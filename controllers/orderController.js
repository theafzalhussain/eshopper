const mongoose = require('mongoose');
const { sendTransactionalEmail } = require('../src/utils/email');
const Order = mongoose.model('Order');
const Product = mongoose.model('Product');

// Order confirmation email logic
exports.sendOrderConfirmation = async (req, res) => {
        const path = require('path');
        const templatePath = path.join(__dirname, '..', 'views', 'emails', 'order-confirmed.hbs');
    try {
        const { orderId } = req.body;
        if (!orderId) return res.status(400).json({ message: 'Order ID required.' });
        const orderData = await Order.findOne({ orderId });
        if (!orderData) return res.status(404).json({ message: 'Order not found.' });

        // Populate product details for each item
        const populatedProducts = await Promise.all(
            (orderData.products || []).map(async item => {
                // If item already has name/price/image, use as-is
                if (item.name && item.price && item.pic1) return item;
                // Otherwise, fetch from Product collection
                const product = await Product.findById(item.productid);
                if (!product) return item;
                return {
                    ...item,
                    name: product.name,
                    price: product.finalprice,
                    pic1: product.pic1,
                    brand: product.brand,
                    color: item.color || product.color,
                    size: item.size || product.size,
                    description: product.description,
                };
            })
        );

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
