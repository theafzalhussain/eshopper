// Serve static assets (images, css, js, etc.)
const path = require('path');
const express = require('express');
// Import sendTransactionalEmail for OTP/forget/signup email sending
const app = express();
// Static assets middleware must be after app is initialized
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));
const { sendTransactionalEmail } = require('./src/utils/email');
// 🔴 LOAD ENV VARIABLES FIRST
require('dotenv').config();

// NOW REQUIRE EXPRESS AND OTHER FRAMEWORKS
// Routes (modular imports)
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const productRoutes = require('./routes/productRoutes');
// ...existing code...
// Config (modular imports)
const connectDB = require('./config/db');
// ...existing code...
// Helpers/Utils (modular imports)
const logError = require('./utils/logger').logError;
// ...existing code...
const socketSetup = require('./utils/socket');
// Middleware (modular imports)
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const { cloudinary, upload } = require('./middleware/upload');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
// ...existing code...
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const bcrypt = require('bcryptjs');


// Models (modular imports)
const User = require('./models/User');
const Product = require('./models/Product');
const Brand = require('./models/Brand');
const Cart = require('./models/Cart');
const Checkout = require('./models/Checkout');
const Contact = require('./models/Contact');
const Maincategory = require('./models/Maincategory');
const Newslatter = require('./models/Newslatter');
const Order = require('./models/Order');
const OTPRecord = require('./models/OTPRecord');
const Subcategory = require('./models/Subcategory');
const Wishlist = require('./models/Wishlist');
// ...existing code...
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { GoogleGenerativeAI } = require("@google/generative-ai");
// Removed duplicate admin import; use from utils/firebaseAdmin.js

// --- Firebase Admin Initialization (Single Source) ---
const { admin, firebaseAdminReady } = require('./utils/firebaseAdmin');
if (firebaseAdminReady) {
    console.log('✅ Firebase Admin ready (from utils/firebaseAdmin.js)');
} else {
    console.warn('⚠️ Firebase Admin NOT initialized. Google sign-in will not work.');
}
const fs = require('fs');
const Sentry = require('@sentry/node');
const puppeteer = require('puppeteer');
// Email utility import/fix
// Modular email utility is handled in helpers/utils
// ...existing code...


// --- CORS MIDDLEWARE: MUST BE BEFORE ROUTES ---
app.set('trust proxy', 1);

// Use modular routes (must be after app is defined)
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/user', userRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/user/wishlist', wishlistRoutes);

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

// / 🔒 CORS - Robust production config
const corsOptions = {
    origin: function(origin, callback) {
        // Allow no origin (server-to-server, mobile)
        if (!origin) return callback(null, true);
        // Allow localhost for development
        if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin === 'http://localhost:3000' || origin === 'http://127.0.0.1:3000') {
            console.log('CORS: Allowing local dev origin:', origin);
            return callback(null, true);
        }
        // Allow production frontend domains
        const allowedProdOrigins = [
            'https://eshopperr.me',
            'https://www.eshopperr.me',
            process.env.FRONTEND_URL
        ].filter(Boolean);
        if (allowedProdOrigins.includes(origin)) {
            console.log('CORS: Allowing production origin:', origin);
            return callback(null, true);
        }
        // Allow all Vercel preview deployments (*.vercel.app)
        if (origin && origin.endsWith('.vercel.app')) {
            return callback(null, true);
        }
        console.warn(`⚠️  CORS rejected: ${origin}`);
        return callback(new Error('CORS policy: Unauthorized origin'));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    preflightContinue: false,
    optionsSuccessStatus: 204
};

// Apply CORS before any routes or middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
console.log('CORS middleware applied. Allowed origins: localhost, 127.0.0.1, eshopperr.me, www.eshopperr.me, .vercel.app,', process.env.FRONTEND_URL);

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
console.log('Socket.IO CORS allowed origins:', [
    'https://eshopperr.me',
    'https://www.eshopperr.me',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL
].filter(Boolean));

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

// Feature toggles for clean baseline (disable until tested).
const FEATURE_EMAIL_NOTIFICATIONS = String(process.env.FEATURE_EMAIL_NOTIFICATIONS || 'false').toLowerCase() === 'true';
const FEATURE_WHATSAPP_NOTIFICATIONS = String(process.env.FEATURE_WHATSAPP_NOTIFICATIONS || 'false').toLowerCase() === 'true';
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
const BRAND_LOGO_PRIMARY_URL = process.env.BRAND_LOGO_URL || `${BRAND_SITE_URL}/logo512.png`;

// 🔧 DATABASE CONNECTION SETUP
const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
    console.error("❌ CRITICAL: Missing MONGODB_URI in environment variables");
    console.error("   Please set MONGODB_URI in your Railway environment");
    process.exit(1);
}

console.log("🔍 Attempting MongoDB connection...");

// 🔧 CLOUDINARY CONFIGURATION SETUP
const CLOUDINARY_CLOUD_NAME = process.env.CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUD_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUD_API_SECRET;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.error("❌ CRITICAL: Missing Cloudinary credentials in environment variables");
    console.error("   Please set CLOUD_NAME, CLOUD_API_KEY, and CLOUD_API_SECRET in Railway");
    process.exit(1);
}

cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET
});

console.log("✅ Cloudinary configured successfully");
console.log(`📸 Cloud Name: ${CLOUDINARY_CLOUD_NAME}`);

// 📝 HELPER FUNCTION TO RETURN CLOUDINARY URLS (for GET requests)
const sanitizeCloudinaryUrl = require('./utils/cloudinaryHelper');

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'eshoper_master',
        allowedFormats: ['jpg', 'png', 'jpeg'],
        resource_type: 'auto'
    }
});

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

const generateInvoicePdfBuffer = async (orderPayload) => {
    if (!FEATURE_INVOICE_SYSTEM) {
        throw new Error('Invoice system disabled');
    }
    // Determine which HTML builder to use based on explicit type + status fallback
    const requestedType = String(orderPayload?.pdfType || '').trim().toLowerCase();
    const normalizedStatus = String(orderPayload?.orderStatus || '').trim().toLowerCase();
    const isDelivered = orderPayload?.isDelivered || normalizedStatus === 'delivered';

    let htmlBuilder = buildOrderReceiptHtml;
    if (requestedType === 'confirmation' || requestedType === 'proforma' || requestedType === 'confirmed') {
        // htmlBuilder assignment removed
    } else if (requestedType === 'final' || requestedType === 'tax' || requestedType === 'invoice' || isDelivered) {
        htmlBuilder = buildTaxInvoiceHtml;
    }

    const html = htmlBuilder(orderPayload);
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--single-process',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process'
            ]
        });

        const page = await browser.newPage();

        // Set viewport
        await page.setViewport({ width: 1200, height: 1600 });

        // Set content with longer timeout
        await page.setContent(html, {
            waitUntil: ['networkidle0', 'domcontentloaded'],
            timeout: 90000
        });

        // Wait for web fonts/styles to settle (safe across Puppeteer versions)
        await page.evaluate(async () => {
            if (document.fonts && document.fonts.ready) {
                try {
                    await document.fonts.ready;
                } catch (_) { }
            }
        });

        // Wait for any animations/fonts to load
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Generate PDF
        const pdfRaw = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '16mm', right: '12mm', bottom: '16mm', left: '12mm' },
            timeout: 60000
        });

        // Puppeteer can return Uint8Array in some versions; normalize to Buffer
        const pdf = Buffer.isBuffer(pdfRaw)
            ? pdfRaw
            : (pdfRaw ? Buffer.from(pdfRaw) : Buffer.alloc(0));

        // Validate PDF
        if (!pdf || pdf.length < 200) {
            console.error('❌ PDF validation failed: invalid buffer');
            throw new Error('Generated invoice buffer is not valid');
        }

        // Check for PDF magic bytes
        const pdfSignature = pdf.subarray(0, 4).toString('latin1');
        if (!pdfSignature.startsWith('%PDF')) {
            console.error('❌ PDF signature check failed:', pdfSignature);
            throw new Error('Invalid PDF signature');
        }

        return pdf;
    } catch (e) {
        console.error('❌ PDF generation failed:', e.message, e.stack);
        throw e;
    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch (closeErr) {
                console.error('⚠️ Error closing browser:', closeErr.message);
            }
        }
    }
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
    // FIX: Define templatePath
    const templatePath = path.join(__dirname, 'email-templates', templateFile);
    try {
        // email-templates path usage removed
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

// ============ FIREBASE AUTH SYNC ROUTE ============
app.post('/api/auth-sync', async (req, res) => {
    try {
        if (!firebaseAdminReady) {
            return res.status(503).json({
                message: 'Firebase authentication service is temporarily unavailable. Please try again shortly.'
            });
        }

        const { idToken, uid, email, phone, name, pic, provider } = req.body;
        const normalizedEmail = email ? email.toLowerCase().trim() : null;
        const normalizedPhone = phone ? phone.trim() : null;

        // Improved validation with better logging
        if (!idToken || !uid || !provider) {
            console.warn('⚠️ Auth sync called with incomplete data:', { hasToken: !!idToken, hasUid: !!uid, hasProvider: !!provider });
            return res.status(400).json({ 
                message: "Authentication incomplete. Please try signing in again.",
                missingFields: {
                    idToken: !idToken,
                    uid: !uid,
                    provider: !provider
                }
            });
        }

        // 🔐 VERIFY FIREBASE ID TOKEN
        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(idToken);
            console.log(`✅ Firebase token verified for UID: ${ decodedToken.uid } `);
        } catch (err) {
            console.error("❌ Firebase token verification failed:", err.message);
            return res.status(401).json({ message: "Invalid or expired token" });
        }

        // Ensure UID matches
        if (decodedToken.uid !== uid) {
            console.warn(`⚠️  UID mismatch: ${ decodedToken.uid } !== ${ uid } `);
            return res.status(401).json({ message: "UID mismatch" });
        }

        let user = null;

        // 🔍 CHECK IF USER EXISTS BY UID
        user = await User.findOne({ uid: uid });

        if (user) {
            // ✅ USER EXISTS - UPDATE LOGIN TIMESTAMP & PROVIDER INFO
            console.log(`📝 Updating existing user: ${ user.email } `);
            user.lastLogin = new Date();
            
            // Update additional info if provided
            if (name && !user.name) user.name = name;
            if (pic && !user.pic) user.pic = pic;
            if (phone && !user.phone) user.phone = phone;
            if (email && !user.email) user.email = email;
            
            await user.save();
            console.log(`✅ User updated successfully: ${ user.email } `);
        } else {
            // 🔗 LINK EXISTING ACCOUNT BY EMAIL/PHONE (prevents duplicate key errors)
            if (normalizedEmail) {
                user = await User.findOne({ email: normalizedEmail });
            }

            if (!user && normalizedPhone) {
                user = await User.findOne({ phone: normalizedPhone });
            }

            if (user) {
                console.log(`🔗 Linking existing account to Firebase UID: ${ user.email || user.phone } `);
                user.uid = uid;
                user.provider = provider;
                user.lastLogin = new Date();
                if (name && !user.name) user.name = name;
                if (pic && !user.pic) user.pic = pic;
                if (normalizedPhone && !user.phone) user.phone = normalizedPhone;
                if (normalizedEmail && !user.email) user.email = normalizedEmail;
                await user.save();
                console.log(`✅ Existing account linked successfully: ${ user.email || user.phone } `);
            } else {
                // 🆕 NEW USER - CREATE ACCOUNT
                console.log(`🆕 Creating new user with UID: ${ uid } `);

                // Generate unique username from email or name
                let generatedUsername = null;
                if (normalizedEmail) {
                    generatedUsername = normalizedEmail.split('@')[0].toLowerCase();
                } else if (name) {
                    generatedUsername = name.split(' ')[0].toLowerCase();
                }

                // Ensure unique username
                if (generatedUsername) {
                    let counter = 1;
                    let baseUsername = generatedUsername;
                    while (await User.findOne({ username: generatedUsername })) {
                        generatedUsername = `${ baseUsername }${ counter } `;
                        counter++;
                    }
                }

                user = new User({
                    uid: uid,
                    name: name || "User",
                    email: normalizedEmail || null,
                    phone: normalizedPhone || null,
                    pic: pic || null,
                    provider: provider,
                    username: generatedUsername,
                    role: "User",
                    lastLogin: new Date()
                });

                // For phone auth, generate a random password
                if (provider === 'phone' && !user.password) {
                    const randomPass = Math.random().toString(36).slice(-12);
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(randomPass, salt);
                }

                await user.save();
                console.log(`✅ New user created: ${ user.email || user.phone } `);
            }
        }

        // Return user data (without sensitive info)
        const { password, otp, otpExpires, failedAttempts, lockUntil, ...safeUser } = user.toJSON();
        
        res.json(safeUser);
    } catch (err) {
        console.error("❌ Auth Sync Error:", err.message);
        if (err.code === 11000) {
            return res.status(409).json({ message: "Account already exists. Please login with your existing account." });
        }
        if (process.env.SENTRY_DSN) Sentry.captureException(err);
        res.status(500).json({ message: "Authentication sync failed. Please try again." });
    }
});


app.post('/api/send-otp', authLimiter, async (req, res) => {
    try {
        const { email, type } = req.body;
        if (!email || !type) return res.status(400).json({ message: "Email and type are required." });

        const normalizedEmail = String(email).toLowerCase().trim();
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const user = await User.findOne({ $or: [{ email: normalizedEmail }, { username: normalizedEmail }] });

        if (type === 'forget' && !user) return res.status(400).json({ message: "This email is not registered, please sign up first." });
        if (type === 'signup' && user) return res.status(400).json({ message: "Email already registered" });

        if (user) {
            user.otp = otp;
            user.otpExpires = new Date(Date.now() + 10 * 60000);
            await user.save();
        } else {
            await OTPRecord.findOneAndUpdate({ email: normalizedEmail }, { otp, email: normalizedEmail }, { upsert: true });
        }

        // Always send to a valid email
        let emailToSend = user && user.email ? user.email : normalizedEmail;
        if (!emailToSend || !emailToSend.includes('@')) {
            console.error('❌ No valid email to send OTP:', emailToSend);
            return res.status(400).json({ error: 'No valid email to send OTP.' });
        }

        const subject = type === 'signup' ? 'Your ESHOPPER Signup OTP' : 'Your ESHOPPER Password Reset OTP';
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ESHOPPER OTP Verification</title>
    <style>
        body { background: #f6f6f6; margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; }
        .lux-card { max-width: 420px; margin: 32px auto; background: #fff; border-radius: 24px; box-shadow: 0 8px 32px rgba(212,175,55,0.10), 0 1.5px 8px #d4af37; padding: 0; overflow: hidden; border: 2px solid #d4af37; }
        .lux-header { background: linear-gradient(90deg, #0a0a0a 60%, #d4af37 100%); padding: 32px 24px 18px 24px; text-align: center; }
        .lux-logo { font-size: 44px; color: #d4af37; font-weight: 900; letter-spacing: 2px; margin-bottom: 8px; }
        .lux-title { font-size: 22px; font-weight: 900; color: #fff; letter-spacing: 1.5px; margin: 0 0 6px 0; }
        .lux-subtitle { font-size: 13px; color: #d4af37; font-weight: 700; letter-spacing: 1px; margin-bottom: 0; }
        .lux-content { padding: 32px 24px 24px 24px; text-align: center; }
        .otp-label { font-size: 15px; color: #222; font-weight: 700; margin-bottom: 10px; letter-spacing: 1px; }
        .otp-box { font-size: 38px; font-weight: 900; color: #d4af37; letter-spacing: 12px; background: #f9f7f4; border-radius: 12px; padding: 18px 0; margin: 0 auto 18px auto; width: 80%; border: 2px solid #d4af37; }
        .otp-valid { font-size: 13px; color: #888; margin-bottom: 18px; }
        .lux-footer { font-size: 12px; color: #888; background: #f6f6f6; padding: 18px 24px; border-top: 1px solid #eee; border-radius: 0 0 24px 24px; text-align: center; }
        @media (max-width: 600px) { .lux-card { max-width: 98vw; } .lux-header, .lux-content, .lux-footer { padding-left: 8vw; padding-right: 8vw; } }
    </style>
</head>
<body>
    <div class="lux-card">
        <div class="lux-header">
            <div class="lux-logo">💎</div>
            <div class="lux-title">ESHOPPER OTP Verification</div>
            <div class="lux-subtitle">Boutique Luxe Security</div>
        </div>
        <div class="lux-content">
            <div class="otp-label">Your One-Time Password (OTP) is:</div>
            <div class="otp-box">${otp}</div>
            <div class="otp-valid">This OTP is valid for <b>10 minutes</b>. Please do not share it with anyone.</div>
        </div>
        <div class="lux-footer">
            If you did not request this, please ignore this email.<br>
            <span style="color:#d4af37;font-weight:700;">eShopper Boutique Luxe</span>
        </div>
    </div>
</body>
</html>
`;
        try {
            let toName = user && user.name ? user.name : emailToSend.split('@')[0];
            const payload = { toEmail: emailToSend, toName, subject, htmlContent, type };
            console.log('[EMAIL] sendTransactionalEmail called:', payload);
            await sendTransactionalEmail(payload);
        } catch (err) {
            console.error('❌ Failed to send OTP email:', err.message);
            return res.status(500).json({ error: 'Failed to send OTP email. Please try again.' });
        }
        res.json({ result: "Done", message: "OTP sent successfully" });
    } catch (e) {
        console.error("❌ Email Error:", e.message);
        console.error("❌ Email Error Stack:", e.stack);
        res.status(500).json({ error: "Failed to send OTP. Please try again." });
    }
});

app.post('/api/reset-password', authLimiter, async (req, res) => {
    try {
        const searchTerm = req.body.username.toLowerCase().trim();
        const newPassword = req.body.password;
        const otp = req.body.otp;

        // 🔒 BACKEND PASSWORD VALIDATION
        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters long." });
        }

        // Check for uppercase letter
        if (!/[A-Z]/.test(newPassword)) {
            return res.status(400).json({ message: "Password must contain at least one uppercase letter." });
        }

        // Check for special character
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
            return res.status(400).json({ message: "Password must contain at least one special character." });
        }

        const user = await User.findOne({ $or: [{ email: searchTerm }, { username: searchTerm }] });
        
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // ⏰ CHECK OTP VALIDITY (Exactly 10 minutes)
        if (!user.otp || !user.otpExpires) {
            return res.status(400).json({ message: "No OTP found. Please request a new code." });
        }

        if (Date.now() > user.otpExpires) {
            // Clean expired OTP
            user.otp = undefined;
            user.otpExpires = undefined;
            await user.save();
            return res.status(400).json({ message: "OTP has expired. Please request a new code." });
        }

        // ✅ VERIFY OTP
        if (user.otp !== otp) {
            return res.status(400).json({ message: "Invalid OTP code. Please check and try again." });
        }

        // 🔐 HASH NEW PASSWORD
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        
        // 🧹 CLEANUP: Remove OTP and expiration after successful reset
        user.otp = undefined;
        user.otpExpires = undefined;
        
        await user.save();
        
        console.log(`✅ Password reset successful for user: ${ user.username } `);
        res.json({ result: "Done", message: "Password updated successfully!" });
        
    } catch (e) {
        console.error("❌ Password Reset Error:", e.message);
        res.status(500).json({ message: "Something went wrong. Please try again." });
    }
});

// CHECK USERNAME AVAILABILITY - For signup validation
app.post('/api/check-username', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username || username.length < 3) {
            return res.status(400).json({ message: "Username must be at least 3 characters" });
        }
        const normalizedUsername = username.toLowerCase().trim();
        const existingUser = await User.findOne({ username: normalizedUsername });
        res.json({ available: !existingUser });
    } catch (e) {
        console.error("❌ Username Check Error:", e.message);
        res.status(500).json({ error: "Failed to check username" });
    }
});

app.post('/login', authLimiter, async (req, res) => {
    try {
        const searchTerm = req.body.username.toLowerCase().trim();
        const user = await User.findOne({ $or: [{ username: searchTerm }, { email: searchTerm }] });

        // 🔒 CHECK IF ACCOUNT IS LOCKED
        if (user && user.lockUntil && Date.now() < user.lockUntil) {
            const minutesRemaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
            return res.status(403).json({ 
                message: `Account temporarily locked due to multiple failed login attempts.Try again in ${ minutesRemaining } minute${ minutesRemaining > 1 ? 's' : '' }.`,
                remainingMinutes: minutesRemaining
            });
        }

        // 🔐 CHECK IF USER EXISTS AND HAS PASSWORD
        if (user) {
            // ❌ BLOCK LOGIN IF NO PASSWORD (Google/Phone auth user)
            if (!user.password) {
                const authMethod = user.provider === 'google' ? 'Google Login' : 
                                  user.provider === 'phone' ? 'Phone Login' :
                                  'your authentication provider';
                
                console.warn(`⚠️ Login attempt by ${ user.provider } user via manual login: ${ user.email || user.username } `);
                
                return res.status(403).json({ 
                    message: `This account uses ${ authMethod }. Use ${ authMethod } to sign in or set a password using Forgot Password.`,
                    provider: user.provider,
                    requiresFirebaseAuth: true
                });
            }

            // ✅ PASSWORD EXISTS - COMPARE PASSWORDS
            if (await bcrypt.compare(req.body.password, user.password)) {
                // ✅ LOGIN SUCCESS - RESET FAILED ATTEMPTS
                user.failedAttempts = 0;
                user.lockUntil = undefined;
                user.lastLogin = new Date();
                await user.save();
                
                console.log(`✅ Login successful: ${ user.email || user.username } `);
                const { password: _pw, otp: _otp, otpExpires: _exp, failedAttempts: _fa, lockUntil: _lu, ...safeUser } = user.toJSON();
                return res.json(safeUser);
            }
        }

        // ❌ LOGIN FAILED - INCREMENT FAILED ATTEMPTS
        if (user) {
            user.failedAttempts = (user.failedAttempts || 0) + 1;
            
            // LOCK ACCOUNT AFTER 5 FAILED ATTEMPTS
            if (user.failedAttempts >= 5) {
                user.lockUntil = new Date(Date.now() + 15 * 60000); // 15 minutes
                await user.save();
                console.warn(`🔒 Account locked: ${ user.email || user.username } - Too many failed attempts`);
                return res.status(403).json({ 
                    message: "Too many failed login attempts. Account locked for 15 minutes.",
                    remainingMinutes: 15
                });
            }
            
            await user.save();
            console.warn(`⚠️ Failed login attempt #${ user.failedAttempts }: ${ user.email || user.username } `);
        } else {
            console.warn(`⚠️ Login attempt for non - existent user: ${ searchTerm } `);
        }

        return res.status(401).json({ message: "Invalid Credentials" });
        
    } catch (e) { 
        console.error("❌ Login Error:", e.message);
        res.status(500).json({ message: "Something went wrong." }); 
    }
});

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

async function startServer() {
    try {
        await mongoose.connect(MONGO_URI, {
            dbName: process.env.DB_NAME || 'eshoper',
            autoIndex: true,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            retryWrites: true,
            w: 'majority'
        });

        // Robust event listeners for connection stability
        mongoose.connection.on('error', err => {
            console.error('❌ Mongoose connection error:', err);
        });
        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️ Mongoose disconnected. Attempting reconnect...');
        });
        mongoose.connection.on('reconnected', () => {
            console.log('✅ Mongoose reconnected successfully');
        });
        mongoose.connection.on('connected', () => {
            console.log('✅ Mongoose connected to MongoDB');
        });

        console.log("✅ MongoDB connected successfully");
        console.log(`📊 Database: ${mongoose.connection.name}`);
        console.log(`🔗 State: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);

        // 🔴 Trimming to ensure no space/newline error
        // --- server.js AI REFACTOR START ---
        // --- Chatbot ultra-fast cache (in-memory, 2 min TTL) ---
        const chatCache = new Map();
        const CHAT_CACHE_TTL = 2 * 60 * 1000;

        // --- Smarter prompt engineering for human-like, knowledge-rich replies ---
        function buildSmartPrompt({ userQuery, userName, language, productSummary, priorNeeds, conversationStyle, historyText }) {
            return [
                `You are Eshopper's AI Fashion Assistant.`,
                `Your job: Help users with fashion, product suggestions, order help, and style tips.`,
                `Reply in a friendly, witty, human-like way. Use Hinglish if user prefers, else English.`,
                `Use full product and website knowledge.`,
                '',
                `USER PROFILE:`,
                `- Name: ${userName || 'User'}`,
                `- Language: ${language}`,
                `- Preferences: ${priorNeeds}`,
                '',
                `PRODUCT DATABASE SUMMARY:`,
                productSummary,
                '',
                `CONVERSATION STYLE:`,
                `- Tone: ${(conversationStyle && conversationStyle.tone) || 'Friendly, Smart'}`,
                `- Response Length: ${(conversationStyle && conversationStyle.responseLength) || 'Short, crisp'}`,
                '',
                `CONVERSATION SO FAR:`,
                historyText || 'No previous conversation.',
                '',
                `USER QUERY:`,
                userQuery,
                '',
                `CRITICAL:`,
                `- Reply instantly, like a smart human friend`,
                `- If product info is needed, use real product data`,
                `- If user asks for help, be extra helpful and polite`,
                `- If user asks in Hinglish, reply in Hinglish`,
                `- If user asks in English, reply in English`,
                `- If user asks for product, show best matches`,
                `- If user asks for order/help, guide them step by step`,
                `- If user is confused, ask a clarifying question`,
                `- Never say you are an AI, always act as a real human assistant`,
                `- Keep answers short, crisp, and full of value`
            ].join('\n');
        }
        const geminiApiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";
        const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;
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
    } catch (e) {
        console.error('❌ Recent orders fetch error:', e.message);
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


        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`\n❌ Port ${PORT} already in use!`);
                console.error(`   Run this command to fix it:`);
                console.error(`   Windows: netstat -ano | findstr :${PORT}  →  taskkill /PID <number> /F`);
                process.exit(1);
            }
            throw err;
        });
    } catch (e) {
        console.error("❌ MongoDB Connection Failed:", e.message);
        console.error("   Details:", e.code || e.codeName);
        console.error("   URI (masked):", MONGO_URI.replace(/mongodb\+srv:\/\/(.+)@/, 'mongodb+srv://***@'));
        process.exit(1);
    }
}

process.on("unhandledRejection", (err) => {
    console.error("❌ Unhandled Rejection:", err?.message || err);
    if (process.env.SENTRY_DSN) Sentry.captureException(err);
    process.exit(1);
});

process.on("SIGINT", async () => {
    console.log("\n🛑 Shutting down gracefully...");
    try {
        await mongoose.connection.close(false);
        console.log("✅ MongoDB connection closed");
    } catch (e) {
        console.error("❌ Error closing MongoDB:", e?.message || e);
    }
    process.exit(0);
});

// 📡 MONITOR MONGOOSE CONNECTION EVENTS
mongoose.connection.on('connected', () => {
    console.log('✅ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  Mongoose disconnected. Attempting reconnect in 5s...');
    setTimeout(async () => {
        try {
            await mongoose.connect(MONGO_URI, {
                dbName: process.env.DB_NAME || 'eshoper',
                serverSelectionTimeoutMS: 10000,
                socketTimeoutMS: 45000,
                retryWrites: true,
                w: 'majority'
            });
            console.log('✅ MongoDB reconnected successfully');
        } catch (e) {
            console.error('❌ MongoDB reconnect failed:', e.message);
        }
    }, 5000);
});

startServer();
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

        // Send Email #2: Order Confirmed (Ultra-Premium) via queue with Proforma attachment
        let emailSent = true;
        if (FEATURE_EMAIL_NOTIFICATIONS) {
            try {
                await enqueueEmailJob('order-confirmed', {
                    toEmail: order.userEmail,
                    userName: order.userName,
                    orderId: order.orderId,
                    paymentMethod: order.paymentMethod || 'COD',
                    finalAmount: order.finalAmount,
                    shippingAddress: order.shippingAddress,
                    products: order.products || [],
                    estimatedArrival: order.estimatedArrival,
                    invoiceBase64: invoiceBase64,
                    orderStatus: 'Confirmed'
                });
            } catch (confirmQueueErr) {
                emailSent = false;
                console.warn(`⚠️ Email #2 queue failed for ${orderId}:`, confirmQueueErr.message);
                if (process.env.SENTRY_DSN) Sentry.captureException(confirmQueueErr);
            }
        }

        if (!emailSent) {
            console.warn(`⚠️ Email #2 (Confirmation) failed for ${orderId}, but updating status anyway`);
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
        const userName = req.body?.userName || '';
        const language = req.body?.language || 'Hinglish';
        const priorNeeds = req.body?.priorNeeds || '';
        const conversationStyle = req.body?.conversationStyle || { tone: 'Friendly', responseLength: 'Short' };

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

        // --- SMARTER PROMPT ---
        const fullPrompt = buildSmartPrompt({
            userQuery: prompt,
            userName,
            language,
            productSummary: productDataSummary,
            priorNeeds,
            conversationStyle,
            historyText
        });

        let textResponse = "";
        let lastModelError = null;

        for (const modelName of candidateModels) {
            if (isModelCoolingDown(modelName)) {
                continue;
            }

            try {
                // --- ULTRA-FAST CACHE CHECK ---
                const cacheKey = `${modelName}::${fullPrompt}`;
                const now = Date.now();
                if (chatCache.has(cacheKey)) {
                    const { value, expires } = chatCache.get(cacheKey);
                    if (now < expires) {
                        textResponse = value;
                        console.log(`⚡️ Chatbot cache hit for model: ${modelName}`);
                        break;
                    }
                    chatCache.delete(cacheKey);
                }

                const model = genAI.getGenerativeModel({
                    model: modelName,
                    systemInstruction: '' // Already in prompt
                });

                const result = await model.generateContent(fullPrompt);
                const response = await result.response;
                textResponse = response.text();

                if (textResponse && textResponse.trim()) {
                    chatCache.set(cacheKey, { value: textResponse, expires: now + CHAT_CACHE_TTL });
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
                        chatCache.set(`${modelName}::${fullPrompt}`, { value: restText, expires: Date.now() + CHAT_CACHE_TTL });
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

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`\n❌ Port ${PORT} already in use!`);
                console.error(`   Run this command to fix it:`);
                console.error(`   Windows: netstat -ano | findstr :${PORT}  →  taskkill /PID <number> /F`);
                process.exit(1);
            }
            throw err;
        });
    } catch (e) {
        console.error("❌ MongoDB Connection Failed:", e.message);
        console.error("   Details:", e.code || e.codeName);
        console.error("   URI (masked):", MONGO_URI.replace(/mongodb\+srv:\/\/(.+)@/, 'mongodb+srv://***@'));
        process.exit(1);
    }
}

process.on("unhandledRejection", (err) => {
    console.error("❌ Unhandled Rejection:", err?.message || err);
    if (process.env.SENTRY_DSN) Sentry.captureException(err);
    process.exit(1);
});

process.on("SIGINT", async () => {
    console.log("\n🛑 Shutting down gracefully...");
    try {
        await mongoose.connection.close(false);
        console.log("✅ MongoDB connection closed");
    } catch (e) {
        console.error("❌ Error closing MongoDB:", e?.message || e);
    }
    process.exit(0);
});

// 📡 MONITOR MONGOOSE CONNECTION EVENTS
mongoose.connection.on('connected', () => {
    console.log('✅ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  Mongoose disconnected. Attempting reconnect in 5s...');
    setTimeout(async () => {
        try {
            await mongoose.connect(MONGO_URI, {
                dbName: process.env.DB_NAME || 'eshoper',
                serverSelectionTimeoutMS: 10000,
                socketTimeoutMS: 45000,
                retryWrites: true,
                w: 'majority'
            });
            console.log('✅ MongoDB reconnected successfully');
        } catch (e) {
            console.error('❌ MongoDB reconnect failed:', e.message);
        }
    }, 5000);
});

startServer();
