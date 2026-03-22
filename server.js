// 🔴 LOAD ENV VARIABLES FIRST
require('dotenv').config();

// NOW REQUIRE EXPRESS AND OTHER FRAMEWORKS
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const Sentry = require('@sentry/node');
const puppeteer = require('puppeteer');

let firebaseAdminReady = false;

try {
    let firebaseCredentials;

    // PRODUCTION (Railway): Use environment variable JSON string
    if (process.env.FIREBASE_CONFIG_JSON) {
        console.log('📱 Loading Firebase Admin from Railway environment variable...');
        firebaseCredentials = JSON.parse(process.env.FIREBASE_CONFIG_JSON);
        console.log(`✅ Firebase config parsed successfully for project: ${firebaseCredentials.project_id}`);
    } 
    // LOCAL DEVELOPMENT: Check for firebase-admin.json file
    else {
        const localPath = path.join(__dirname, 'firebase-admin.json');
        if (fs.existsSync(localPath)) {
            console.log('📂 Loading Firebase Admin from local file...');
            firebaseCredentials = require('./firebase-admin.json');
            console.log(`✅ Firebase config loaded from file for project: ${firebaseCredentials.project_id}`);
        } else {
            throw new Error('Firebase credentials not found. Set FIREBASE_CONFIG_JSON environment variable or add firebase-admin.json locally.');
        }
    }

    // Validate required fields
    if (!firebaseCredentials.project_id || !firebaseCredentials.private_key || !firebaseCredentials.client_email) {
        throw new Error('Invalid Firebase credentials: Missing required fields (project_id, private_key, client_email)');
    }

    // Initialize Firebase Admin SDK
    admin.initializeApp({
        credential: admin.credential.cert(firebaseCredentials),
        projectId: firebaseCredentials.project_id,
    });
    firebaseAdminReady = true;

    console.log('✅ Firebase Admin SDK initialized successfully');
    console.log(`🔐 Project ID: ${firebaseCredentials.project_id}`);
    console.log(`📧 Service Account: ${firebaseCredentials.client_email}`);

} catch (err) {
    console.error('❌ Firebase Admin SDK initialization failed');
    console.error('   Error:', err.message);
    console.error('');
    console.error('📋 Setup Instructions:');
    console.error('   PRODUCTION (Railway):');
    console.error('   1. Go to Railway Dashboard → Your Project → Variables');
    console.error('   2. Add: FIREBASE_CONFIG_JSON');
    console.error('   3. Value: Paste the entire firebase-admin.json content as a single-line JSON string');
    console.error('');
    console.error('   LOCAL DEVELOPMENT:');
    console.error('   1. Place firebase-admin.json in project root');
    console.error('   2. Ensure it is in .gitignore');
    console.error('');
    console.error('⚠️ Continuing without Firebase Admin. Firebase auth-sync route will be unavailable until credentials are fixed.');
}

const app = express();

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
const corsOptions = {
    origin: function(origin, callback) {
        // Allow no origin (server-to-server, mobile)
        if (!origin) return callback(null, true);
        // Allow localhost for development
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
        }
        // Allow production frontend domains
        if (origin === 'https://eshopperr.me' || 
            origin === 'https://www.eshopperr.me' || 
            origin === process.env.FRONTEND_URL) {
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
const BRAND_LOGO_FALLBACK_URL = process.env.BRAND_LOGO_FALLBACK_URL || `${BRAND_SITE_URL}/logo192.png`;
const BRAND_LOGO_EMAIL_URL = process.env.BRAND_LOGO_EMAIL_URL || BRAND_LOGO_PRIMARY_URL;
const BRAND_LOGO_PDF_SRC = BRAND_LOGO_PRIMARY_URL;

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
const sanitizeCloudinaryUrl = (url) => {
    if (!url) return null;
    // If it's already a Cloudinary URL, return as-is (already uploaded)
    if (url.includes('res.cloudinary.com')) {
        return url;
    }
    // Path format from multer-storage-cloudinary, return as-is
    return url;
};

const storage = new CloudinaryStorage({ 
    cloudinary: cloudinary, 
    params: { 
        folder: 'eshoper_master', 
        allowedFormats: ['jpg', 'png', 'jpeg'],
        resource_type: 'auto'
    } 
});
const upload = multer({ 
    storage, 
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type: ${file.mimetype}`));
        }
    }
}).fields([
    { name: 'pic', maxCount: 1 }, { name: 'pic1', maxCount: 1 },
    { name: 'pic2', maxCount: 1 }, { name: 'pic3', maxCount: 1 },
    { name: 'pic4', maxCount: 1 }
]);

// 📧 BREVO EMAIL SERVICE - Production Final Fix
const sendMail = async (to, otp) => {
    try {
        const BREVO_KEY = process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.trim() : null;
        if (!BREVO_KEY) throw new Error("❌ BREVO_API_KEY Missing");
        const localPart = (to || '').split('@')[0] || 'Customer';
        const recipientName = localPart
            .replace(/[._-]+/g, ' ')
            .replace(/\d+/g, ' ')
            .trim()
            .split(' ')
            .filter(Boolean)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ') || 'Customer';

        const data = {
            sender: { name: "EShoppper Security", email: "support@eshopperr.me" },
            to: [{ email: to }],
            subject: `Your EShoppper Verification Code: ${otp}`,
            textContent: `Hi ${recipientName},\n\nYour EShoppper verification code is: ${otp}\nThis code expires in 10 minutes.\n\nIf you did not request this, please ignore this email and secure your account.\n\nEShoppper Premium Security\nsupport@eshopperr.me`,
            htmlContent: `
                <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f8;padding:24px;color:#1f2937;">
                    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
                        <div style="padding:22px 28px;background:linear-gradient(135deg,#111827,#1a2332,#8b7521);color:#ffffff;">
                            <div style="font-size:20px;font-weight:700;letter-spacing:0.3px;background:linear-gradient(135deg,#f5deb3,#d4af37);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">EShoppper</div>
                            <div style="font-size:13px;opacity:0.9;margin-top:4px;color:#d4af37;font-weight:600;">Secure Account Verification</div>
                        </div>
                        <div style="padding:28px;">
                            <p style="margin:0 0 14px 0;font-size:15px;">Hi ${recipientName},</p>
                            <p style="margin:0 0 18px 0;font-size:15px;color:#4b5563;">Use this one-time verification code to continue securely:</p>
                            <div style="text-align:center;margin:18px 0 20px 0;">
                                <span style="display:inline-block;background:#f9fafb;border:1px solid #d1d5db;border-radius:10px;padding:14px 24px;font-size:34px;letter-spacing:8px;font-weight:700;color:#0f766e;">${otp}</span>
                            </div>
                            <p style="margin:0 0 8px 0;font-size:14px;color:#4b5563;">This code is valid for 10 minutes.</p>
                            <p style="margin:0;font-size:14px;color:#4b5563;">If you did not request this, please ignore this email and secure your account.</p>
                        </div>
                        <div style="padding:16px 28px;border-top:1px solid #e5e7eb;background:#fafafa;font-size:12px;color:#6b7280;">
                            Sent by EShoppper Premium Security • support@eshopperr.me
                        </div>
                    </div>
                </div>`,
            replyTo: { email: "support@eshopperr.me" }
        };

        const config = {
            headers: { 'api-key': BREVO_KEY, 'content-type': 'application/json', 'accept': 'application/json' }
        };

        const response = await axios.post('https://api.brevo.com/v3/smtp/email', data, config);
        console.log(`✅ SUCCESS! Mail sent to: ${to}. ID: ${response.data.messageId}`);
        return true;
    } catch (error) {
        console.error("❌ BREVO CRITICAL ERROR:", error.response ? error.response.data : error.message);
        throw error;
    }
};

const SMTP_HOST = process.env.SMTP_HOST ? process.env.SMTP_HOST.trim() : '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER ? process.env.SMTP_USER.trim() : '';
const SMTP_PASS = process.env.SMTP_PASS ? process.env.SMTP_PASS.trim() : '';
const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL ? process.env.SMTP_FROM_EMAIL.trim() : 'support@eshopperr.me';
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME ? process.env.SMTP_FROM_NAME.trim() : 'eShopper Boutique Luxe';
const SMTP_ENABLED = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

let smtpTransporter = null;
if (SMTP_ENABLED) {
    smtpTransporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS }
    });
    console.log(`✅ SMTP configured (${SMTP_HOST}:${SMTP_PORT})`);
} else {
    console.log('ℹ️ SMTP not fully configured, Brevo API fallback will be used for transactional emails');
}

const normalizeAttachmentsForBrevo = (attachments = []) => {
    if (!Array.isArray(attachments) || attachments.length === 0) return [];
    return attachments
        .filter(Boolean)
        .map((item) => {
            const name = item.filename || item.name || 'attachment.pdf';
            let content = item.content || item.contentBase64 || '';
            if (Buffer.isBuffer(content)) {
                content = content.toString('base64');
            }
            return { name, content: String(content || '') };
        })
        .filter((item) => item.content.length > 0);
};

const sendTransactionalEmail = async ({ toEmail, toName, subject, htmlContent, textContent = '', attachments = [] }) => {
    if (!toEmail || !String(toEmail).includes('@')) {
        throw new Error('Invalid recipient email');
    }

    if (smtpTransporter) {
        const smtpAttachments = (attachments || []).map((item) => {
            const filename = item.filename || item.name || 'attachment.pdf';
            const contentType = item.contentType || undefined;
            let content = item.content || item.contentBase64 || '';
            if (typeof content === 'string' && /^[A-Za-z0-9+/=]+$/.test(content) && !content.includes('<html')) {
                content = Buffer.from(content, 'base64');
            }
            return { filename, content, contentType };
        });

        await smtpTransporter.sendMail({
            from: `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL}>`,
            to: toName ? `"${toName}" <${toEmail}>` : toEmail,
            subject,
            html: htmlContent,
            text: textContent || undefined,
            replyTo: 'support@eshopperr.me',
            attachments: smtpAttachments
        });
        return { provider: 'nodemailer' };
    }

    const BREVO_KEY = process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.trim() : null;
    if (!BREVO_KEY) {
        throw new Error('No email provider configured (SMTP or BREVO_API_KEY)');
    }

    const payload = {
        sender: { name: SMTP_FROM_NAME, email: SMTP_FROM_EMAIL },
        to: [{ email: toEmail, name: toName || 'Customer' }],
        subject,
        htmlContent,
        replyTo: { email: 'support@eshopperr.me' }
    };

    if (textContent) payload.textContent = textContent;
    const brevoAttachments = normalizeAttachmentsForBrevo(attachments);
    if (brevoAttachments.length > 0) payload.attachment = brevoAttachments;

    await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
        headers: {
            'api-key': BREVO_KEY,
            'content-type': 'application/json',
            'accept': 'application/json'
        },
        timeout: 30000
    });
    return { provider: 'brevo' };
};

const sendAdminAlert = async ({ title, details }) => {
    const adminEmail = process.env.ADMIN_EMAIL || 'support@eshopperr.me';
    if (!adminEmail || !adminEmail.includes('@')) return;

    const safeTitle = title || 'System Alert';
    const safeDetails = details || 'No details provided';
    const html = `
        <div style="font-family:Arial,sans-serif;background:#fff3cd;border:1px solid #facc15;padding:16px;border-radius:10px;max-width:640px;margin:0 auto;">
            <h3 style="margin:0 0 8px 0;color:#7a2e0e;">⚠️ ${safeTitle}</h3>
            <p style="margin:0 0 8px 0;color:#333;">${safeDetails}</p>
            <p style="margin:0;color:#666;font-size:12px;">Time: ${new Date().toLocaleString('en-IN')}</p>
        </div>
    `;

    try {
        await sendTransactionalEmail({
            toEmail: adminEmail,
            toName: 'Admin',
            subject: `⚠️ ${safeTitle}`,
            htmlContent: html,
            textContent: `${safeTitle}\n${safeDetails}`
        });
    } catch (alertErr) {
        console.error('⚠️ Admin alert send failed:', alertErr.message);
    }
};

const EMAIL_QUEUE_ENABLED = String(process.env.EMAIL_QUEUE_ENABLED || 'true').toLowerCase() !== 'false';
const memoryEmailQueue = [];
let memoryQueueRunning = false;

let bullEmailQueue = null;
let bullQueueMode = false;

const executeEmailJob = async (jobType, payload) => {
    if (!FEATURE_EMAIL_NOTIFICATIONS) {
        return { skipped: true, reason: 'email-notifications-disabled' };
    }
    if (jobType === 'order-placed') return sendOrderPlacedEmail(payload);
    if (jobType === 'order-confirmed') return sendOrderConfirmationEmail(payload);
    if (jobType === 'order-status') return sendOrderStatusEmail(payload);
    throw new Error(`Unknown email job type: ${jobType}`);
};

try {
    const redisUrl = process.env.REDIS_URL ? process.env.REDIS_URL.trim() : '';
    if (redisUrl) {
        const { Queue, Worker } = require('bullmq');
        const IORedis = require('ioredis');
        const redisConnection = new IORedis(redisUrl, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false
        });

        bullEmailQueue = new Queue('email-dispatch', { connection: redisConnection });
        const queueConcurrency = Number(process.env.EMAIL_QUEUE_CONCURRENCY || 4);

        new Worker(
            'email-dispatch',
            async (job) => executeEmailJob(job.name, job.data || {}),
            { connection: redisConnection, concurrency: queueConcurrency }
        ).on('failed', (job, err) => {
            console.error(`⚠️ BullMQ email job failed (${job?.name || 'unknown'}):`, err?.message || err);
            if (process.env.SENTRY_DSN && Sentry && err) Sentry.captureException(err);
        });

        bullQueueMode = true;
        console.log(`✅ BullMQ email queue enabled (concurrency: ${queueConcurrency})`);
    }
} catch (queueErr) {
    bullQueueMode = false;
    console.warn('⚠️ BullMQ unavailable, falling back to in-memory email queue:', queueErr.message);
}

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


const toJSONCustom = { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } };
const opts = { toJSON: toJSONCustom, timestamps: true };

const OTPRecord = mongoose.model('OTPRecord', new mongoose.Schema({ email: String, otp: String, createdAt: { type: Date, expires: 600, default: Date.now } }));
const User = mongoose.model('User', new mongoose.Schema({ 
    name: String, 
    username: { type: String, unique: true, sparse: true }, 
    email: { type: String, unique: true, sparse: true }, 
    phone: String, 
    password: { type: String },
    uid: { type: String, unique: true, sparse: true, index: true }, // Firebase UID
    provider: { type: String, enum: ['email', 'google', 'phone'], default: 'email' }, // Auth provider
    role: { type: String, default: "User" }, 
    pic: String, 
    addressline1: String, 
    city: String, 
    state: String, 
    pin: String, 
    otp: String, 
    otpExpires: Date, 
    lastLogin: { type: Date, default: Date.now }, // Track last login
    failedAttempts: { type: Number, default: 0 }, 
    lockUntil: Date 
}, opts));
const Product = mongoose.model('Product', new mongoose.Schema({ name: String, maincategory: String, subcategory: String, brand: String, color: String, size: String, baseprice: Number, discount: Number, finalprice: Number, stock: String, description: String, pic1: String, pic2: String, pic3: String, pic4: String, rating: { type: Number, default: 4.5, min: 0, max: 5 }, reviews: { type: Number, default: 0 } }, opts));
const Maincategory = mongoose.model('Maincategory', new mongoose.Schema({ name: String }, opts));
const Subcategory = mongoose.model('Subcategory', new mongoose.Schema({ name: String }, opts));
const Brand = mongoose.model('Brand', new mongoose.Schema({ name: String }, opts));
const Cart = mongoose.model('Cart', new mongoose.Schema({ userid: String, productid: String, name: String, color: String, size: String, price: Number, qty: Number, total: Number, pic: String }, opts));
const Wishlist = mongoose.model('Wishlist', new mongoose.Schema({ userid: String, productid: String, name: String, color: String, size: String, price: Number, pic: String }, opts));
const Checkout = mongoose.model('Checkout', new mongoose.Schema({ userid: String, paymentmode: String, orderstatus: { type: String, default: "Order Placed" }, paymentstatus: { type: String, default: "Pending" }, totalAmount: Number, shippingAmount: Number, finalAmount: Number, products: Array }, opts));
const Order = mongoose.model('Order', new mongoose.Schema({
    orderId: { type: String, unique: true, required: true, index: true },
    userid: { type: String, required: true, index: true },
    userName: String,
    userEmail: String,
    paymentMethod: String,
    paymentStatus: { type: String, default: 'Pending' },
    orderStatus: { type: String, default: 'Order Placed' },
    totalAmount: Number,
    shippingAmount: Number,
    finalAmount: Number,
    shippingAddress: {
        fullName: String,
        phone: String,
        addressline1: String,
        city: String,
        state: String,
        pin: String,
        country: { type: String, default: 'India' }
    },
    products: Array,
    estimatedArrival: Date,
    statusHistory: [{
        status: String,
        timestamp: { type: Date, default: Date.now },
        message: String
    }],
    orderDate: { type: Date, default: Date.now }
}, opts));
const Contact = mongoose.model('Contact', new mongoose.Schema({ name: String, email: String, phone: String, subject: String, message: String, status: {type: String, default: "Active"} }, opts));
const Newslatter = mongoose.model('Newslatter', new mongoose.Schema({ email: { type: String, unique: true } }, opts));

const generateOrderId = async () => {
    const year = new Date().getFullYear();
    const prefix = `ESHP-${year}-`;
    const latestOrder = await Order.findOne({ orderId: new RegExp(`^${prefix}`) }).sort({ createdAt: -1 });
    const latestNumber = latestOrder?.orderId ? Number(String(latestOrder.orderId).split('-').pop()) || 0 : 0;
    const nextNumber = latestNumber + 1;
    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
};

const normalizePhoneForWhatsApp = (phone = '') => {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 10) return `91${digits}`;
    if (digits.startsWith('0') && digits.length === 11) return `91${digits.slice(1)}`;
    return digits;
};

const getTrackingLink = (orderId) => {
    const frontend = String(process.env.FRONTEND_URL || 'https://eshopperr.me').replace(/\/$/, '');
    return `${frontend}/order-tracking/${encodeURIComponent(orderId)}`;
};
// 🔴 WHATSAPP MEDIA FUNCTION - FOR SHIPPED STATUS WITH IMAGE
const sendWhatsAppMedia = async (number, mediaUrl, caption) => {
    if (!FEATURE_WHATSAPP_NOTIFICATIONS) {
        return { skipped: true, reason: 'whatsapp-notifications-disabled' };
    }
    const apiUrl = process.env.EVOLUTION_API_URL ? process.env.EVOLUTION_API_URL.trim().replace(/\/$/, '') : '';
    const token = process.env.WHATSAPP_TOKEN ? process.env.WHATSAPP_TOKEN.trim() : '';
    const apiKey = process.env.EVOLUTION_API_KEY ? process.env.EVOLUTION_API_KEY.trim() : '';
    const instance = process.env.WHATSAPP_INSTANCE || 'eshopper_bot';
    const botPhoneNumber = process.env.BOT_PHONE_NUMBER ? String(process.env.BOT_PHONE_NUMBER).trim() : '918447859784';
    const normalizedSender = botPhoneNumber.replace(/\D/g, '');
    if (normalizedSender.length > 12) normalizedSender = normalizedSender.slice(-12);

    const normalizePhoneStrict = (phone = '') => {
        let digits = String(phone || '').replace(/\D/g, '');
        if (!digits) return '';

        if (digits.length === 11 && digits.startsWith('0')) {
            digits = digits.slice(1);
        }

        if (digits.length === 12 && digits.startsWith('91')) {
            return digits;
        }

        if (digits.length > 10 && digits.startsWith('91')) {
            digits = digits.slice(-10);
        }

        if (digits.length === 10) {
            return `91${digits}`;
        }

        if (digits.length > 10) {
            return `91${digits.slice(-10)}`;
        }

        return '';
    };

    const contactNumber = normalizePhoneStrict(number);

    if (!apiUrl) {
        console.error('❌ EVOLUTION_API_URL not configured');
        throw new Error('EVOLUTION_API_URL not configured');
    }

    if (!token && !apiKey) {
        console.error('❌ WHATSAPP_TOKEN or EVOLUTION_API_KEY not configured');
        throw new Error('WHATSAPP credentials not configured');
    }

    if (!contactNumber || contactNumber.length < 12) {
        console.error('❌ Invalid phone:', contactNumber);
        throw new Error('Invalid phone number format');
    }

    if (!mediaUrl || !caption) {
        console.error('❌ Media URL or caption missing');
        throw new Error('Media URL and caption required');
    }

    // 🔴 SELF-LOOP PREVENTION FOR MEDIA
    if (normalizedSender && contactNumber === normalizedSender) {
        console.warn(`⚠️  SELF-LOOP DETECTED in sendWhatsAppMedia! Would send to bot's own number: ${contactNumber}`);
        const selfLoopError = new Error('Cannot send media to bot\'s own number (self-loop prevention)');
        selfLoopError.code = 'WHATSAPP_SELF_LOOP';
        selfLoopError.isExpected = true;
        throw selfLoopError;
    }

    try {
        const endpoint = `${apiUrl}/message/sendMedia/${instance}`;
        const mediaCaption = String(caption).trim();
        
        // 🔴 VALIDATE MEDIA URL WITH BETTER ERROR HANDLING
        let mediaUrlValid = true;
        try {
            console.log(`🔍 Validating media URL: ${mediaUrl}`);
            const urlCheck = await axios.head(mediaUrl, { 
                timeout: 8000,
                maxRedirects: 5,
                headers: { 'User-Agent': 'Eshopper-WhatsApp-Client/1.0' }
            });
            console.log(`✅ Media URL validated (status: ${urlCheck.status})`);
        } catch (urlCheckErr) {
            mediaUrlValid = false;
            console.error(`❌ Media URL inaccessible: ${urlCheckErr.message} (${urlCheckErr.response?.status || 'no status'})`);
            console.warn(`⚠️  Evolution API may fail to fetch this URL. Proceeding with text fallback strategy.`);
        }

        // If media URL is invalid, fail gracefully
        if (!mediaUrlValid) {
            const mediaErr = new Error('Media URL is not accessible');
            mediaErr.code = 'WHATSAPP_MEDIA_UNREACHABLE';
            mediaErr.isExpected = true;
            throw mediaErr;
        }

        // OPTIMIZED payloads - use simplest format that Evolution API accepts
        const payloadFormats = [
            {
                number: contactNumber,
                mediatype: 'image',
                media: mediaUrl,
                caption: mediaCaption
            },
            {
                number: `${contactNumber}@s.whatsapp.net`,
                mediatype: 'image',
                media: mediaUrl,
                caption: mediaCaption
            },
            {
                number: contactNumber,
                mediatype: 'image',
                media: mediaUrl,
                mimetype: 'image/png',
                caption: mediaCaption
            },
            {
                number: `${contactNumber}@s.whatsapp.net`,
                mediatype: 'image',
                media: mediaUrl,
                mimetype: 'image/png',
                caption: mediaCaption
            }
        ];

        console.log(`📸 Sending WhatsApp Media to: ${contactNumber}`);
        console.log(`   Endpoint: ${endpoint}`);
        console.log(`   Media URL Valid: ${mediaUrlValid ? '✅ Yes' : '❌ No'}`);
        console.log(`   Caption: ${mediaCaption.substring(0, 60)}${mediaCaption.length > 60 ? '...' : ''}`);
        console.log(`   Total payload variants to try: ${payloadFormats.length}`);

        let lastError;
        let lastStatus;
        let lastResponseData;

        for (let i = 0; i < payloadFormats.length; i++) {
            const payload = payloadFormats[i];
            try {
                const response = await axios.post(endpoint, payload, {
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': token || apiKey
                    },
                    timeout: 30000
                });

                console.log(`✅ WhatsApp media sent on attempt ${i + 1} (Status: ${response.status})`);
                return true;
            } catch (err) {
                lastError = err;
                lastStatus = err.response?.status;
                lastResponseData = err.response?.data;
                console.warn(`⚠️ sendMedia attempt ${i + 1} failed:`, lastStatus || err.message);
                if (lastResponseData) {
                    console.warn('⚠️ sendMedia error payload:', typeof lastResponseData === 'string' ? lastResponseData : JSON.stringify(lastResponseData));
                }

                if (err.response?.status === 401 && apiKey) {
                    try {
                        const bearerResponse = await axios.post(endpoint, payload, {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${apiKey}`
                            },
                            timeout: 30000
                        });

                        console.log(`✅ WhatsApp media sent with Bearer auth (Status: ${bearerResponse.status})`);
                        return true;
                    } catch (bearerErr) {
                        lastError = bearerErr;
                    }
                }
            }
        }


        // 400-level media validation errors are common with provider payload quirks.
        // Soft-fail here so caller can use text fallback without noisy exception propagation.
        if (lastStatus === 400) {
            const softError = new Error('sendMedia rejected payload with 400; use text fallback');
            softError.code = 'WHATSAPP_MEDIA_BAD_REQUEST';
            softError.isExpected = true;
            softError.details = lastResponseData;
            throw softError;
        }

        throw lastError || new Error('All sendMedia payload attempts failed');
    } catch (error) {
        // Detect URL accessibility issues early
        if (error.code === 'WHATSAPP_MEDIA_UNREACHABLE') {
            console.error('⚠️  Media URL is not accessible - triggering text fallback');
            throw error;
        }

        // Expected errors (don't clutter logs)
        if (error.isExpected) {
            console.error('⚠️  Expected WhatsApp media error:', error.message);
            throw error;
        }

        console.error('❌ WhatsApp media send failed:', {
            status: error.response?.status,
            message: error.response?.data?.message || error.message,
            endpoint: error.config?.url,
            data: error.response?.data || error.details
        });
        throw error;
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
            console.log(`✅ Firebase token verified for UID: ${decodedToken.uid}`);
        } catch (err) {
            console.error("❌ Firebase token verification failed:", err.message);
            return res.status(401).json({ message: "Invalid or expired token" });
        }

        // Ensure UID matches
        if (decodedToken.uid !== uid) {
            console.warn(`⚠️  UID mismatch: ${decodedToken.uid} !== ${uid}`);
            return res.status(401).json({ message: "UID mismatch" });
        }

        let user = null;

        // 🔍 CHECK IF USER EXISTS BY UID
        user = await User.findOne({ uid: uid });

        if (user) {
            // ✅ USER EXISTS - UPDATE LOGIN TIMESTAMP & PROVIDER INFO
            console.log(`📝 Updating existing user: ${user.email}`);
            user.lastLogin = new Date();
            
            // Update additional info if provided
            if (name && !user.name) user.name = name;
            if (pic && !user.pic) user.pic = pic;
            if (phone && !user.phone) user.phone = phone;
            if (email && !user.email) user.email = email;
            
            await user.save();
            console.log(`✅ User updated successfully: ${user.email}`);
        } else {
            // 🔗 LINK EXISTING ACCOUNT BY EMAIL/PHONE (prevents duplicate key errors)
            if (normalizedEmail) {
                user = await User.findOne({ email: normalizedEmail });
            }

            if (!user && normalizedPhone) {
                user = await User.findOne({ phone: normalizedPhone });
            }

            if (user) {
                console.log(`🔗 Linking existing account to Firebase UID: ${user.email || user.phone}`);
                user.uid = uid;
                user.provider = provider;
                user.lastLogin = new Date();
                if (name && !user.name) user.name = name;
                if (pic && !user.pic) user.pic = pic;
                if (normalizedPhone && !user.phone) user.phone = normalizedPhone;
                if (normalizedEmail && !user.email) user.email = normalizedEmail;
                await user.save();
                console.log(`✅ Existing account linked successfully: ${user.email || user.phone}`);
            } else {
                // 🆕 NEW USER - CREATE ACCOUNT
                console.log(`🆕 Creating new user with UID: ${uid}`);

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
                        generatedUsername = `${baseUsername}${counter}`;
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
                console.log(`✅ New user created: ${user.email || user.phone}`);
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

        const normalizedEmail = email.toLowerCase().trim();
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const user = await User.findOne({ $or: [{ email: normalizedEmail }, { username: email.toLowerCase() }] });

        if (type === 'forget' && !user) return res.json({ result: "Done", message: "If account exists, check your email for reset code." });
        if (type === 'signup' && user) return res.status(400).json({ message: "Email already registered" });

        if (user) {
            user.otp = otp; user.otpExpires = new Date(Date.now() + 10 * 60000); await user.save();
        } else {
            await OTPRecord.findOneAndUpdate({ email: normalizedEmail }, { otp, email: normalizedEmail }, { upsert: true });
        }

        // 📧 CRITICAL FIX: Always send to user's actual email, not the input (which might be username)
        const emailToSend = user ? user.email : normalizedEmail;
        await sendMail(emailToSend, otp);
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
        
        console.log(`✅ Password reset successful for user: ${user.username}`);
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
                message: `Account temporarily locked due to multiple failed login attempts. Try again in ${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''}.`,
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
                
                console.warn(`⚠️ Login attempt by ${user.provider} user via manual login: ${user.email || user.username}`);
                
                return res.status(403).json({ 
                    message: `This account uses ${authMethod}. Use ${authMethod} to sign in or set a password using Forgot Password.`,
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
                
                console.log(`✅ Login successful: ${user.email || user.username}`);
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
                console.warn(`🔒 Account locked: ${user.email || user.username} - Too many failed attempts`);
                return res.status(403).json({ 
                    message: "Too many failed login attempts. Account locked for 15 minutes.",
                    remainingMinutes: 15
                });
            }
            
            await user.save();
            console.warn(`⚠️ Failed login attempt #${user.failedAttempts}: ${user.email || user.username}`);
        } else {
            console.warn(`⚠️ Login attempt for non-existent user: ${searchTerm}`);
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
                console.log(`📦 Fetching ${data.length} products...`);
                data.forEach((product, idx) => {
                    if (product.pic1) product.pic1 = sanitizeCloudinaryUrl(product.pic1);
                    if (product.pic2) product.pic2 = sanitizeCloudinaryUrl(product.pic2);
                    if (product.pic3) product.pic3 = sanitizeCloudinaryUrl(product.pic3);
                    if (product.pic4) product.pic4 = sanitizeCloudinaryUrl(product.pic4);
                    if (idx === 0 && product.pic1) {
                        console.log(`✅ Sample Product pic1: ${product.pic1.substring(0, 60)}...`);
                    }
                });
            }
            
            res.json(data);
        } catch (e) { 
            console.error(`❌ Error fetching ${path}:`, e.message);
            res.status(500).json({ error: "Failed to fetch data." }); 
        }
    });
    app.get(`${path}/:id`, async (req, res) => {
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
    app.post(path, useUpload ? upload : (req,res,next)=>next(), async (req, res) => {
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
    app.put(`${path}/:id`, useUpload ? upload : (req,res,next)=>next(), async (req, res) => {
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
        
        console.log("✅ MongoDB connected successfully");
        console.log(`📊 Database: ${mongoose.connection.name}`);
        console.log(`🔗 State: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
        
          // 🔴 Trimming to ensure no space/newline error
              // --- server.js AI REFACTOR START ---
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

// 🔴 REAL-TIME ORDER TRACKING - Get single order
app.get('/api/orders/:userId', async (req, res) => {
    try {
        const userId = String(req.params.userId || '').trim();

        if (!userId) {
            return res.status(400).json({ message: 'userId is required' });
        }

        // 🔴 FETCH FROM ORDER COLLECTION (primary source)
        const orders = await Order.find({ userid: userId })
            .sort({ updatedAt: -1, createdAt: -1 })
            .select('orderId orderStatus finalAmount paymentStatus paymentMethod updatedAt createdAt')
            .lean();

        // 🔴 MERGE WITH CHECKOUT COLLECTION (sync fallback - in case of manual DB updates)
        if (orders.length === 0) {
            const checkoutOrders = await Checkout.find({ userid: userId })
                .sort({ updatedAt: -1, createdAt: -1 })
                .lean();
            
            return res.json({
                success: true,
                orders: checkoutOrders.map((item) => ({
                    orderId: item.orderId || `CHECKOUT-${item._id}`,
                    orderStatus: item.orderstatus || 'Order Placed',
                    finalAmount: Number(item.finalAmount || 0),
                    paymentStatus: item.paymentstatus || 'Pending',
                    paymentMethod: item.paymentmode || 'COD',
                    updatedAt: item.updatedAt || new Date()
                }))
            });
        }

        return res.json({
            success: true,
            orders: orders.map((item) => ({
                orderId: item.orderId,
                orderStatus: item.orderStatus || 'Order Placed',
                finalAmount: Number(item.finalAmount || 0),
                paymentStatus: item.paymentStatus || 'Pending',
                paymentMethod: item.paymentMethod || 'COD',
                updatedAt: item.updatedAt || item.createdAt || new Date()
            }))
        });
    } catch (e) {
        console.error('❌ Orders list fetch error:', e.message);
        return res.status(500).json({ message: 'Failed to fetch orders' });
    }
});

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
            .select('orderId orderStatus finalAmount updatedAt createdAt')
            .lean();

        return res.json({
            success: true,
            orders: orders.map((item) => ({
                orderId: item.orderId,
                orderStatus: item.orderStatus || 'Order Placed',
                finalAmount: Number(item.finalAmount || 0),
                updatedAt: item.updatedAt || item.createdAt || new Date()
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

        const order = await Order.findOne({
            orderId,
            userid: userId
        }).lean();

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

        // 🔴 TRIGGER LUXURY NOTIFICATIONS (WhatsApp - disabled unless explicitly enabled)
        if (FEATURE_WHATSAPP_NOTIFICATIONS) {
            setImmediate(() => {
                User.findById(order.userid).lean()
                    .then((userDoc) => {
                        const resolvedPhone = order.shippingAddress?.phone || userDoc?.phone || order.userPhone;
                        const resolvedEmail = order.userEmail || userDoc?.email || '';
                        const resolvedName = order.userName || userDoc?.name || 'Customer';

                        return sendLuxeStatusNotification({
                            orderId: order.orderId,
                            status: normalized,
                            phone: resolvedPhone,
                            customerName: resolvedName,
                            email: resolvedEmail,
                            estimatedDelivery: order.estimatedArrival,
                            finalAmount: order.finalAmount,
                            totalAmount: order.totalAmount,
                            shippingAmount: order.shippingAmount,
                            paymentMethod: order.paymentMethod,
                            paymentStatus: order.paymentStatus,
                            shippingAddress: order.shippingAddress,
                            products: order.products
                        });
                    })
                    .catch(err => {
                        console.error(`⚠️  Background notification error: ${err.message}`);
                    });
            });
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
