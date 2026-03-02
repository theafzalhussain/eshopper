# Code Citations

## License: GPL-3.0
https://github.com/emlog/emlog/blob/3c09b8588fbfb6dc95a83a2570fa7ea9fe0f9696/admin/views/setting_mail.php

```
I'll create a premium, luxury-boutique styled Order Confirmation experience with backend integration, email automation, and celebration effects. Here's the complete implementation:

## Step 1: Install Required Packages

```bash
npm install canvas-confetti jspdf jspdf-autotable
```

## Step 2: Backend Implementation (server.js)

Add this code to your [`server.js`](server.js) file:

````javascript
// filepath: server.js
// ...existing code...

// 📦 ORDER SCHEMA - Add this after other schemas (around line 305)
const Order = mongoose.model('Order', new mongoose.Schema({
    orderId: { type: String, unique: true, required: true },
    userId: { type: String, required: true },
    userName: String,
    userEmail: String,
    userPhone: String,
    userAddress: String,
    paymentMode: String,
    orderStatus: { type: String, default: 'Order Placed' },
    paymentStatus: { type: String, default: 'Pending' },
    totalAmount: Number,
    shippingAmount: Number,
    finalAmount: Number,
    products: Array,
    estimatedDelivery: Date,
    orderDate: { type: Date, default: Date.now }
}, opts));

// 🚀 PLACE ORDER ROUTE - Add this after other routes (around line 700)
app.post('/api/place-order', async (req, res) => {
    try {
        const { userId, paymentMode, totalAmount, shippingAmount, finalAmount, products } = req.body;

        // Validate required fields
        if (!userId || !products || products.length === 0) {
            return res.status(400).json({ message: 'Invalid order data' });
        }

        // Get user details
        const user = await User.findOne({ $or: [{ _id: userId }, { id: userId }] });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate unique Order ID
        const orderCount = await Order.countDocuments();
        const orderId = `ESHP-${new Date().getFullYear()}-${String(orderCount + 1001).padStart(4, '0')}`;

        // Calculate estimated delivery (7 days from now)
        const estimatedDelivery = new Date();
        estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);

        // Create order document
        const newOrder = new Order({
            orderId,
            userId,
            userName: user.name,
            userEmail: user.email,
            userPhone: user.phone,
            userAddress: `${user.address}, ${user.pin}, ${user.city}, ${user.state}`,
            paymentMode,
            totalAmount,
            shippingAmount,
            finalAmount,
            products,
            estimatedDelivery,
            orderStatus: 'Order Placed',
            paymentStatus: paymentMode === 'COD' ? 'Pending' : 'Paid'
        });

        await newOrder.save();

        // Clear user's cart after successful order
        await Cart.deleteMany({ userid: userId });

        // Send confirmation email
        try {
            await sendOrderConfirmationEmail(user.email, user.name, orderId, finalAmount, products, estimatedDelivery);
            console.log(`✅ Order confirmation email sent to: ${user.email}`);
        } catch (emailError) {
            console.error('❌ Email send failed (non-critical):', emailError.message);
            // Don't fail the order if email fails
        }

        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            order: {
                orderId,
                estimatedDelivery,
                finalAmount
            }
        });

    } catch (error) {
        console.error('❌ Place Order Error:', error);
        if (process.env.SENTRY_DSN) Sentry.captureException(error);
        res.status(500).json({ message: 'Failed to place order. Please try again.' });
    }
});

// 📧 ORDER CONFIRMATION EMAIL FUNCTION - Add after sendMail function (around line 280)
const sendOrderConfirmationEmail = async (toEmail, userName, orderId, finalAmount, products, estimatedDelivery) => {
    try {
        const BREVO_KEY = process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.trim() : null;
        if (!BREVO_KEY) throw new Error("❌ BREVO_API_KEY Missing");

        const firstName = userName ? userName.split(' ')[0] : 'Valued Customer';
        const deliveryDate = new Date(estimatedDelivery).toLocaleDateString('en-IN', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        // Build product rows for email
        const productRows = products.map(p => `
            <tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:12px 8px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <img src="${p.pic || ''}" width="50" height="50" style="border-radius:8px;object-fit:cover;" />
                        <div>
                            <div style="font-weight:600;color:#111827;">${p.name}</div>
                            <div style="font-size:12px;color:#6b7280;">Qty: ${p.qty}</div>
                        </div>
                    </div>
                </td>
                <td style="padding:12px 8px;text-align:right;font-weight:600;">₹${p.total || (p.price * p.qty)}</td>
            </tr>
        `).join('');

        const data = {
            sender: { name: "Eshopper Boutique", email: "support@eshopperr.me" },
            to: [{ email: toEmail, name: userName }],
            subject: `✅ Order Confirmed - ${orderId} | Eshopper Boutique`,
            htmlContent: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;">
                    <div style="max-width:600px;margin:0 auto;background:#ffffff;">
                        <!-- Header -->
                        <div style="background:linear-gradient(135deg,#111827 0%,#1f2937 100%);padding:32px 24px;text-align:center;">
                            <div style="font-size:28px;font-weight:800;color:#FFD700;letter-spacing:1px;">ESHOPPER</div>
                            <div style="font-size:12px;color:#d1d5db;margin-top:4px;letter-spacing:2px;">BOUTIQUE LUXE</div>
                        </div>

                        <!-- Success Banner -->
                        <div style="background:linear-gradient(135deg,#d4edda 0%,#c3e6cb 100%);padding:24px;text-align:center;border-bottom:3px solid #28a745;">
                            <div style="font-size:48px;margin-bottom:8px;">✅</div>
                            <div style="font-size:20px;font-weight:700;color:#155724;">ORDER CONFIRMED!</div>
                            <div style="font-size:14px;color:#155724;margin-top:8px;">Thank you for choosing Eshopper</div>
                        </div>

                        <!-- Order Details -->
                        <div style="padding:32px 24px;">
                            <p style="margin:0 0 8px 0;font-size:16px;color:#111827;">Dear <strong>${firstName}</strong>,</p>
                            <p style="margin:0 0 24px 0;font-size:15px;color:#4b5563;">Your luxury order has been confirmed and is being prepared with care.</p>

                            <!-- Order ID Card -->
                            <div style="background:#f8f9fa;border:2px solid #FFD700;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
                                <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Order ID</div>
                                <div style="font-size:24px;font-weight:800;color:#111827;letter-spacing:1px;">${orderId}</div>
                            </div>

                            <!-- Products Table -->
                            <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                                <thead>
                                    <tr style="background:#f3f4f6;">
                                        <th style="padding:12px 8px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Product</th>
                                        <th style="padding:12px 8px;text-align:right;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${productRows}
                                </tbody>
                            </table>

                            <!-- Price Summary -->
                            <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px;">
                                <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
                                    <span style="color:#6b7280;">Subtotal</span>
                                    <span style="font-weight:600;color:#111827;">₹${finalAmount - (products.length > 0 && products[0].shippingAmount || 0)}</span>
                                </div>
                                <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
                                    <span style="color:#6b7280;">Shipping</span>
                                    <span style="font-weight:600;color:#28a745;">${finalAmount >= 1000 ? 'FREE' : '₹150'}</span>
                                </div>
                                <div style="border-top:2px solid #e5e7eb;margin:12px 0;"></div>
                                <div style="display:flex;justify-content:space-between;">
                                    <span style="font-size:18px;font-weight:700;color:#111827;">Total Paid</span>
                                    <span style="font-size:18px;font-weight:700;color:#FFD700;">₹${finalAmount}</span>
                                </div>
                            </div>

                            <!-- Delivery Info -->
                            <div style="background:linear-gradient(135deg,#e0f2fe 0%,#dbeafe 100%);border-left:4px solid #17a2b8;padding:16px;border-radius:8px;margin-bottom:24px;">
                                <div style="font-size:12px;color:#0369a1;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Estimated Delivery</div>
                                <div style="font-size:16px;font-weight:700;color:#0c4a6e;">${deliveryDate}</div>
                            </div>

                            <!-- CTA Buttons -->
                            <div style="text-align:center;margin-top:32px;">
                                <a href="${process.env.FRONTEND_URL || 'https://eshopperr.me'}/confirmation" style="display:inline-block;background:#111827;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;margin:0 8px 12px 8px;">View Order Details</a>
                                <a href="${process.env.FRONTEND_URL || 'https://eshopperr.me'}/shop/All" style="display:inline-block;background:#fff;color:#111827;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;border:2px solid #111827;margin:0 8px 12px 8px;">Continue Shopping</a>
                            </div>
                        </div>

                        <!-- Footer -->
                        <div style="background:#f9fafb;padding:24px;text-align:center;border-top:1px solid #e5e7eb;">
                            <p style="margin:0 0 8px 0;font-size:14px;color:#6b7280;">Need help? Contact our 24/7 support</p>
                            <p style="margin:0 0 16px 0;">
                                <a href="mailto:support@eshopperr.me" style="color:#17a2b8;text-decoration:none;font-weight:600;">support@eshopperr.me</a> • 
                                <a href="tel:+918447859784" style="color:#17a2b8;text-decoration:none;font-weight:600;">+91 8447859784</a>
                            </p>
                            <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} Eshopper Boutique Luxe • <a href="${process.env.FRONTEND_URL || 'https://eshopperr.me'}" style="color:#9ca3af;">eshopperr.me</a></p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            replyTo: { email: "support@eshopperr.me" }
        };

        const config = {
            headers: {
                'api-key': BREVO_KEY,
                'content-type': 'application/json',
                'accept': 'application/json'
            }
        };

        const response = await axios.post('https://api.brevo.com/v3/smtp/email', data, config);
        console.log(`✅ Order confirmation email sent. Message ID: ${response.data.messageId}`);
        return true;

    } catch (error) {
        console.error("❌ Order Email Error:", error.response ? error.response.data : error.message);
        throw error;
    }
};

// ...existing code...
````

## Step 3: Premium Confirmation Component

````jsx
// filepath: src/Component/Confirmation.jsx
import React, { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { 
    CheckCircle2, Package, Truck, Calendar, MapPin, CreditCard, 
    Download, ShoppingBag, MessageCircle, Clock, ArrowRight, Sparkles 
} from 'lucide-react'
import { getCheckout } from '../Store/ActionCreaters/CheckoutActionCreators'
import { getUser } from '../Store/ActionCreaters/UserActionCreators'
import { optimizeCloudinaryUrlAdvanced } from '../utils/cloudinaryHelper'

export default function Confirmation() {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    
    const checkouts = useSelector((state) => state.CheckoutStateData)
    const users = useSelector((state) => state.UserStateData)
    
    const [currentOrder, setCurrentOrder] = useState(null)
    const [user, setUser] = useState(null)
    const [showCelebration, setShowCelebration] = useState(true)

    // Get the latest order
    useEffect(() => {
        dispatch(getCheckout())
        dispatch(getUser())
    }, [dispatch])

    useEffect(() => {
        const userId = localStorage.getItem("userid")
        if (!userId) {
            navigate("/login")
            return
        }

        // Get user details
        const currentUser = users.find(u => (u.id || u._id) === userId)
        if (currentUser) setUser(currentUser)

        // Get latest order for this user
        const userOrders = checkouts.filter(o => o.userid === userId)
        if (userOrders.length > 0) {
            // Sort by creation date (most recent first)
            const latestOrder = userOrders.sort((a, b) => {
                const dateA = new Date(b.createdAt || b.time || 0)
                const dateB = new Date(a.createdAt || a.time || 0)
                return dateA - dateB
            })[0]
            setCurrentOrder(latestOrder)
        }
    }, [checkouts, users, navigate])

    // Golden Confetti Celebration
    useEffect(() => {
        if (!showCelebration) return

        const duration = 3000
        const animationEnd = Date.now() + duration
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 99999 }

        function randomInRange(min, max) {
            return Math.random() * (max - min) + min
        }

        const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now()

            if (timeLeft <= 0) {
                clearInterval(interval)
                setShowCelebration(false)
                return
            }

            const particleCount = 50 * (timeLeft / duration)

            // Golden confetti from left
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
                colors: ['#FFD700', '#FFA500', '#FF8C00', '#DAA520']
            })

            // Golden confetti from right
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
                colors: ['#FFD700', '#FFA500', '#FF8C00', '#DAA520']
            })
        }, 250)

        return () => clearInterval(interval)
    }, [showCelebration])

    // Calculate estimated delivery
    const estimatedDelivery = useMemo(() => {
        if (!currentOrder) return null
        const orderDate = new Date(currentOrder.createdAt || currentOrder.time || Date.now())
        const deliveryDate = new Date(orderDate)
        deliveryDate.setDate(deliveryDate.getDate() + 7)
        return deliveryDate.toLocaleDateString('en-IN', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        })
    }, [currentOrder])

    // Generate Order ID
    const orderId = useMemo(() => {
        if (!currentOrder) return 'Processing...'
        const id = currentOrder.id || currentOrder._id || ''
        return `ESHP-${new Date().getFullYear()}-${id.slice(-4).toUpperCase()}`
    }, [currentOrder])

    // Download PDF Invoice
    const downloadInvoice = () => {
        if (!currentOrder || !user) return

        const doc = new jsPDF()
        
        // Header
        doc.setFillColor(17, 24, 39)
        doc.rect(0, 0, 220, 40, 'F')
        doc.setTextColor(255, 215, 0)
        doc.setFontSize(24)
        doc.setFont(undefined, 'bold')
        doc.text('ESHOPPER', 105, 20, { align: 'center' })
        doc.setFontSize(10)
        doc.text('BOUTIQUE LUXE', 105, 28, { align: 'center' })

        // Order Confirmed Badge
        doc.setFillColor(212, 237, 218)
        doc.rect(10, 50, 190, 15, 'F')
        doc.setTextColor(21, 87, 36)
        doc.setFontSize(12)
        doc.text('✓ ORDER CONFIRMED', 105, 59, { align: 'center' })

        // Customer Details
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(10)
        doc.text(`Order ID: ${orderId}`, 15, 75)
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 15, 82)
        doc.text(`Customer: ${user.name}`, 15, 89)
        doc.text(`Email: ${user.email}`, 15, 96)
        doc.text(`Phone: ${user.phone}`, 15, 103)

        // Products Table
        const tableData = currentOrder.products.map(p => [
            p.name,
            p.qty.toString(),
            `₹${p.price}`,
            `₹${p.total || (p.price * p.qty)}`
        ])

        doc.autoTable({
            startY: 115,
            head: [['Product', 'Qty', 'Price', 'Total']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [23, 162, 184], fontSize: 10 },
            styles: { fontSize: 9 }
        })

        // Summary
        const finalY = doc.lastAutoTable.finalY + 10
        doc.setFontSize(10)
        doc.text(`Subtotal: ₹${currentOrder.totalAmount}`, 140, finalY)
        doc.text(`Shipping: ₹${currentOrder.shippingAmount}`, 140, finalY + 7)
        doc.setFont(undefined, 'bold')
        doc.setFontSize(12)
        doc.text(`Total: ₹${currentOrder.finalAmount}`, 140, finalY + 17)

        // Footer
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        doc.text('Thank you for shopping with Eshopper Boutique Luxe', 105, 280, { align: 'center' })
        doc.text('support@eshopperr.me • +91 8447859784 • eshopperr.me', 105, 285, { align: 'center' })

        doc.save(`Eshopper_Invoice_${orderId}.pdf`)
    }

    if (!currentOrder) {
        return (
            <div className="container text-center py-5">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                    <Package size={48} className="text-info" />
                </motion.div>
                <h4 className="mt-3">Loading your order details...</h4>
            </div>
        )
    }

    return (
        <div className="confirmation-luxury-root">
            <div className="confirmation-bg-overlay"></div>
            
            <div className="container py-5">
                {/* Success Header */}
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="text-center mb-5"
                >
                    <div className="success-icon-container mb-4">
                        <CheckCircle2 size={80} strokeWidth={2.5} className="success-icon" />
                        <Sparkles size={32} className="sparkle sparkle-1" />
                        <Sparkles size={24} className="sparkle sparkle-2" />
                        <Sparkles size={28} className="sparkle sparkle-3" />
                    </div>
                    <motion.h1 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="confirmation-title"
                    >
                        ORDER CONFIRMED!
                    </motion.h1>
                    <motion.p 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="confirmation-subtitle"
                    >
                        Thank you for choosing Eshopper, <strong>{user?.name?.split(' ')[0] || 'Valued Customer'}</strong>! Your luxury upgrade is on its way.
                    </motion.p>
                </motion.div>

                <div className="row">
                    {/* Left Column: Order Details */}
                    <div className="col-lg-8">
                        {/* Order ID Car
```


## License: MIT
https://github.com/airqo-platform/AirQo-api/blob/cd3a45571201774ffa30f7852121a146d4d1cefb/src/firebase/auth/functions/config/emailTemplates.js

```
I'll create a premium, luxury-boutique styled Order Confirmation experience with backend integration, email automation, and celebration effects. Here's the complete implementation:

## Step 1: Install Required Packages

```bash
npm install canvas-confetti jspdf jspdf-autotable
```

## Step 2: Backend Implementation (server.js)

Add this code to your [`server.js`](server.js) file:

````javascript
// filepath: server.js
// ...existing code...

// 📦 ORDER SCHEMA - Add this after other schemas (around line 305)
const Order = mongoose.model('Order', new mongoose.Schema({
    orderId: { type: String, unique: true, required: true },
    userId: { type: String, required: true },
    userName: String,
    userEmail: String,
    userPhone: String,
    userAddress: String,
    paymentMode: String,
    orderStatus: { type: String, default: 'Order Placed' },
    paymentStatus: { type: String, default: 'Pending' },
    totalAmount: Number,
    shippingAmount: Number,
    finalAmount: Number,
    products: Array,
    estimatedDelivery: Date,
    orderDate: { type: Date, default: Date.now }
}, opts));

// 🚀 PLACE ORDER ROUTE - Add this after other routes (around line 700)
app.post('/api/place-order', async (req, res) => {
    try {
        const { userId, paymentMode, totalAmount, shippingAmount, finalAmount, products } = req.body;

        // Validate required fields
        if (!userId || !products || products.length === 0) {
            return res.status(400).json({ message: 'Invalid order data' });
        }

        // Get user details
        const user = await User.findOne({ $or: [{ _id: userId }, { id: userId }] });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate unique Order ID
        const orderCount = await Order.countDocuments();
        const orderId = `ESHP-${new Date().getFullYear()}-${String(orderCount + 1001).padStart(4, '0')}`;

        // Calculate estimated delivery (7 days from now)
        const estimatedDelivery = new Date();
        estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);

        // Create order document
        const newOrder = new Order({
            orderId,
            userId,
            userName: user.name,
            userEmail: user.email,
            userPhone: user.phone,
            userAddress: `${user.address}, ${user.pin}, ${user.city}, ${user.state}`,
            paymentMode,
            totalAmount,
            shippingAmount,
            finalAmount,
            products,
            estimatedDelivery,
            orderStatus: 'Order Placed',
            paymentStatus: paymentMode === 'COD' ? 'Pending' : 'Paid'
        });

        await newOrder.save();

        // Clear user's cart after successful order
        await Cart.deleteMany({ userid: userId });

        // Send confirmation email
        try {
            await sendOrderConfirmationEmail(user.email, user.name, orderId, finalAmount, products, estimatedDelivery);
            console.log(`✅ Order confirmation email sent to: ${user.email}`);
        } catch (emailError) {
            console.error('❌ Email send failed (non-critical):', emailError.message);
            // Don't fail the order if email fails
        }

        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            order: {
                orderId,
                estimatedDelivery,
                finalAmount
            }
        });

    } catch (error) {
        console.error('❌ Place Order Error:', error);
        if (process.env.SENTRY_DSN) Sentry.captureException(error);
        res.status(500).json({ message: 'Failed to place order. Please try again.' });
    }
});

// 📧 ORDER CONFIRMATION EMAIL FUNCTION - Add after sendMail function (around line 280)
const sendOrderConfirmationEmail = async (toEmail, userName, orderId, finalAmount, products, estimatedDelivery) => {
    try {
        const BREVO_KEY = process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.trim() : null;
        if (!BREVO_KEY) throw new Error("❌ BREVO_API_KEY Missing");

        const firstName = userName ? userName.split(' ')[0] : 'Valued Customer';
        const deliveryDate = new Date(estimatedDelivery).toLocaleDateString('en-IN', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        // Build product rows for email
        const productRows = products.map(p => `
            <tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:12px 8px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <img src="${p.pic || ''}" width="50" height="50" style="border-radius:8px;object-fit:cover;" />
                        <div>
                            <div style="font-weight:600;color:#111827;">${p.name}</div>
                            <div style="font-size:12px;color:#6b7280;">Qty: ${p.qty}</div>
                        </div>
                    </div>
                </td>
                <td style="padding:12px 8px;text-align:right;font-weight:600;">₹${p.total || (p.price * p.qty)}</td>
            </tr>
        `).join('');

        const data = {
            sender: { name: "Eshopper Boutique", email: "support@eshopperr.me" },
            to: [{ email: toEmail, name: userName }],
            subject: `✅ Order Confirmed - ${orderId} | Eshopper Boutique`,
            htmlContent: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;">
                    <div style="max-width:600px;margin:0 auto;background:#ffffff;">
                        <!-- Header -->
                        <div style="background:linear-gradient(135deg,#111827 0%,#1f2937 100%);padding:32px 24px;text-align:center;">
                            <div style="font-size:28px;font-weight:800;color:#FFD700;letter-spacing:1px;">ESHOPPER</div>
                            <div style="font-size:12px;color:#d1d5db;margin-top:4px;letter-spacing:2px;">BOUTIQUE LUXE</div>
                        </div>

                        <!-- Success Banner -->
                        <div style="background:linear-gradient(135deg,#d4edda 0%,#c3e6cb 100%);padding:24px;text-align:center;border-bottom:3px solid #28a745;">
                            <div style="font-size:48px;margin-bottom:8px;">✅</div>
                            <div style="font-size:20px;font-weight:700;color:#155724;">ORDER CONFIRMED!</div>
                            <div style="font-size:14px;color:#155724;margin-top:8px;">Thank you for choosing Eshopper</div>
                        </div>

                        <!-- Order Details -->
                        <div style="padding:32px 24px;">
                            <p style="margin:0 0 8px 0;font-size:16px;color:#111827;">Dear <strong>${firstName}</strong>,</p>
                            <p style="margin:0 0 24px 0;font-size:15px;color:#4b5563;">Your luxury order has been confirmed and is being prepared with care.</p>

                            <!-- Order ID Card -->
                            <div style="background:#f8f9fa;border:2px solid #FFD700;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
                                <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Order ID</div>
                                <div style="font-size:24px;font-weight:800;color:#111827;letter-spacing:1px;">${orderId}</div>
                            </div>

                            <!-- Products Table -->
                            <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                                <thead>
                                    <tr style="background:#f3f4f6;">
                                        <th style="padding:12px 8px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Product</th>
                                        <th style="padding:12px 8px;text-align:right;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${productRows}
                                </tbody>
                            </table>

                            <!-- Price Summary -->
                            <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px;">
                                <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
                                    <span style="color:#6b7280;">Subtotal</span>
                                    <span style="font-weight:600;color:#111827;">₹${finalAmount - (products.length > 0 && products[0].shippingAmount || 0)}</span>
                                </div>
                                <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
                                    <span style="color:#6b7280;">Shipping</span>
                                    <span style="font-weight:600;color:#28a745;">${finalAmount >= 1000 ? 'FREE' : '₹150'}</span>
                                </div>
                                <div style="border-top:2px solid #e5e7eb;margin:12px 0;"></div>
                                <div style="display:flex;justify-content:space-between;">
                                    <span style="font-size:18px;font-weight:700;color:#111827;">Total Paid</span>
                                    <span style="font-size:18px;font-weight:700;color:#FFD700;">₹${finalAmount}</span>
                                </div>
                            </div>

                            <!-- Delivery Info -->
                            <div style="background:linear-gradient(135deg,#e0f2fe 0%,#dbeafe 100%);border-left:4px solid #17a2b8;padding:16px;border-radius:8px;margin-bottom:24px;">
                                <div style="font-size:12px;color:#0369a1;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Estimated Delivery</div>
                                <div style="font-size:16px;font-weight:700;color:#0c4a6e;">${deliveryDate}</div>
                            </div>

                            <!-- CTA Buttons -->
                            <div style="text-align:center;margin-top:32px;">
                                <a href="${process.env.FRONTEND_URL || 'https://eshopperr.me'}/confirmation" style="display:inline-block;background:#111827;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;margin:0 8px 12px 8px;">View Order Details</a>
                                <a href="${process.env.FRONTEND_URL || 'https://eshopperr.me'}/shop/All" style="display:inline-block;background:#fff;color:#111827;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;border:2px solid #111827;margin:0 8px 12px 8px;">Continue Shopping</a>
                            </div>
                        </div>

                        <!-- Footer -->
                        <div style="background:#f9fafb;padding:24px;text-align:center;border-top:1px solid #e5e7eb;">
                            <p style="margin:0 0 8px 0;font-size:14px;color:#6b7280;">Need help? Contact our 24/7 support</p>
                            <p style="margin:0 0 16px 0;">
                                <a href="mailto:support@eshopperr.me" style="color:#17a2b8;text-decoration:none;font-weight:600;">support@eshopperr.me</a> • 
                                <a href="tel:+918447859784" style="color:#17a2b8;text-decoration:none;font-weight:600;">+91 8447859784</a>
                            </p>
                            <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} Eshopper Boutique Luxe • <a href="${process.env.FRONTEND_URL || 'https://eshopperr.me'}" style="color:#9ca3af;">eshopperr.me</a></p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            replyTo: { email: "support@eshopperr.me" }
        };

        const config = {
            headers: {
                'api-key': BREVO_KEY,
                'content-type': 'application/json',
                'accept': 'application/json'
            }
        };

        const response = await axios.post('https://api.brevo.com/v3/smtp/email', data, config);
        console.log(`✅ Order confirmation email sent. Message ID: ${response.data.messageId}`);
        return true;

    } catch (error) {
        console.error("❌ Order Email Error:", error.response ? error.response.data : error.message);
        throw error;
    }
};

// ...existing code...
````

## Step 3: Premium Confirmation Component

````jsx
// filepath: src/Component/Confirmation.jsx
import React, { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { 
    CheckCircle2, Package, Truck, Calendar, MapPin, CreditCard, 
    Download, ShoppingBag, MessageCircle, Clock, ArrowRight, Sparkles 
} from 'lucide-react'
import { getCheckout } from '../Store/ActionCreaters/CheckoutActionCreators'
import { getUser } from '../Store/ActionCreaters/UserActionCreators'
import { optimizeCloudinaryUrlAdvanced } from '../utils/cloudinaryHelper'

export default function Confirmation() {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    
    const checkouts = useSelector((state) => state.CheckoutStateData)
    const users = useSelector((state) => state.UserStateData)
    
    const [currentOrder, setCurrentOrder] = useState(null)
    const [user, setUser] = useState(null)
    const [showCelebration, setShowCelebration] = useState(true)

    // Get the latest order
    useEffect(() => {
        dispatch(getCheckout())
        dispatch(getUser())
    }, [dispatch])

    useEffect(() => {
        const userId = localStorage.getItem("userid")
        if (!userId) {
            navigate("/login")
            return
        }

        // Get user details
        const currentUser = users.find(u => (u.id || u._id) === userId)
        if (currentUser) setUser(currentUser)

        // Get latest order for this user
        const userOrders = checkouts.filter(o => o.userid === userId)
        if (userOrders.length > 0) {
            // Sort by creation date (most recent first)
            const latestOrder = userOrders.sort((a, b) => {
                const dateA = new Date(b.createdAt || b.time || 0)
                const dateB = new Date(a.createdAt || a.time || 0)
                return dateA - dateB
            })[0]
            setCurrentOrder(latestOrder)
        }
    }, [checkouts, users, navigate])

    // Golden Confetti Celebration
    useEffect(() => {
        if (!showCelebration) return

        const duration = 3000
        const animationEnd = Date.now() + duration
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 99999 }

        function randomInRange(min, max) {
            return Math.random() * (max - min) + min
        }

        const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now()

            if (timeLeft <= 0) {
                clearInterval(interval)
                setShowCelebration(false)
                return
            }

            const particleCount = 50 * (timeLeft / duration)

            // Golden confetti from left
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
                colors: ['#FFD700', '#FFA500', '#FF8C00', '#DAA520']
            })

            // Golden confetti from right
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
                colors: ['#FFD700', '#FFA500', '#FF8C00', '#DAA520']
            })
        }, 250)

        return () => clearInterval(interval)
    }, [showCelebration])

    // Calculate estimated delivery
    const estimatedDelivery = useMemo(() => {
        if (!currentOrder) return null
        const orderDate = new Date(currentOrder.createdAt || currentOrder.time || Date.now())
        const deliveryDate = new Date(orderDate)
        deliveryDate.setDate(deliveryDate.getDate() + 7)
        return deliveryDate.toLocaleDateString('en-IN', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        })
    }, [currentOrder])

    // Generate Order ID
    const orderId = useMemo(() => {
        if (!currentOrder) return 'Processing...'
        const id = currentOrder.id || currentOrder._id || ''
        return `ESHP-${new Date().getFullYear()}-${id.slice(-4).toUpperCase()}`
    }, [currentOrder])

    // Download PDF Invoice
    const downloadInvoice = () => {
        if (!currentOrder || !user) return

        const doc = new jsPDF()
        
        // Header
        doc.setFillColor(17, 24, 39)
        doc.rect(0, 0, 220, 40, 'F')
        doc.setTextColor(255, 215, 0)
        doc.setFontSize(24)
        doc.setFont(undefined, 'bold')
        doc.text('ESHOPPER', 105, 20, { align: 'center' })
        doc.setFontSize(10)
        doc.text('BOUTIQUE LUXE', 105, 28, { align: 'center' })

        // Order Confirmed Badge
        doc.setFillColor(212, 237, 218)
        doc.rect(10, 50, 190, 15, 'F')
        doc.setTextColor(21, 87, 36)
        doc.setFontSize(12)
        doc.text('✓ ORDER CONFIRMED', 105, 59, { align: 'center' })

        // Customer Details
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(10)
        doc.text(`Order ID: ${orderId}`, 15, 75)
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 15, 82)
        doc.text(`Customer: ${user.name}`, 15, 89)
        doc.text(`Email: ${user.email}`, 15, 96)
        doc.text(`Phone: ${user.phone}`, 15, 103)

        // Products Table
        const tableData = currentOrder.products.map(p => [
            p.name,
            p.qty.toString(),
            `₹${p.price}`,
            `₹${p.total || (p.price * p.qty)}`
        ])

        doc.autoTable({
            startY: 115,
            head: [['Product', 'Qty', 'Price', 'Total']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [23, 162, 184], fontSize: 10 },
            styles: { fontSize: 9 }
        })

        // Summary
        const finalY = doc.lastAutoTable.finalY + 10
        doc.setFontSize(10)
        doc.text(`Subtotal: ₹${currentOrder.totalAmount}`, 140, finalY)
        doc.text(`Shipping: ₹${currentOrder.shippingAmount}`, 140, finalY + 7)
        doc.setFont(undefined, 'bold')
        doc.setFontSize(12)
        doc.text(`Total: ₹${currentOrder.finalAmount}`, 140, finalY + 17)

        // Footer
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        doc.text('Thank you for shopping with Eshopper Boutique Luxe', 105, 280, { align: 'center' })
        doc.text('support@eshopperr.me • +91 8447859784 • eshopperr.me', 105, 285, { align: 'center' })

        doc.save(`Eshopper_Invoice_${orderId}.pdf`)
    }

    if (!currentOrder) {
        return (
            <div className="container text-center py-5">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                    <Package size={48} className="text-info" />
                </motion.div>
                <h4 className="mt-3">Loading your order details...</h4>
            </div>
        )
    }

    return (
        <div className="confirmation-luxury-root">
            <div className="confirmation-bg-overlay"></div>
            
            <div className="container py-5">
                {/* Success Header */}
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="text-center mb-5"
                >
                    <div className="success-icon-container mb-4">
                        <CheckCircle2 size={80} strokeWidth={2.5} className="success-icon" />
                        <Sparkles size={32} className="sparkle sparkle-1" />
                        <Sparkles size={24} className="sparkle sparkle-2" />
                        <Sparkles size={28} className="sparkle sparkle-3" />
                    </div>
                    <motion.h1 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="confirmation-title"
                    >
                        ORDER CONFIRMED!
                    </motion.h1>
                    <motion.p 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="confirmation-subtitle"
                    >
                        Thank you for choosing Eshopper, <strong>{user?.name?.split(' ')[0] || 'Valued Customer'}</strong>! Your luxury upgrade is on its way.
                    </motion.p>
                </motion.div>

                <div className="row">
                    {/* Left Column: Order Details */}
                    <div className="col-lg-8">
                        {/* Order ID Card */}
                        <motion.div 
                            initial={{ x: -30
```

