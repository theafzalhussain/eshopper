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
    });
// ...existing code...

// Apply CORS before any routes or middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// 🔴 CREATE HTTP SERVER + SOCKET.IO (after app is defined)
const httpServer = http.createServer(app);
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
const FEATURE_INVOICE_SYSTEM = String(process.env.FEATURE_INVOICE_SYSTEM || 'false').toLowerCase() === 'true';

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

// 🔴 BUILD TAX INVOICE HTML - For download after delivery with legal compliance
const buildTaxInvoiceHtml = ({
    orderId,
    userName,
    userEmail,
    paymentMethod,
    paymentStatus,
    finalAmount,
    totalAmount,
    shippingAmount,
    shippingAddress,
    products,
    orderDate
}) => {
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

    // Render tax-invoice.handlebars template
    const hbs = require('handlebars');
    const fs = require('fs');
    const templatePath = path.join(__dirname, 'views', 'emails', 'tax-invoice.handlebars');
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = hbs.compile(templateSource);
    return template({ orderId, userName, userEmail, paymentMethod, paymentStatus, finalAmount, totalAmount, shippingAmount, shippingAddress, products, orderDate });
};
// ...existing code...

const buildInvoiceHtml = ({
    orderId,
    userName,
    userEmail,
    paymentMethod,
    paymentStatus,
    finalAmount,
    totalAmount,
    shippingAmount,
    shippingAddress,
    products,
    orderDate
}) => {
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

    return `
        <!doctype html>
        <html>
        <head>
            <meta charset="utf-8"/>
            <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                html { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                body { background: #f5f5f3; color: #121212; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; line-height: 1.6; }
                .wrap { max-width: 900px; margin: 0 auto; padding: 16px; }
                .card { background: #fff; border: 3px solid #d4af37; border-radius: 20px; overflow: hidden; box-shadow: 0 12px 32px rgba(0,0,0,0.12); }


// 🔴 WHATSAPP MEDIA FUNCTION - FOR SHIPPED STATUS WITH IMAGE

// 🔴 LUXURY STATUS NOTIFICATION ORCHESTRATOR
};

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
        htmlContent = htmlContent
            .replace(/{{orderId}}/g, orderId)
            .replace(/{{userName}}/g, displayName)
            .replace(/{{orderDate}}/g, new Date().toLocaleDateString('en-IN'))
            .replace(/{{trackingLink}}/g, trackingLink || '')
            .replace(/{{status}}/g, status || '')
            .replace(/{{estimatedDelivery}}/g, estimatedDelivery ? new Date(estimatedDelivery).toLocaleDateString('en-IN') : '')
                .replace(/{{totalAmount}}/g, totalAmount ? `₹${Number(totalAmount).toLocaleString('en-IN')}` : '');
        const attachments = [];
        if (invoiceBase64 && typeof invoiceBase64 === 'string' && invoiceBase64.trim().length > 0 && /^[A-Za-z0-9+/=]+$/.test(invoiceBase64.trim())) {
            attachments.push({
                filename: attachmentName || `Invoice-${orderId}.pdf`,
                content: invoiceBase64.trim(),
                contentType: 'application/pdf'
            });
        }
        const result = await sendTransactionalEmail({
            toEmail,
            toName: displayName,
            subject: `${status || 'Order Update'} - Order ${orderId} | Eshopper Boutique`,
            htmlContent,
            attachments
        });
        console.log(`✅ Status email sent via ${result.provider}: ${orderId} -> ${status}`);
        return true;
    } catch (error) {
        console.error('❌ Status email failed:', error.message);
        return false;
    }
};

// ==================== EMAIL #1: ORDER PLACED (IMMEDIATE NOTIFICATION) ====================

const sendOrderPlacedEmail = async ({ toEmail, userName, orderId, finalAmount, products, shippingAddress, invoiceBuffer }) => {
    if (!toEmail || !toEmail.includes('@')) {
        console.error('❌ Invalid email:', toEmail);
        throw new Error('Invalid toEmail address');
    }
    try {
        const displayName = userName || 'Valued Customer';
        const templatePath = path.join(__dirname, 'views', 'emails', '01-order-placed.html');
        let htmlContent = fs.readFileSync(templatePath, 'utf8');
        htmlContent = htmlContent
            .replace(/{{orderId}}/g, orderId)
            .replace(/{{userName}}/g, displayName)
            .replace(/{{orderDate}}/g, new Date().toLocaleDateString('en-IN'))
            .replace(/{{totalAmount}}/g, finalAmount ? `₹${Number(finalAmount).toLocaleString('en-IN')}` : '')
            // Add more replacements as needed
        ;
        const attachments = invoiceBuffer
            ? [{ filename: `Receipt-${orderId}.pdf`, content: invoiceBuffer, contentType: 'application/pdf' }]
            : [];
        const result = await sendTransactionalEmail({
            toEmail,
            toName: displayName,
            subject: "✨ Order Received - Thank You for Shopping with Us!",
            htmlContent,
            attachments
        });
        console.log(`✅ Order Placed email sent via ${result.provider} to ${toEmail} for ${orderId}`);
        return true;
    } catch (error) {
        console.error('❌ Order Placed email failed:', error.message);
        return false;
    }
};

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
    });
        await Model.findByIdAndDelete(req.params.id);
        res.json({ result: "Done" });
    } catch (e) {
        console.error(`❌ Error deleting from ${path}:`, e.message);
        res.status(500).json({ error: "Failed to delete." });
    }
});
};

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

        let invoiceBuffer = null;
        if (FEATURE_INVOICE_SYSTEM) {
            try {
                invoiceBuffer = await generateInvoicePdfBuffer({
                    orderId,
                    userName: user.name,
                    userEmail: user.email,
                    paymentMethod: paymentMethod || 'COD',
                    paymentStatus: (paymentMethod || 'COD') === 'COD' ? 'Pending' : 'Paid',
                    finalAmount: payable,
                    totalAmount: total,
                    shippingAmount: shipping,
                    shippingAddress: addressPayload,
                    products: cleanProducts,
                    orderDate,
                    orderStatus: 'Order Placed',
                    pdfType: 'receipt',
                    isDelivered: false
                });
            } catch (invoiceError) {
                console.error('Invoice PDF generation failed:', invoiceError.message);
                if (process.env.SENTRY_DSN) Sentry.captureException(invoiceError);
            }
        }

        const recipientEmail = String(user.email || addressPayload?.email || '').trim();

        // 📧 SEND "ORDER PLACED" EMAIL AUTOMATICALLY
        // [EMAIL PLACEHOLDER] Integrate new premium order placed email logic here.

        // 📲 SEND WHATSAPP NOTIFICATION (if enabled)
        if (FEATURE_WHATSAPP_NOTIFICATIONS) {
            try {
                const phoneNumber = addressPayload?.phone || user.phone;

                console.log(`\n🔔 WhatsApp Notification Debug for Order ${orderId}:`);
                console.log(`   User: ${user.name} (${userId})`);
                console.log(`   Email: ${user.email}`);
                console.log(`   Phone from profile: "${user.phone || 'NOT SET'}"`);
                console.log(`   Phone from address: "${addressPayload?.phone || 'NOT PROVIDED'}"`);
                console.log(`   Final phone: "${phoneNumber || 'MISSING'}"\n`);

                if (!phoneNumber) {
                    console.log(`ℹ️  WhatsApp SKIPPED - No phone number in profile. User should update profile at: https://eshopperr.me/profile\n`);
                } else {
                    const itemSummary = cleanProducts
                        .slice(0, 5)
                        .map((item, idx) => `   ${idx + 1}. ${item.name}\n      Qty: ${item.qty} | Rate: ₹${Number(item.price || 0).toLocaleString('en-IN')} | Subtotal: ₹${Number(item.total || 0).toLocaleString('en-IN')}`)
                        .join('\n');

                    const savedAmount = total - payable;
                    const discountInfo = savedAmount > 0 ? `\n💰 Total Savings: ₹${Number(savedAmount).toLocaleString('en-IN')}` : '';
                    const estimatedDays = 5; // Default 5 days delivery
                    const deliveryDate = new Date();
                    deliveryDate.setDate(deliveryDate.getDate() + estimatedDays);
                    const formattedDeliveryDate = deliveryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

                    const whatsappMsg = `✨ LUXURY EXPERIENCE STARTS NOW! 💎\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nHello ${(user.name || 'Valued Customer').split(' ')[0]} 👋\nThank you for your exquisite order!\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ ORDER CONFIRMED\nOrder ID: #${orderId}\nOrder Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}\n\n📦 YOUR PREMIUM ITEMS:\n${itemSummary}${cleanProducts.length > 5 ? `\n   + ${cleanProducts.length - 5} more exclusive item(s)` : ''}\n\n💹 ORDER BREAKDOWN:\n   Subtotal: ₹${Number(total || 0).toLocaleString('en-IN')}${discountInfo}\n   Shipping: ₹${Number(shipping || 0).toLocaleString('en-IN')}\n   ─────────────────────────────\n   Final Amount: ₹${Number(payable || 0).toLocaleString('en-IN')} 💳\n\n💳 PAYMENT: ${paymentMethod === 'COD' ? 'Cash on Delivery' : paymentMethod || 'Card'}\n\n📅 ESTIMATED DELIVERY: ${formattedDeliveryDate}\n\n🎯 NEXT STEPS:\n✓ We're preparing your premium selection\n✓ Expert packaging with care\n✓ Fast & secure delivery\n\n🔗 TRACK: https://eshopperr.me/order-tracking/${orderId}\n\n🙏 Thank you for your business!\nEshopper Boutique Luxe`;

                    try {
                        console.log(`📤 Sending WhatsApp to ${phoneNumber} for order ${orderId}`);
                        await sendWhatsApp(phoneNumber, whatsappMsg);
                        console.log(`✅ WhatsApp sent for order ${orderId}`);
                    } catch (waErr) {
                        if (isExpectedWhatsAppError(waErr)) {
                            console.log(`ℹ️  WhatsApp skipped for ${orderId}:`, waErr.message);
                        } else {
                            console.error(`⚠️  WhatsApp failed for ${orderId}:`, waErr.message);
                            if (process.env.SENTRY_DSN) Sentry.captureException(waErr);
                        }
                    }
                }
            } catch (waError) {
                if (isExpectedWhatsAppError(waError)) {
                    console.log(`ℹ️  Order WhatsApp skipped (expected) for ${orderId}:`, waError.message);
                } else {
                    console.error(`⚠️  Order WhatsApp failed for ${orderId}:`, waError.message);
                    if (process.env.SENTRY_DSN) Sentry.captureException(waError);
                }
            }
        }

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

// ==================== TEST NOTIFICATION ENDPOINT ====================
app.post('/api/test-notification', async (req, res) => {
    if (!FEATURE_EMAIL_NOTIFICATIONS && !FEATURE_WHATSAPP_NOTIFICATIONS) {
        return res.status(410).json({
            success: false,
            message: 'Notification system is currently disabled'
        });
    }
    try {
        const { phone, email, testType } = req.body;

        if (!phone && !email) {
            return res.status(400).json({
                success: false,
                message: 'Phone or email is required'
            });
        }

        const results = {
            email: { attempted: false, success: false, error: null },
            whatsapp: { attempted: false, success: false, error: null },
            config: {
                evolutionApiUrl: process.env.EVOLUTION_API_URL ? '✅ Configured' : '❌ Missing',
                whatsappToken: process.env.WHATSAPP_TOKEN ? '✅ Configured' : '❌ Missing',
                evolutionApiKey: process.env.EVOLUTION_API_KEY ? '✅ Configured' : '❌ Missing',
                // brevoApiKey config removed
                whatsappInstance: process.env.WHATSAPP_INSTANCE || 'eshopper_bot',
                whatsappSenderNumber: process.env.WHATSAPP_SENDER_NUMBER || '❌ Missing'
            }
        };

        // Test WhatsApp Notification
        if (phone) {
            results.whatsapp.attempted = true;
            try {
                const testCaption = `✨ TEST NOTIFICATION 💎\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━\nHello! This is a test message from Eshopper.\n\n✅ WhatsApp Integration: WORKING\nTimestamp: ${new Date().toLocaleString('en-IN')}\n\nIf you receive this, your WhatsApp notifications are configured correctly! 🎉\n\n🎯 You'll receive order confirmations, shipment updates, and delivery notifications on WhatsApp.\n\n🔗 Need Help?\nWhatsApp: wa.me/918447859784\nEmail: support@eshopperr.me\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━`;

                await sendWhatsApp(phone, testCaption);
                results.whatsapp.success = true;
                results.whatsapp.message = 'WhatsApp notification sent successfully';
            } catch (waError) {
                results.whatsapp.success = false;
                results.whatsapp.error = waError.message;
                results.whatsapp.details = {
                    status: waError.response?.status,
                    data: waError.response?.data
                };
            }
        }

        // Test Email Notification
        if (email) {
            results.email.attempted = true;
            try {
                await sendEmail({
                    to: email,
                    subject: '✅ Test Notification - Eshopper Boutique',
                    htmlContent: `
                        <div style="font-family:Arial,sans-serif;padding:20px;background:#f8f8f8;">
                            <h2 style="color:#111;">✨ Test Email Notification</h2>
                            <p>This is a test email from your Eshopper notification system.</p>
                            <p><strong>Email Integration:</strong> ✅ WORKING</p>
                            <p><strong>Timestamp:</strong> ${new Date().toLocaleString('en-IN')}</p>
                            <p>If you receive this, your email notifications are configured correctly! 🎉</p>
                            <hr style="border:1px solid #ddd;margin:20px 0;" />
                            <p style="font-size:12px;color:#666;">This is an automated test message from Eshopper Boutique Luxe</p>
                        </div>
                    `
                });
                results.email.success = true;
                results.email.message = 'Email notification sent successfully';
            } catch (emailError) {
                results.email.success = false;
                results.email.error = emailError.message;
                results.email.details = {
                    status: emailError.response?.status,
                    data: emailError.response?.data
                };
            }
        }

const allSuccess =
    (!results.email.attempted || results.email.success) &&
    (!results.whatsapp.attempted || results.whatsapp.success);

return res.status(allSuccess ? 200 : 207).json({
    success: allSuccess,
    message: allSuccess ? 'All notifications sent successfully' : 'Some notifications failed',
    results
});

    } catch (e) {
    console.error('❌ Test Notification Error:', e.message);
    if (process.env.SENTRY_DSN) Sentry.captureException(e);
    return res.status(500).json({
        success: false,
        message: 'Failed to test notifications',
        error: e.message
    });
}
});

// ==================== WHATSAPP DIAGNOSTIC ENDPOINT ====================
app.get('/api/check-whatsapp-status/:userId', async (req, res) => {
    if (!FEATURE_WHATSAPP_NOTIFICATIONS) {
        return res.status(410).json({
            success: false,
            message: 'WhatsApp system is currently disabled'
        });
    }
    try {
        const { userId } = req.params;
        const user = await User.findById(userId).lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const phoneNumber = user.phone || '';
        const hasPhone = !!phoneNumber && phoneNumber.trim().length > 0;

        // Check if phone is valid format
        const normalizePhoneStrict = (phone = '') => {
            let digits = String(phone || '').replace(/\D/g, '');
            if (digits.length === 10) return `91${digits}`;
            if (digits.length === 12 && digits.startsWith('91')) return digits;
            return '';
        };

        const normalizedPhone = normalizePhoneStrict(phoneNumber);
        const isValidFormat = !!normalizedPhone;

        console.log(`🔍 WhatsApp Status Check for User ${userId}:`);
        console.log(`   Name: ${user.name || 'N/A'}`);
        console.log(`   Email: ${user.email || 'N/A'}`);
        console.log(`   Raw Phone: "${phoneNumber}"`);
        console.log(`   Has Phone: ${hasPhone ? '✅ Yes' : '❌ No'}`);
        console.log(`   Valid Format: ${isValidFormat ? '✅ Yes' : '❌ No'}`);

        return res.status(200).json({
            success: true,
            userId,
            user: {
                name: user.name,
                email: user.email,
                phone: phoneNumber,
                hasPhone,
                isValidFormat,
                normalizedPhone: normalizedPhone || 'INVALID'
            },
            whatsappStatus: {
                configured: hasPhone && isValidFormat ? '✅ READY' : '❌ NOT CONFIGURED',
                action: hasPhone && isValidFormat
                    ? 'User will receive WhatsApp notifications'
                    : 'User needs to add phone number to profile',
                updateLink: 'https://eshopperr.me/profile'
            }
        });

    } catch (error) {
        console.error('❌ WhatsApp Status Check Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to check WhatsApp status',
            error: error.message
        });
    }
});

// ==================== COMPATIBILITY API ALIASES ====================
// These aliases keep legacy frontend calls working without 404 errors.
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
            const payload = {
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: fullPrompt }]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 300
                }
            };

            const response = await axios.post(url, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': geminiApiKey
                }
            });

            return extractGeminiText(response.data);
        };



app.get('/api/orders/recent/:userId', async (req, res) => {
    try {
        const userId = String(req.params.userId || '').trim();
        const limit = Math.max(1, Math.min(10, Number(req.query.limit) || 5));
        if (!userId) {
            return res.status(400).json({ message: 'userId is required' });
        }
        const orders = await Order.find({ userid: userId })
            .sort({ updatedAt: -1, createdAt: -1 })
            .limit(limit)
            .lean();
        return res.json({
            success: true,
            orders: orders.map((item) => ({
                orderId: item.orderId,
                orderStatus: item.orderStatus,
                finalAmount: item.finalAmount,
                updatedAt: item.updatedAt,
                createdAt: item.createdAt
            }))
        });
    } catch (err) {
        console.error('❌ Error fetching recent orders:', err.message);
        return res.status(500).json({ message: 'Failed to fetch recent orders' });
    }
});

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

        app.get('/api/order/:orderId/invoice', async (req, res) => {
            if (!FEATURE_INVOICE_SYSTEM) {
                return res.status(410).json({ message: 'Invoice system is currently disabled' });
            }
            try {
                const { orderId } = req.params;
                const userId = String(req.query.userId || '').trim();
                const disposition = String(req.query.disposition || 'attachment').toLowerCase() === 'inline' ? 'inline' : 'attachment';

                if (!orderId || !userId) {
                    return res.status(400).json({ message: 'orderId and userId are required' });
                }

                const order = await Order.findOne({ orderId, userid: userId }).lean();
                if (!order) return res.status(404).json({ message: 'Order not found' });

                // Generate invoice with timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

                try {
                    // Map status -> PDF variant
                    const orderStatus = String(order.orderStatus || order.status || 'Ordered').trim().toLowerCase();
                    const isDelivered = orderStatus === 'delivered';
                    const isConfirmed = orderStatus === 'confirmed' || orderStatus === 'ordered';
                    const pdfType = isDelivered ? 'final' : (isConfirmed ? 'confirmation' : 'receipt');

                    const pdfBuffer = await generateInvoicePdfBuffer({
                        orderId: order.orderId,
                        userName: order.userName,
                        userEmail: order.userEmail,
                        paymentMethod: order.paymentMethod,
                        paymentStatus: order.paymentStatus,
                        finalAmount: Number(order.finalAmount || 0),
                        totalAmount: Number(order.totalAmount || 0),
                        shippingAmount: Number(order.shippingAmount || 0),
                        shippingAddress: order.shippingAddress || {},
                        products: Array.isArray(order.products) ? order.products : [],
                        orderDate: order.orderDate || order.createdAt,
                        orderStatus: order.orderStatus || order.status || 'Ordered',
                        pdfType,
                        isDelivered: isDelivered  // Auto-detect: Receipt or Tax Invoice
                    });

                    clearTimeout(timeoutId);

                    if (!pdfBuffer || pdfBuffer.length < 500) {
                        return res.status(500).json({ message: 'Invoice generation failed - empty PDF' });
                    }

                    const fileName = isDelivered
                        ? `TaxInvoice-${order.orderId}.pdf`
                        : (isConfirmed ? `Confirmation-${order.orderId}.pdf` : `Receipt-${order.orderId}.pdf`);
                    res.setHeader('Content-Type', 'application/pdf');
                    res.setHeader('Content-Disposition', `${disposition}; filename="${fileName}"`);
                    res.setHeader('Content-Length', String(pdfBuffer.length));
                    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
                    res.setHeader('Pragma', 'no-cache');
                    res.setHeader('Expires', '0');

                    return res.send(pdfBuffer);
                } catch (pdfErr) {
                    clearTimeout(timeoutId);
                    console.error(`❌ PDF generation failed for order ${orderId}:`, pdfErr.message);
                    if (process.env.SENTRY_DSN) Sentry.captureException(pdfErr);
                    return res.status(500).json({ message: 'Failed to generate invoice - please try again' });
                }
            } catch (e) {
                console.error('❌ Invoice endpoint error:', e.message, e.stack);
                if (process.env.SENTRY_DSN) Sentry.captureException(e);
                return res.status(500).json({ message: 'Invoice generation error' });
            }
        });

        // 🔴 SMART DOWNLOAD ENDPOINT - Returns Receipt or Tax Invoice based on Delivery Status
        app.get('/api/orders/:orderId/download', async (req, res) => {
            if (!FEATURE_INVOICE_SYSTEM) {
                return res.status(410).json({ message: 'Invoice system is currently disabled' });
            }
            try {
                const { orderId } = req.params;
                const userId = String(req.query.userId || '').trim();
                const pdfType = String(req.query.type || 'receipt').toLowerCase();

                if (!orderId || !userId) {
                    return res.status(400).json({ message: 'orderId and userId are required' });
                }

                if (!['receipt', 'confirmation', 'final'].includes(pdfType)) {
                    return res.status(400).json({ message: 'Invalid PDF type. Use "receipt", "confirmation", or "final"' });
                }

                // Fetch order
                const order = await Order.findOne({ orderId, userid: userId }).lean();
                if (!order) {
                    return res.status(404).json({ message: 'Order not found' });
                }

                // Check order status
                const orderStatus = String(order.orderStatus || order.status || 'Ordered').trim().toLowerCase();
                const isDelivered = orderStatus === 'delivered';

                // Determine filename based on requested type
                const fileName = pdfType === 'final'
                    ? `TaxInvoice-${orderId}.pdf`
                    : (pdfType === 'confirmation' ? `Confirmation-${orderId}.pdf` : `Receipt-${orderId}.pdf`);

                console.log(`📥 Download Request: Order ${orderId} | Type: ${pdfType} | Status: ${orderStatus} | Delivered: ${isDelivered}`);

                // Generate PDF with timeout
                const timeoutId = setTimeout(() => { }, 120000);

                try {
                    const pdfBuffer = await generateInvoicePdfBuffer({
                        orderId: order.orderId,
                        userName: order.userName,
                        userEmail: order.userEmail,
                        paymentMethod: order.paymentMethod,
                        paymentStatus: order.paymentStatus,
                        finalAmount: Number(order.finalAmount || 0),
                        totalAmount: Number(order.totalAmount || 0),
                        shippingAmount: Number(order.shippingAmount || 0),
                        shippingAddress: order.shippingAddress || {},
                        products: Array.isArray(order.products) ? order.products : [],
                        orderDate: order.orderDate || order.createdAt,
                        orderStatus: order.orderStatus || order.status || 'Ordered',
                        isDelivered: isDelivered,  // Pass delivery status for footer customization
                        pdfType: pdfType
                    });

                    clearTimeout(timeoutId);

                    // Validate PDF buffer
                    if (!pdfBuffer || pdfBuffer.length < 500) {
                        throw new Error('Generated PDF buffer is invalid or too small');
                    }

                    // Set response headers
                    res.setHeader('Content-Type', 'application/pdf');
                    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
                    res.setHeader('Content-Length', String(pdfBuffer.length));
                    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
                    res.setHeader('Pragma', 'no-cache');
                    res.setHeader('Expires', '0');

                    console.log(`✅ PDF generated successfully: ${fileName}`);
                    return res.send(pdfBuffer);
                } catch (pdfErr) {
                    clearTimeout(timeoutId);
                    console.error(`❌ PDF generation failed for order ${orderId}:`, pdfErr.message);
                    if (process.env.SENTRY_DSN && Sentry) Sentry.captureException(pdfErr);
                    return res.status(500).json({ message: 'Failed to generate PDF - please try again' });
                }
            } catch (e) {
                console.error('❌ Download endpoint error:', e.message, e.stack);
                if (process.env.SENTRY_DSN && Sentry) Sentry.captureException(e);
                return res.status(500).json({ message: 'Download error' });
            }
        });

        // 🔴 DYNAMIC INVOICE DOWNLOADER - Auto-detects PDF type based on order status
        app.get('/api/orders/:id/download-invoice', async (req, res) => {
            if (!FEATURE_INVOICE_SYSTEM) {
                return res.status(410).json({
                    success: false,
                    message: 'Invoice system is currently disabled'
                });
            }
            try {
                const orderId = String(req.params.id || '').trim();
                const userId = String(req.query.userId || '').trim();

                // Validation
                if (!orderId || !userId) {
                    return res.status(400).json({
                        success: false,
                        message: 'orderId and userId are required'
                    });
                }

                // Fetch order with authentication check
                const order = await Order.findOne({ orderId, userid: userId }).lean();
                if (!order) {
                    return res.status(404).json({
                        success: false,
                        message: 'Order not found or you do not have access to this order'
                    });
                }

                // Determine PDF type based on order status
                const orderStatus = String(order.orderStatus || order.status || 'Ordered').trim().toLowerCase();

                let pdfType = 'receipt'; // Default for 'Pending'/'Ordered'
                let fileName = `Receipt-${orderId}.pdf`;

                if (orderStatus === 'delivered') {
                    // Delivered → Final Tax Invoice
                    pdfType = 'final';
                    fileName = `TaxInvoice-${orderId}.pdf`;
                } else if (
                    orderStatus === 'confirmed' ||
                    orderStatus === 'packed' ||
                    orderStatus === 'shipped' ||
                    orderStatus === 'out for delivery'
                ) {
                    // Confirmed to Out for Delivery → Proforma Confirmation
                    pdfType = 'confirmation';
                    fileName = `Confirmation-${orderId}.pdf`;
                }

                console.log(`📥 Dynamic Invoice Download: ${orderId} | Status: ${orderStatus} → PDF Type: ${pdfType}`);

                // Generate PDF with timeout protection
                const timeoutId = setTimeout(() => { }, 120000);

                try {
                    const pdfBuffer = await generateInvoicePdfBuffer({
                        orderId: order.orderId,
                        userName: order.userName,
                        userEmail: order.userEmail,
                        paymentMethod: order.paymentMethod,
                        paymentStatus: order.paymentStatus,
                        finalAmount: Number(order.finalAmount || 0),
                        totalAmount: Number(order.totalAmount || 0),
                        shippingAmount: Number(order.shippingAmount || 0),
                        shippingAddress: order.shippingAddress || {},
                        products: Array.isArray(order.products) ? order.products : [],
                        orderDate: order.orderDate || order.createdAt,
                        orderStatus: order.orderStatus || order.status || 'Ordered',
                        isDelivered: orderStatus === 'delivered',
                        pdfType: pdfType
                    });

                    clearTimeout(timeoutId);

                    // Validate PDF buffer
                    if (!pdfBuffer || pdfBuffer.length < 500) {
                        throw new Error('Generated PDF buffer is invalid or too small');
                    }

                    // Stream PDF to frontend with proper headers
                    res.setHeader('Content-Type', 'application/pdf');
                    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
                    res.setHeader('Content-Length', String(pdfBuffer.length));
                    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
                    res.setHeader('Pragma', 'no-cache');
                    res.setHeader('Expires', '0');

                    console.log(`✅ Dynamic invoice generated: ${fileName} (${pdfBuffer.length} bytes)`);
                    return res.send(pdfBuffer);

                } catch (pdfErr) {
                    clearTimeout(timeoutId);
                    console.error(`❌ PDF generation failed for ${orderId}:`, pdfErr.message);
                    if (process.env.SENTRY_DSN && Sentry) Sentry.captureException(pdfErr);
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to generate invoice. Please try again later.'
                    });
                }

            } catch (err) {
                console.error('❌ Dynamic invoice download error:', err.message, err.stack);
                if (process.env.SENTRY_DSN && Sentry) Sentry.captureException(err);
                return res.status(500).json({
                    success: false,
                    message: 'Unable to process invoice download request'
                });
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
                let invoiceBase64 = null;
                if (FEATURE_INVOICE_SYSTEM) {
                    try {
                        const invoiceBuffer = await generateInvoicePdfBuffer({
                            orderId: order.orderId,
                            userName: order.userName,
                            userEmail: order.userEmail,
                            paymentMethod: order.paymentMethod || 'COD',
                            paymentStatus: 'Verified',
                            finalAmount: order.finalAmount,
                            totalAmount: order.totalAmount,
                            shippingAmount: order.shippingAmount,
                            shippingAddress: order.shippingAddress,
                            products: order.products || [],
                            orderDate: order.orderDate || new Date(),
                            estimatedArrival: order.estimatedArrival,
                            deliveryPartner: order.deliveryPartner,
                            orderStatus: 'Confirmed',
                            pdfType: 'confirmation'
                        });
                        if (invoiceBuffer) {
                            invoiceBase64 = invoiceBuffer.toString('base64');
                        }
                    } catch (pdfError) {
                        console.error('❌ PDF generation for Email #2 failed:', pdfError.message);
                    }
                }


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
