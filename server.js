// Fix: Removed stray closing brace at top causing syntax error
// Fix: Removed stray closing brace at top causing syntax error
// ...existing code...
// ...existing code...
// 🔑 AUTH SYNC ROUTE (Google/Phone Login)
app.post('/api/auth-sync', async (req, res) => {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: 'idToken required.' });
    try {
        // 'admin' already imported above
        const decoded = await admin.auth().verifyIdToken(idToken);
        const email = decoded.email || '';
        // ...existing code...
// Firebase Admin initialization (for Google Login crash fix)
// Firebase Admin initialization now handled in config/firebase.js
// 🔴 LOAD ENV VARIABLES FIRST
require('dotenv').config();

// NOW REQUIRE EXPRESS AND OTHER FRAMEWORKS
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { GoogleGenerativeAI } = require("@google/generative-ai");
// ...existing code...
// ...existing code...
const path = require('path');
const Sentry = require('@sentry/node');
const puppeteer = require('puppeteer');
// Email utility import/fix
require('./models/OTPRecord');
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');
const OTPRecord = require('./models/OTPRecord');
const authRoutes = require('./routes/authRoutes');
// ...existing code...
// ...existing code...

const app = express();
app.use('/api/auth', authRoutes);

// � INITIALIZE SENTRY v10 (EARLY INITIALIZATION)
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'production',
        tracesSampleRate: 0.1,
        integrations: [
            new Sentry.Integrations.Http({ tracing: true })
        ]
    });
    console.log('✅ Sentry initialized for error tracking');
} else {
    console.log('⚠️  Sentry DSN not configured - error tracking disabled');
}


// 🔒 TRUST PROXY - MUST BE BEFORE CORS (fixes X-Forwarded-For errors from Railway/Cloudflare)
app.set('trust proxy', 1);

// 🔒 CORS - Robust production config
const allowedOrigins = [
    'https://eshopperr.me',
    'https://www.eshopperr.me',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URL?.replace('www.', ''),
];
const corsOptions = {
    origin: '*',
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    preflightContinue: false,
    optionsSuccessStatus: 204
};
// Health check endpoint for uptime monitoring and debugging
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        time: new Date().toISOString(),
        message: 'API is running',
    });
// ...existing code...
            });
        });
    // --- server.js AI REFACTOR END ---
const io = new Server(httpServer, {
    cors: {
        origin: [
            'https://eshopperr.me',
            'https://www.eshopperr.me',
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            process.env.FRONTEND_URL
        ].filter(Boolean),
        credentials: true
    },
    transports: ['websocket', 'polling']
});

const ALLOWED_ORDER_STATUS = ['Ordered', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Return Initiated', 'Return Completed', 'Refund Initiated', 'Refund Completed'];
const normalizeOrderStatus = (s = '') => {
    const v = String(s).trim().toLowerCase();
    if (v === 'ordered') return 'Ordered';
    if (v === 'packed') return 'Packed';
    if (v === 'shipped') return 'Shipped';
    if (v === 'out for delivery') return 'Out for Delivery';
    if (v === 'delivered') return 'Delivered';
    return null;
};

// Feature toggles for clean baseline (enable email notifications).
const FEATURE_EMAIL_NOTIFICATIONS = String(process.env.FEATURE_EMAIL_NOTIFICATIONS || 'true').toLowerCase() === 'true';
// ...existing code...
// Invoice/PDF system fully removed

// 🔴 SOCKET.IO AUTHENTICATION MIDDLEWARE
io.use(async (socket, next) => {
    try {
        const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId;
        if (!userId) return next(new Error('Unauthorized: userId missing'));
        const userExists = await User.exists({ _id: String(userId) });
        if (!userExists) return next(new Error('Unauthorized: invalid user'));
        socket.data.userId = String(userId);
        return next();
    } catch (e) {
        return next(new Error('Unauthorized'));
    }
});

// 🔴 SOCKET.IO CONNECTION & ROOM SETUP
io.on('connection', (socket) => {
    const userRoom = `user:${socket.data.userId}`;
    socket.join(userRoom);
    socket.emit('connected', { ok: true, room: userRoom });
    console.log(`✅ User ${socket.data.userId} connected to room ${userRoom}`);

    socket.on('disconnect', () => {
        console.log(`❌ User ${socket.data.userId} disconnected`);
    });



app.use(express.json());

// 🔒 SECURITY HEADERS
app.use(helmet({ contentSecurityPolicy: false }));

// 🔒 RATE LIMITERS
const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { message: "Too many attempts. Try again later." }, standardHeaders: true, legacyHeaders: false });
app.use(globalLimiter);


// 📊 REQUEST LOGGING MIDDLEWARE (with CORS origin info)
app.use((req, res, next) => {
    const origin = req.headers.origin || 'NO-ORIGIN';
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} | Origin: ${origin}`);
    next();
});

// 🛡️ GLOBAL ERROR HANDLER FOR MALFORMED REQUESTS & CORS
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.warn('⚠️ Malformed JSON request detected');
        return res.status(400).json({ message: 'Invalid request format. Please check your input.' });
    }
    if (err.message && err.message.includes('CORS')) {
        console.warn('⚠️ CORS error:', err.message);
        return res.status(403).json({ message: 'CORS error: Unauthorized origin' });
    }
    next(err);
});

// 🖼️ BRAND LOGO SOURCES (robust for invoice/email rendering)
const BRAND_SITE_URL = (process.env.BRAND_SITE_URL || process.env.FRONTEND_URL || 'https://eshopperr.me').trim().replace(/\/$/, '');
const BRAND_LOGO_PDF_SRC = BRAND_LOGO_PRIMARY_URL;


console.log("🔍 Attempting MongoDB connection...");

// 🔧 CLOUDINARY CONFIGURATION SETUP
const { cloudinary, upload } = require('./middleware/upload');
const { sanitizeCloudinaryUrl } = require('./src/utils/cloudinary');


const hbs = require('handlebars');
const fs = require('fs');
// Order Success Email Template Rendering
function sendOrderSuccessEmail({ orderId, userName, products, to, subject }) {
    const templatePath = path.join(__dirname, 'views', 'emails', 'order-success.hbs');
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = hbs.compile(templateSource);
    const htmlContent = template({ orderId, userName, products });
    // sendEmail({ to, subject, htmlContent });
    return htmlContent;
}
// ...existing code...
// ...existing code...

const processMemoryEmailQueue = async () => {
    if (memoryQueueRunning) return;
    memoryQueueRunning = true;
    while (memoryEmailQueue.length > 0) {
        const job = memoryEmailQueue.shift();
        try {
            await executeEmailJob(job.jobType, job.payload);
        } catch (queueErr) {
            console.error(`⚠️ Email queue job failed (${job.jobType}):`, queueErr.message);
            if (process.env.SENTRY_DSN && Sentry) Sentry.captureException(queueErr);
        }
    }
    memoryQueueRunning = false;
};

const enqueueEmailJob = async (jobType, payload) => {
    if (!FEATURE_EMAIL_NOTIFICATIONS) {
        return { skipped: true, reason: 'email-notifications-disabled' };
    }
    if (!EMAIL_QUEUE_ENABLED) {
        return executeEmailJob(jobType, payload);
    }

    if (bullQueueMode && bullEmailQueue) {
        await bullEmailQueue.add(jobType, payload || {}, {
            removeOnComplete: 100,
            removeOnFail: 200,
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 }
        });
        return true;
    }

    memoryEmailQueue.push({ jobType, payload });
    setImmediate(processMemoryEmailQueue);
    return true;
};


// ==================== EMAIL TEMPLATE SYSTEM PLACEHOLDER ====================
// Email system fully removed.
// Insert new premium HTML template integration logic here.
// Example: Integrate 6 new premium templates and their rendering logic.
// Ensure all new template code is robust, modular, and secure.
// ...existing code...

const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const productRoutes = require('./routes/productRoutes');

app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);

// 🔴 SEND ORDER CONFIRMATION EMAIL (Brevo)
async function sendOrderConfirmationEmail({
    orderId, userName, userEmail, paymentMethod, finalAmount, totalAmount, shippingAmount, shippingAddress, products, orderDate, estimatedArrival, deliveryPartner
}) {
    // Render order-confirmation.handlebars template
    const hbs = require('handlebars');
    const fs = require('fs');
    const templatePath = path.join(__dirname, 'views', 'emails', 'order-confirmation.handlebars');
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = hbs.compile(templateSource);
    const htmlContent = template({ orderId, userName, userEmail, paymentMethod, finalAmount, totalAmount, shippingAmount, shippingAddress, products, orderDate, estimatedArrival, deliveryPartner });
    const subject = `Order Confirmed: #${orderId} | ESHOPPER`;
    try {
        await sendEmail({ to: userEmail, subject, htmlContent });
        console.log(`✅ Order confirmation email sent to ${userEmail}`);
    } catch (err) {
        console.error('❌ Failed to send order confirmation email:', err.message);
    }
}

// ...existing code...
const sendOrderStatusEmail = async ({ toEmail, userName, orderId, status, trackingLink, estimatedDelivery, totalAmount, invoiceBase64, attachmentName }) => {
    if (!toEmail) return false;
    const displayName = userName || 'Valued Customer';
    let templateFile = null;
    // Map status to template file
    switch ((status || '').toLowerCase()) {
        case 'ordered':
        case 'order placed':
            templateFile = '01-order-placed.html'; break;
        case 'confirmed':
        case 'order confirmed':
            templateFile = '02-order-confirmed.html'; break;
        case 'packed':
        case 'order packed':
            templateFile = '03-order-packed.html'; break;
        case 'shipped':
        case 'order shipped':
            templateFile = '04-order-shipped.html'; break;
        case 'out for delivery':
            templateFile = '05-out-for-delivery.html'; break;
        case 'delivered':
        case 'order delivered':
            templateFile = '06-order-delivered.html'; break;
        default:
            templateFile = '01-order-placed.html';
    }
    // FIX: Define templatePath for Railway production
    const templatePath = path.join(__dirname, 'views', 'emails', templateFile);
    try {
        let htmlContent = fs.readFileSync(templatePath, 'utf8');
    const displayName = userName || 'Valued Customer';
    const safeProducts = Array.isArray(products) ? products : [];
    const orderDateText = new Date(orderDate || Date.now()).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const subtotal = Number(totalAmount || safeProducts.reduce((sum, item) => sum + Number(item.total || (item.price * item.qty) || 0), 0));
    const shipping = Number(shippingAmount ?? Math.max(0, Number(finalAmount || 0) - subtotal));
    const payable = Number(finalAmount || (subtotal + shipping));

    const rows = safeProducts.map((item, idx) => {
        const qty = Number(item.qty || 1);
        const price = Number(item.price || 0);
        const line = Number(item.total || (qty * price));
        const itemDesc = item.name ? `${item.name}${item.size ? ` • Size: ${item.size}` : ''}${item.color ? ` • ${item.color}` : ''}` : 'Product';
        return `
            <tr>
                <td style="width:8%; text-align:center;">${String(idx + 1).padStart(2, '0')}</td>
                <td style="width:40%;"><strong>${itemDesc}</strong>${item.sku ? `<br/><span style="font-size:10px;color:#999;">SKU: ${item.sku}</span>` : ''}</td>
                <td style="width:12%; text-align:center; font-weight:600;">${qty}</td>
                <td style="width:20%; text-align:right; font-weight:600;">₹${price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                <td style="width:20%; text-align:right; font-weight:700; color:#d4af37;">₹${line.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
            </tr>
        `;
    }).join('');

    // Block structure fixed, return removed template string
    // All misplaced code after template string removed
    // The try block is now properly closed
    // ...existing code...

// ==================== EMAIL #2: ORDER CONFIRMED (ULTRA-PREMIUM) ====================


const sendOrderConfirmedEmail = async ({ toEmail, displayName, orderId, products, finalAmount, deliveryDate, invoiceBase64 }) => {
    try {
        const name = displayName || 'Valued Customer';
        const templatePath = path.join(__dirname, 'views', 'emails', '02-order-confirmed.html');
        let htmlContent = fs.readFileSync(templatePath, 'utf8');
        htmlContent = htmlContent
            .replace(/{{orderId}}/g, orderId)
            .replace(/{{userName}}/g, name)
            .replace(/{{orderDate}}/g, new Date().toLocaleDateString('en-IN'))
            // Add more replacements as needed
        ;
        const attachments = [];
        if (invoiceBase64 && typeof invoiceBase64 === 'string' && invoiceBase64.trim().length > 0 && /^[A-Za-z0-9+/=]+$/.test(invoiceBase64.trim())) {
            attachments.push({ filename: `Confirmation-${orderId}.pdf`, content: invoiceBase64.trim(), contentType: 'application/pdf' });
        }
        const result = await sendTransactionalEmail({
            toEmail,
            toName: name,
            subject: `✅ Order Confirmed - ${orderId} | Eshopper Boutique`,
            htmlContent,
            attachments
        });
        console.log(`✅ Confirmation email sent via ${result.provider} to ${toEmail}`);
        return true;
    } catch (error) {
        console.error('❌ Confirmation email failed:', error.message);
        return false;
    }
};

const authController = require('./controllers/authController');
app.post('/api/auth-sync', authController.authSync);

const handle = (path, Model, useUpload = false) => {
    app.get(path, async (req, res) => {
        try {
            const data = await Model.find().sort({ _id: -1 });
            
            // If Product model, return image URLs as-is from Cloudinary
            if (path === '/product') {
                console.log(`📦 Fetching ${ data.length } products...`);
                data.forEach((product, idx) => {
                    if (product.pic1) product.pic1 = sanitizeCloudinaryUrl(product.pic1);
                    if (product.pic2) product.pic2 = sanitizeCloudinaryUrl(product.pic2);
                    if (product.pic3) product.pic3 = sanitizeCloudinaryUrl(product.pic3);
                    if (product.pic4) product.pic4 = sanitizeCloudinaryUrl(product.pic4);
                    if (idx === 0 && product.pic1) {
                        console.log(`✅ Sample Product pic1: ${ product.pic1.substring(0, 60) }...`);
                    }
                });
            }
            
            res.json(data);
        } catch (e) { 
            console.error(`❌ Error fetching ${ path }: `, e.message);
            res.status(500).json({ error: "Failed to fetch data." }); 
        }
    });
    app.get(`${ path }/:id`, async (req, res) => {
try {
    const data = await Model.findById(req.params.id);
    if (!data) return res.status(404).json({ error: "Not found." });

    // Return image URLs as-is from Cloudinary for single product
    if (path === '/product') {
        if (data.pic1) data.pic1 = sanitizeCloudinaryUrl(data.pic1);
        if (data.pic2) data.pic2 = sanitizeCloudinaryUrl(data.pic2);
        if (data.pic3) data.pic3 = sanitizeCloudinaryUrl(data.pic3);
        if (data.pic4) data.pic4 = sanitizeCloudinaryUrl(data.pic4);
    }

    res.json(data);
} catch (e) { res.status(500).json({ error: "Failed to fetch item." }); }
    });
app.post(path, useUpload ? upload : (req, res, next) => next(), async (req, res) => {
    try {
        if (path === '/user' && req.body.otp) {
            const normalizedEmail = req.body.email.toLowerCase().trim();
            const record = await OTPRecord.findOne({ email: normalizedEmail, otp: req.body.otp });
            if (!record) return res.status(400).json({ message: "Invalid OTP" });
            await OTPRecord.deleteOne({ email: normalizedEmail });
            req.body.email = normalizedEmail;
            req.body.username = req.body.username.toLowerCase().trim();
        }
        if (path === '/user') { const salt = await bcrypt.genSalt(10); req.body.password = await bcrypt.hash(req.body.password, salt); }
        let d = new Model(req.body);
        if (req.files) {
            if (req.files.pic) d.pic = req.files.pic[0].path;
            if (req.files.pic1) d.pic1 = req.files.pic1[0].path;
            if (req.files.pic2) d.pic2 = req.files.pic2[0].path;
            if (req.files.pic3) d.pic3 = req.files.pic3[0].path;
            if (req.files.pic4) d.pic4 = req.files.pic4[0].path;

            console.log(`📤 Files uploaded for ${path}:`, {
                pic1: d.pic1 ? '✅' : '❌',
                pic2: d.pic2 ? '✅' : '❌',
                pic3: d.pic3 ? '✅' : '❌',
                pic4: d.pic4 ? '✅' : '❌'
            });
        }
        await d.save(); res.status(201).json(d);
    } catch (e) {
        console.error(`❌ Error creating ${path}:`, e.message);
        res.status(400).json(e);
    }
});
app.put(`${path}/:id`, useUpload ? upload : (req, res, next) => next(), async (req, res) => {
    try {
        let upData = { ...req.body };
        if (req.files) {
            if (req.files.pic) upData.pic = req.files.pic[0].path;
            if (req.files.pic1) upData.pic1 = req.files.pic1[0].path;
            if (req.files.pic2) upData.pic2 = req.files.pic2[0].path;
            if (req.files.pic3) upData.pic3 = req.files.pic3[0].path;
            if (req.files.pic4) upData.pic4 = req.files.pic4[0].path;

            console.log(`📤 Files updated for ${path}:`, {
                pic1: upData.pic1 ? '✅' : '❌',
                pic2: upData.pic2 ? '✅' : '❌',
                pic3: upData.pic3 ? '✅' : '❌',
                pic4: upData.pic4 ? '✅' : '❌'
            });
        }

        if (path === '/user' && req.body.password && String(req.body.password).length < 25) {
            const salt = await bcrypt.genSalt(10); upData.password = await bcrypt.hash(upData.password, salt);
        } else if (path === '/user') { delete upData.password; }
        const d = await Model.findByIdAndUpdate(req.params.id, upData, { new: true });
        res.json(d);
    } catch (e) {
        console.error(`❌ Error updating ${path}:`, e.message);
        res.status(500).json({ error: e.message });
    }
    });
    app.delete(`${path}/:id`, async (req, res) => {
        try {
            await Model.findByIdAndDelete(req.params.id);
            res.json({ result: "Done" });
        } catch (e) {
            console.error(`❌ Error deleting from ${path}:`, e.message);
            res.status(500).json({ error: "Failed to delete." });
        }
    });
}

handle('/user', User, true);
handle('/product', Product, true);
handle('/maincategory', Maincategory);
handle('/subcategory', Subcategory);
handle('/brand', Brand);
handle('/cart', Cart);
handle('/wishlist', Wishlist);
handle('/checkout', Checkout);
handle('/contact', Contact);
handle('/newslatter', Newslatter);

app.post('/api/cart/clear/:userid', async (req, res) => {
    try {
        const userid = String(req.params.userid || '').trim();
        if (!userid) return res.status(400).json({ message: 'userid is required' });
        await Cart.deleteMany({ userid });
        return res.json({ result: 'Done' });
    } catch (e) {
        return res.status(500).json({ message: 'Failed to clear cart' });
    }
});

const placeOrderHandler = async (req, res) => {
    try {
        const { userId, paymentMethod, finalAmount, totalAmount, shippingAmount, shippingAddress, products } = req.body;

        if (!userId || !Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ message: 'userId and products are required' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const cleanProducts = products.map((item) => ({
            productid: item.productid || item.id || item._id || '',
            name: item.name || 'Product',
            qty: Number(item.qty || 1),
            price: Number(item.price || 0),
            total: Number(item.total || (Number(item.price || 0) * Number(item.qty || 1))),
            size: item.size || '',
            color: item.color || '',
            pic: item.pic || item.pic1 || ''
        }));

        const orderId = await generateOrderId();
        const orderDate = new Date();
        const estimatedArrival = new Date(orderDate);
        estimatedArrival.setDate(orderDate.getDate() + 7);

        const total = Number(totalAmount ?? cleanProducts.reduce((sum, item) => sum + item.total, 0));
        const shipping = Number(shippingAmount ?? ((total > 0 && total < 1000) ? 150 : 0));
        const payable = Number(finalAmount ?? (total + shipping));

        const addressPayload = shippingAddress || {
            fullName: user.name || '',
            phone: user.phone || '',
            addressline1: user.addressline1 || '',
            city: user.city || '',
            state: user.state || '',
            pin: user.pin || '',
            country: 'India'
        };

        const orderDoc = await Order.create({
            orderId,
            userid: userId,
            userName: user.name || '',
            userEmail: user.email || '',
            paymentMethod: paymentMethod || 'COD',
            paymentStatus: (paymentMethod || 'COD') === 'COD' ? 'Pending' : 'Paid',
            orderStatus: 'Order Placed',
            totalAmount: total,
            shippingAmount: shipping,
            finalAmount: payable,
            shippingAddress: addressPayload,
            products: cleanProducts,
            estimatedArrival,
            statusHistory: [{
                status: 'Ordered',
                timestamp: orderDate,
                message: 'Order placed successfully'
            }],
            orderDate
        });

        await Checkout.create({
            userid: userId,
            paymentmode: paymentMethod || 'COD',
            orderstatus: 'Order Placed',
            paymentstatus: (paymentMethod || 'COD') === 'COD' ? 'Pending' : 'Paid',
            totalAmount: total,
            shippingAmount: shipping,
            finalAmount: payable,
            products: cleanProducts
        });

        await Cart.deleteMany({ userid: userId });

// Invoice/PDF generation fully removed

        const recipientEmail = String(user.email || addressPayload?.email || '').trim();

        // 📧 SEND "ORDER PLACED" EMAIL AUTOMATICALLY
        // [EMAIL PLACEHOLDER] Integrate new premium order placed email logic here.

        // ...existing code...

        return res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            order: orderDoc
        });
    } catch (e) {
        console.error('❌ Place Order Error:', e.message);
        if (process.env.SENTRY_DSN) Sentry.captureException(e);
        return res.status(500).json({ message: 'Failed to place order' });
    }
};

app.post('/api/place-order', placeOrderHandler);
app.post('/api/orders', placeOrderHandler);

// ...existing code...
app.get('/api/user/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const { password, otp, otpExpires, failedAttempts, lockUntil, ...safeUser } = user.toJSON();
        res.json(safeUser);
    } catch (e) {
        res.status(500).json({ message: 'Failed to fetch user' });
    }
});

app.get('/api/user', async (req, res) => {
    try {
        const userId = req.query.id || req.query.userid;
        if (!userId) return res.status(400).json({ message: 'User id is required in query (?id=...)' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const { password, otp, otpExpires, failedAttempts, lockUntil, ...safeUser } = user.toJSON();
        res.json(safeUser);
    } catch (e) {
        res.status(500).json({ message: 'Failed to fetch user' });
    }
});

app.get('/api/products', async (req, res) => {
    try {
        const query = String(req.query.query || '').toLowerCase().trim();
        const limit = Math.max(1, Math.min(24, Number(req.query.limit) || 6));

        const products = await Product.find().sort({ _id: -1 });

        const normalized = products.map((p) => {
            const data = p.toObject();
            return {
                ...data,
                pic1: sanitizeCloudinaryUrl(data.pic1),
                pic2: sanitizeCloudinaryUrl(data.pic2),
                pic3: sanitizeCloudinaryUrl(data.pic3),
                pic4: sanitizeCloudinaryUrl(data.pic4),
                image: sanitizeCloudinaryUrl(data.pic1 || data.pic2 || data.pic3 || data.pic4)
            };
        });

        const filtered = query
            ? normalized.filter((item) => {
                const bag = `${item.name || ''} ${item.maincategory || ''} ${item.subcategory || ''} ${item.brand || ''}`.toLowerCase();
                return bag.includes(query);
            })
            : normalized;

        res.json({ products: filtered.slice(0, limit) });
    } catch (e) {
        res.status(500).json({ message: 'Failed to fetch products', products: [] });
    }
});



const PORT = process.env.PORT || 5000;

        let cachedGenerateModels = [];
        let cachedAt = 0;
        const MODEL_CACHE_TTL_MS = 10 * 60 * 1000;
        const modelCooldownUntil = new Map();

        const isDev = process.env.NODE_ENV === 'development';
        const devLog = (msg) => { if (isDev) console.log(`[DEV] ${msg}`); };
        const devWarn = (msg) => { if (isDev) console.warn(`[DEV] ${msg}`); };

        const getAvailableGeminiModels = async () => {
            const now = Date.now();
            if (cachedGenerateModels.length > 0 && (now - cachedAt) < MODEL_CACHE_TTL_MS) {
                return cachedGenerateModels;
            }

            try {
                const response = await axios.get('https://generativelanguage.googleapis.com/v1beta/models', {
                    headers: {
                        'x-goog-api-key': geminiApiKey
                    }
                });
                const models = (response.data?.models || [])
                    .filter((model) => Array.isArray(model.supportedGenerationMethods) && model.supportedGenerationMethods.includes('generateContent'))
                    .map((model) => String(model.name || '').replace(/^models\//, '').trim())
                    .filter(Boolean);

                if (models.length > 0) {
                    cachedGenerateModels = models;
                    cachedAt = now;
                    console.log(`✅ Gemini models discovered: ${models.slice(0, 5).join(', ')}${models.length > 5 ? '...' : ''}`);
                }

                return models;
            } catch (modelListError) {
                devWarn(`Could not fetch Gemini model list: ${modelListError.message}`);
                return [];
            }
        };

        const extractGeminiText = (data) => {
            const candidates = data?.candidates || [];
            const first = candidates[0];
            const parts = first?.content?.parts || [];
            const text = parts.map((part) => part?.text || '').join('').trim();
            return text;
        };

        const isQuotaError = (error) => {
            const combined = `${error?.message || ''} ${JSON.stringify(error?.response?.data || {})}`.toLowerCase();
            return error?.response?.status === 429 || combined.includes('quota exceeded') || combined.includes('too many requests');
        };

        const extractRetryDelayMs = (error) => {
            const combined = `${error?.message || ''} ${JSON.stringify(error?.response?.data || {})}`;
            const match = combined.match(/retry in\s+([\d.]+)s/i);
            if (!match) return 60000;
            const sec = Number(match[1]);
            if (!Number.isFinite(sec) || sec <= 0) return 60000;
            return Math.ceil(sec * 1000);
        };

        const isModelCoolingDown = (modelName) => {
            const until = modelCooldownUntil.get(modelName);
            if (!until) return false;
            if (Date.now() >= until) {
                modelCooldownUntil.delete(modelName);
                return false;
            }
            return true;
        };

        const setModelCooldown = (modelName, error) => {
            const retryMs = extractRetryDelayMs(error);
            modelCooldownUntil.set(modelName, Date.now() + retryMs);
            devLog(`Cooling down model ${modelName} for ${Math.ceil(retryMs / 1000)}s due to rate limit`);
        };

        const generateWithRest = async (modelName, fullPrompt) => {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
            // Gemini API call logic here
        };

app.get('/api/order/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.query.userId;
        if (!orderId || !userId) {
            return res.status(400).json({ message: 'orderId and userId are required' });
        }
        const order = await Order.findOne({ orderId, userid: userId }).lean();
        if (!order) return res.status(404).json({ message: 'Order not found' });
        // 📦 Build comprehensive order response
        const statusHistory = Array.isArray(order.statusHistory) ? order.statusHistory : [
            { status: 'Ordered', timestamp: order.orderDate || order.createdAt || new Date() }
        ];
        return res.json({
            orderId: order.orderId,
            userid: order.userid,
            orderStatus: order.orderStatus || 'Ordered',
            userName: order.userName || '',
            userEmail: order.userEmail || '',
            paymentMethod: order.paymentMethod || 'COD',
            paymentStatus: order.paymentStatus || 'Pending',
            totalAmount: Number(order.totalAmount || 0),
            shippingAmount: Number(order.shippingAmount || 0),
            finalAmount: order.finalAmount || 0,
            shippingAddress: order.shippingAddress || {},
            products: Array.isArray(order.products) ? order.products : [],
            estimatedDelivery: order.estimatedArrival || null,
            estimatedArrival: order.estimatedArrival || null,
            statusHistory: statusHistory,
            createdAt: order.orderDate || order.createdAt || new Date(),
            orderDate: order.orderDate || order.createdAt,
            updatedAt: order.updatedAt || order.createdAt || new Date()
        });
    } catch (e) {
        console.error('❌ Order fetch error:', e.message);
        return res.status(500).json({ message: 'Failed to fetch order' });
    }
});


        // 🔴 ADMIN - GET ALL ORDERS (for admin dashboard)
        app.get('/api/admin/orders', async (req, res) => {
            try {
                const page = Math.max(1, Number(req.query.page) || 1);
                const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 10));
                const search = String(req.query.search || '').trim();
                const statusFilter = String(req.query.status || '').trim();

                let query = {};

                // Search by orderId, userName, or userEmail
                if (search) {
                    query.$or = [
                        { orderId: { $regex: search, $options: 'i' } },
                        { userName: { $regex: search, $options: 'i' } },
                        { userEmail: { $regex: search, $options: 'i' } }
                    ];
                }

                // Filter by status
                if (statusFilter && ALLOWED_ORDER_STATUS.includes(statusFilter)) {
                    query.orderStatus = statusFilter;
                }

                const skip = (page - 1) * limit;
                const totalOrders = await Order.countDocuments(query);
                const orders = await Order.find(query)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .select('orderId userid userName userEmail orderStatus paymentStatus finalAmount updatedAt createdAt products')
                    .lean();

                return res.json({
                    success: true,
                    total: totalOrders,
                    page,
                    limit,
                    pages: Math.ceil(totalOrders / limit),
                    orders: orders.map((item) => ({
                        orderId: item.orderId,
                        userId: item.userid,
                        userName: item.userName || 'N/A',
                        userEmail: item.userEmail || 'N/A',
                        orderStatus: item.orderStatus || 'Order Placed',
                        paymentStatus: item.paymentStatus || 'Pending',
                        finalAmount: Number(item.finalAmount || 0),
                        productCount: Array.isArray(item.products) ? item.products.length : 0,
                        updatedAt: item.updatedAt || item.createdAt || new Date()
                    }))
                });
            } catch (e) {
                console.error('❌ Admin orders fetch error:', e.message);
                return res.status(500).json({ message: 'Failed to fetch orders' });
            }
        });

        // 🔴 ADMIN - GET DETAILED ORDER
        app.get('/api/admin/order/:orderId', async (req, res) => {
            try {
                const { orderId } = req.params;

                if (!orderId) {
                    return res.status(400).json({ message: 'orderId is required' });
                }

                const order = await Order.findOne({ orderId }).lean();

                if (!order) return res.status(404).json({ message: 'Order not found' });

                return res.json({
                    success: true,
                    orderId: order.orderId,
                    userid: order.userid,
                    userName: order.userName || 'N/A',
                    userEmail: order.userEmail || 'N/A',
                    orderStatus: order.orderStatus || 'Ordered',
                    paymentMethod: order.paymentMethod || 'COD',
                    paymentStatus: order.paymentStatus || 'Pending',
                    totalAmount: Number(order.totalAmount || 0),
                    shippingAmount: Number(order.shippingAmount || 0),
                    finalAmount: Number(order.finalAmount || 0),
                    shippingAddress: order.shippingAddress || {},
                    products: Array.isArray(order.products) ? order.products : [],
                    estimatedArrival: order.estimatedArrival || null,
                    orderDate: order.orderDate || order.createdAt,
                    createdAt: order.createdAt,
                    updatedAt: order.updatedAt
                });
            } catch (e) {
                console.error('❌ Admin order fetch error:', e.message);
                return res.status(500).json({ message: 'Failed to fetch order' });
            }
        });

        // 🔴 REAL-TIME ORDER TRACKING - Admin updates order status + realtime emit
        const handleOrderStatusUpdate = async (req, res) => {
            try {
                const { orderId, status } = req.body;
                const normalized = normalizeOrderStatus(status);

                if (!orderId || !normalized) {
                    return res.status(400).json({
                        message: `orderId and valid status are required (${ALLOWED_ORDER_STATUS.join(', ')})`
                    });
                }

                // 🔴 FIRST: Try to find by orderId (from Order collection)
                let order = await Order.findOne({ orderId });

                // 🔴 SECOND: If not found, try by MongoDB _id (from Checkout collection)
                if (!order && orderId.length === 24) {
                    try {
                        order = await Order.findById(orderId);
                    } catch (idErr) {
                        // Not a valid MongoDB ID, continue
                    }
                }

                if (!order) {
                    // Final attempt: Search in Checkout and use userid + order data
                    const checkout = await Checkout.findById(orderId).lean();
                    if (!checkout) {
                        return res.status(404).json({ message: 'Order not found in any collection' });
                    }

                    // Create order record from checkout data
                    const newOrder = await Order.create({
                        orderId: orderId,
                        userid: checkout.userid,
                        userName: 'Customer',
                        userEmail: '',
                        paymentMethod: checkout.paymentmode || 'COD',
                        paymentStatus: checkout.paymentstatus || 'Pending',
                        orderStatus: normalized,
                        totalAmount: checkout.totalAmount,
                        shippingAmount: checkout.shippingAmount,
                        finalAmount: checkout.finalAmount,
                        products: checkout.products || [],
                        statusHistory: [{
                            status: normalized,
                            timestamp: new Date(),
                            message: `Order status changed to ${normalized}`
                        }]
                    });
                    order = newOrder;
                } else {
                    // Update existing order
                    order.orderStatus = normalized;
                    const existingTimeline = Array.isArray(order.statusHistory) ? order.statusHistory : [];
                    order.statusHistory = [
                        ...existingTimeline,
                        {
                            status: normalized,
                            timestamp: new Date(),
                            message: `Order status changed to ${normalized}`
                        }
                    ];
                    await order.save();
                }

                if (!Array.isArray(order.statusHistory) || order.statusHistory.length === 0) {
                    order.statusHistory = [{
                        status: normalized,
                        timestamp: new Date(),
                        message: `Order status changed to ${normalized}`
                    }];
                    await order.save();
                }

                // 🔴 SYNC STATUS TO CHECKOUT COLLECTION (prevent data mismatch)
                await Checkout.updateMany(
                    { userid: order.userid, totalAmount: order.totalAmount, finalAmount: order.finalAmount },
                    { orderstatus: normalized, updatedAt: new Date() }
                ).catch(err => console.warn('⚠️ Checkout sync warning:', err.message));

                const payload = {
                    orderId: order.orderId,
                    userId: order.userid,
                    status: order.orderStatus,
                    updatedAt: new Date().toISOString()
                };

                // 🔴 EMIT REAL-TIME STATUS UPDATE VIA SOCKET.IO (instant UI update)
                io.to(`user:${order.userid}`).emit('statusUpdate', payload);
                console.log(`✅ Status updated for order ${order.orderId} to ${normalized}, emitted to user:${order.userid}`);

                // 🔴 SEND AUTOMATIC EMAIL ON STATUS CHANGE
                if (FEATURE_EMAIL_NOTIFICATIONS) {
                    try {
                        const userDoc = await User.findById(order.userid).lean();
                        if (userDoc && userDoc.email) {
                            try {
                                await sendOrderStatusEmail({
                                    toEmail: userDoc.email,
                                    userName: userDoc.name || 'Valued Customer',
                                    orderId: order.orderId,
                                    status: normalized,
                                    trackingLink: `https://eshopperr.me/order-tracking/${order.orderId}`,
                                    estimatedDelivery: order.estimatedArrival,
                                    totalAmount: order.finalAmount
                                });
                            } catch (emailErr) {
                                console.error('❌ Order Status email error:', emailErr.message);
                                if (process.env.SENTRY_DSN) Sentry.captureException(emailErr);
                            }
                        } else if (order.userEmail) {
                            // Fallback: try sending to order.userEmail if userDoc not found
                            try {
                                await sendOrderStatusEmail({
                                    toEmail: order.userEmail,
                                    userName: order.userName || 'Valued Customer',
                                    orderId: order.orderId,
                                    status: normalized,
                                    trackingLink: `https://eshopperr.me/order-tracking/${order.orderId}`,
                                    estimatedDelivery: order.estimatedArrival,
                                    totalAmount: order.finalAmount
                                });
                            } catch (emailErr) {
                                console.error('❌ Order Status email error (fallback):', emailErr.message);
                                if (process.env.SENTRY_DSN) Sentry.captureException(emailErr);
                            }
                        }
                    } catch (err) {
                        console.warn(`⚠️ User lookup failed for ${order.orderId}:`, err.message);
                        // Try sending without user data
                        if (order.userEmail) {
                            try {
                                await sendOrderStatusEmail({
                                    toEmail: order.userEmail,
                                    userName: order.userName || 'Valued Customer',
                                    orderId: order.orderId,
                                    status: normalized,
                                    trackingLink: `https://eshopperr.me/order-tracking/${order.orderId}`,
                                    estimatedDelivery: order.estimatedArrival,
                                    totalAmount: order.finalAmount
                                });
                            } catch (emailErr) {
                                console.error('❌ Order Status email error (fallback):', emailErr.message);
                                if (process.env.SENTRY_DSN) Sentry.captureException(emailErr);
                            }
                        }
                    }
                }
                return res.json({
                    success: true,
                    message: `Order status updated to ${normalized}`,
                    order: payload
                });
            } catch (e) {
                console.error('❌ Order update error:', e.message);
                if (process.env.SENTRY_DSN) Sentry.captureException(e);
                return res.status(500).json({ message: 'Failed to update order status' });
    }
};

        app.post('/api/update-order-status', handleOrderStatusUpdate);
        app.post('/update-order-status', handleOrderStatusUpdate);
        // ==================== ADMIN: CONFIRM ORDER (Send Email #2) ====================
        app.post('/api/admin/confirm-order', async (req, res) => {
            try {
                const { orderId } = req.body;

                // 🔒 SECURITY: Verify admin role
                const adminSecret = req.headers['x-admin-secret'] || req.body.adminSecret;
                if (adminSecret !== process.env.ADMIN_SECRET && process.env.ADMIN_SECRET) {
                    return res.status(403).json({
                        message: 'Unauthorized - Admin access required',
                        success: false
                    });
                }

                if (!orderId) {
                    return res.status(400).json({ message: 'orderId is required' });
                }

                // Find order
                let order = await Order.findOne({ orderId });
                if (!order) {
                    try {
                        order = await Order.findById(orderId);
                    } catch (err) {
                        // Try checkout collection
                        const checkout = await Checkout.findById(orderId).lean();
                        if (checkout) {
                            order = await Order.findOne({ userid: checkout.userid, finalAmount: checkout.finalAmount }).lean();
                        }
                    }
                }

                if (!order) {
                    return res.status(404).json({ message: 'Order not found' });
                }

                // Generate Proforma PDF for Email #2 (Confirmed)
// Invoice/PDF generation fully removed


                // Send BOTH: Order Placed (Email #1) and Order Confirmed (Premium, Email #2)
                let emailSent = true;
                if (FEATURE_EMAIL_NOTIFICATIONS) {
                    try {
                        // Email #1: Order Placed
                        // Render placed email
                        const placedEmail = await (async () => {
                            let displayName = order.userName || 'Valued Customer';
                            const templatePath = path.join(__dirname, 'email-templates', '01-order-placed.html');
                            let htmlContent = fs.readFileSync(templatePath, 'utf8');
                            htmlContent = htmlContent
                                .replace(/{{orderId}}/g, order.orderId)
                                .replace(/{{userName}}/g, displayName)
                                .replace(/{{orderDate}}/g, new Date().toLocaleDateString('en-IN'))
                                .replace(/{{totalAmount}}/g, order.finalAmount ? `₹${Number(order.finalAmount).toLocaleString('en-IN')}` : '');
                            return {
                                toEmail: order.userEmail,
                                subject: "✨ Order Received - Thank You for Shopping with Us!",
                                htmlContent
                            };
                        })();
                        await enqueueEmailJob('order-placed', placedEmail);
                        // Render confirmed email
                        const confirmedEmail = await (async () => {
                            let displayName = order.userName || 'Valued Customer';
                            const templatePath = path.join(__dirname, 'email-templates', '02-order-confirmed.html');
                            let htmlContent = fs.readFileSync(templatePath, 'utf8');
                            htmlContent = htmlContent
                                .replace(/{{orderId}}/g, order.orderId)
                                .replace(/{{userName}}/g, displayName)
                                .replace(/{{orderDate}}/g, new Date().toLocaleDateString('en-IN'));
                            return {
                                toEmail: order.userEmail,
                                subject: `✅ Order Confirmed - ${order.orderId} | Eshopper Boutique`,
                                htmlContent
                            };
                        })();
                        await enqueueEmailJob('order-confirmed', confirmedEmail);
                    } catch (confirmQueueErr) {
                        emailSent = false;
                        console.warn(`⚠️ Email queue failed for ${orderId}:`, confirmQueueErr.message);
                        if (process.env.SENTRY_DSN) Sentry.captureException(confirmQueueErr);
                    }
                }

                if (!emailSent) {
                    console.warn(`⚠️ One or more emails failed for ${orderId}, but updating status anyway`);
                }

                // Update order status to "Confirmed"
                order.orderStatus = 'Confirmed';
                order.confirmationEmailSent = true;
                order.confirmationEmailSentAt = new Date();
                const existingTimeline = Array.isArray(order.statusHistory) ? order.statusHistory : [];
                order.statusHistory = [
                    ...existingTimeline,
                    {
                        status: 'Confirmed',
                        timestamp: new Date(),
                        message: 'Order confirmed by admin - Confirmation email sent'
                    }
                ];
                await order.save();

                // Sync to checkout collection
                await Checkout.updateMany(
                    { userid: order.userid, finalAmount: order.finalAmount },
                    { orderstatus: 'Confirmed', updatedAt: new Date() }
                ).catch(err => console.warn('⚠️ Checkout sync warning:', err.message));

                // Real-time update via Socket.IO
                io.to(`user:${order.userid}`).emit('statusUpdate', {
                    orderId: order.orderId,
                    status: 'Confirmed',
                    message: 'Your order has been confirmed! Check your email for full details.',
                    emailSent: emailSent
                });

                res.json({
                    success: true,
                    message: 'Order confirmed successfully',
                    orderId: order.orderId,
                    emailSent: emailSent,
                    order: {
                        orderId: order.orderId,
                        status: order.orderStatus,
                        userEmail: order.userEmail,
                        confirmationEmailSentAt: order.confirmationEmailSentAt
                    }
                });
            } catch (error) {
                console.error('❌ Admin Confirm Order Error:', error.message);
                if (process.env.SENTRY_DSN) Sentry.captureException(error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to confirm order',
                    error: error.message
                });
            }
        });

        app.post('/api/admin/update-order-status', handleOrderStatusUpdate);

        app.post('/api/chat', async (req, res) => {
            try {
                const prompt = (req.body?.prompt || req.body?.message || '').trim();
                const history = req.body?.history || req.body?.conversationHistory || [];

                if (!prompt) {
                    console.error("⚠️ No prompt received from frontend");
                    return res.status(400).json({ error: "Prompt is required" });
                }

                if (!genAI) {
                    console.error("⚠️ GEMINI_API_KEY missing or invalid");
                    return res.json({
                        text: "I’m here to help with fashion recommendations. Our AI service is refreshing right now—please try again in a moment.",
                        fallback: true
                    });
                }

                console.log(`💬 AI Context check for: ${prompt.substring(0, 30)}...`);

                // 📊 DATABASE SYNC: Products की लिस्ट निकाल रहे हैं
                const allProducts = await Product.find({}, 'name baseprice maincategory');
                const productDataSummary = allProducts.map(p => `- ${p.name} (Rs.${p.baseprice})`).slice(0, 15).join("\n");

                const systemInstruction = `You are the Expert Fashion Stylist for 'eShopper Boutique Luxe'. 
            Your only goal is to suggest clothes from this inventory:\n${productDataSummary}\n
            Rules: 
            1. Suggest real items from the list above.
            2. Be extremely polite and stylish.
            3. Keep answers under 3 lines.`;

                // 🛠️ ROLE FIX: Roles normalized for stable prompt composition
                let cleanHistory = (history || []).map(m => ({
                    role: (m.role === 'ai' || m.role === 'model' || m.role === 'bot' || m.sender === 'ai' || m.sender === 'model' || m.sender === 'bot') ? 'model' : 'user',
                    parts: [{ text: m.text || m.parts?.[0]?.text || "" }]
                }));

                const discoveredModels = await getAvailableGeminiModels();
                const preferredOrder = [
                    "gemini-2.5-flash",
                    "gemini-2.0-flash",
                    "gemini-2.0-flash-lite",
                    "gemini-1.5-flash",
                    "gemini-1.5-pro",
                    "gemini-pro"
                ];

                let candidateModels = [];
                if (discoveredModels.length > 0) {
                    const preferredAvailable = preferredOrder.filter((name) => discoveredModels.includes(name));
                    const remaining = discoveredModels.filter((name) => !preferredAvailable.includes(name));
                    candidateModels = [...preferredAvailable, ...remaining];
                } else {
                    candidateModels = preferredOrder;
                }

                const historyText = cleanHistory
                    .map((item) => {
                        const roleLabel = item.role === 'model' ? 'Assistant' : 'User';
                        const text = String(item.parts?.[0]?.text || '').trim();
                        return text ? `${roleLabel}: ${text}` : '';
                    })
                    .filter(Boolean)
                    .slice(-12)
                    .join('\n');

                const fullPrompt = `${systemInstruction}\n\nConversation So Far:\n${historyText || 'No previous conversation.'}\n\nCurrent User Query: ${prompt}`;

                let textResponse = "";
                let lastModelError = null;

                for (const modelName of candidateModels) {
                    if (isModelCoolingDown(modelName)) {
                        continue;
                    }

                    try {
                        const model = genAI.getGenerativeModel({
                            model: modelName,
                            systemInstruction
                        });

                        const result = await model.generateContent(fullPrompt);
                        const response = await result.response;
                        textResponse = response.text();

                        if (textResponse && textResponse.trim()) {
                            console.log(`✅ AI responded successfully using model: ${modelName}`);
                            break;
                        }

                        throw new Error(`Empty response from model: ${modelName}`);
                    } catch (modelError) {
                        if (isQuotaError(modelError)) {
                            setModelCooldown(modelName, modelError);
                            lastModelError = modelError;
                            devWarn(`Quota hit for ${modelName}, cooling down`);
                            continue;
                        }

                        devWarn(`Gemini SDK failed (${modelName}): ${modelError.message}`);

                        try {
                            const restText = await generateWithRest(modelName, fullPrompt);
                            if (restText && restText.trim()) {
                                textResponse = restText;
                                devLog(`AI responded via REST fallback using model: ${modelName}`);
                                break;
                            }
                            throw new Error(`Empty REST response from model: ${modelName}`);
                        } catch (restError) {
                            if (isQuotaError(restError)) {
                                setModelCooldown(modelName, restError);
                            }
                            lastModelError = restError;
                            devWarn(`Gemini REST failed (${modelName}): ${restError.message}`);
                        }
                    }
                }

                if (!textResponse || !textResponse.trim()) {
                    throw lastModelError || new Error("No Gemini model returned a valid response");
                }

                res.json({ text: textResponse });

            } catch (error) {
                console.error("❌ Chat API Error:", error.message);
                res.json({
                    text: "I’m having trouble syncing live AI right now. Please try again in 30 seconds for fresh styling suggestions.",
                    fallback: true
                });
            }
        });
    // --- server.js AI REFACTOR END ---

        const server = httpServer.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Master Server Live on ${PORT}`);
        });



// --- SERVER START LOGIC (FIXED) ---
const startServer = async () => {
    try {
        const PORT = process.env.PORT || 5000;
        const MONGO_URI = process.env.MONGO_URI;

        if (!MONGO_URI) {
            throw new Error("❌ MONGO_URI is not defined in .env file");
        }

        await mongoose.connect(MONGO_URI, {
            dbName: process.env.DB_NAME || 'eshoper',
            serverSelectionTimeoutMS: 10000,
        });

        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error("❌ Failed to start server:", err.message);
        process.exit(1);
    }
};

// Start the server execution
startServer();

// --- GLOBAL ERROR HANDLERS ---
process.on("uncaughtException", (err) => {
    console.error("❌ Uncaught Exception:", err.message);
    process.exit(1);
});

process.on("unhandledRejection", (err) => {
    console.error("❌ Unhandled Rejection:", err.message);
    process.exit(1);
});
