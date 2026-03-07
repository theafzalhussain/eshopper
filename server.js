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

// �🔒 TRUST PROXY - MUST BE BEFORE CORS (fixes X-Forwarded-For errors from Railway/Cloudflare)
app.set('trust proxy', 1);

// 🔴 SENTRY v10 no longer uses Sentry.Handlers.requestHandler()

// �🔒 CORS - Production domain hardcoded (frontend is at eshopperr.me)
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
        if (origin && origin.includes('.vercel.app')) {
            return callback(null, true);
        }
        
        console.warn(`⚠️  CORS rejected: ${origin}`);
        return callback(new Error('CORS policy: Unauthorized origin'));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"]
};

// 🔴 CREATE HTTP SERVER + SOCKET.IO (after app is defined)
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: [
            'https://eshopperr.me',
            'https://www.eshopperr.me',
            'http://localhost:3000',
            'http://127.0.0.1:3000'
        ],
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

const STATUS_DELIVERY_DAYS = {
    Ordered: 7,
    Packed: 5,
    Shipped: 3,
    'Out for Delivery': 1,
    Delivered: 0
};

const resolveEstimatedArrival = ({ status, explicitDate, expectedDays }) => {
    const explicit = explicitDate ? new Date(explicitDate) : null;
    if (explicit && !Number.isNaN(explicit.getTime())) {
        return explicit;
    }

    const customDays = Number(expectedDays);
    const fallbackDays = Number.isFinite(customDays) && customDays >= 0
        ? customDays
        : (STATUS_DELIVERY_DAYS[status] ?? 7);

    const next = new Date();
    next.setHours(0, 0, 0, 0);
    next.setDate(next.getDate() + fallbackDays);
    return next;
};

// Feature toggles for clean baseline (enable email notifications).
const FEATURE_EMAIL_NOTIFICATIONS = String(process.env.FEATURE_EMAIL_NOTIFICATIONS || 'true').toLowerCase() === 'true';
const FEATURE_WHATSAPP_NOTIFICATIONS = String(process.env.FEATURE_WHATSAPP_NOTIFICATIONS || 'false').toLowerCase() === 'true';
const FEATURE_INVOICE_SYSTEM = String(process.env.FEATURE_INVOICE_SYSTEM || 'true').toLowerCase() === 'true';

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

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());

// 🔒 SECURITY HEADERS
app.use(helmet({ contentSecurityPolicy: false }));

// 🔒 RATE LIMITERS
const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { message: "Too many attempts. Try again later." }, standardHeaders: true, legacyHeaders: false });
app.use(globalLimiter);

// 📊 REQUEST LOGGING MIDDLEWARE
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// 🛡️ GLOBAL ERROR HANDLER FOR MALFORMED REQUESTS
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.warn('⚠️ Malformed JSON request detected');
        return res.status(400).json({ message: 'Invalid request format. Please check your input.' });
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

const isValidBase64Payload = (value = '') => {
    const raw = String(value || '').trim();
    return raw.length > 0 && /^[A-Za-z0-9+/=]+$/.test(raw);
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

// ==================== 🎨 EMAIL TEMPLATE SYSTEM - PREMIUM AUTOMATION ====================
const Handlebars = require('handlebars');
const fsPromises = require('fs').promises;

// Load and compile email template with Handlebars
const loadEmailTemplate = async (templateName, data) => {
    try {
        const templatePath = path.join(__dirname, 'email-templates', templateName);
        const templateSource = await fsPromises.readFile(templatePath, 'utf-8');
        const template = Handlebars.compile(templateSource);
        return template(data);
    } catch (error) {
        console.error(`❌ Error loading template ${templateName}:`, error.message);
        throw error;
    }
};

// Map order status to email template file
const ORDER_STATUS_TEMPLATES = {
    'order placed': '01-order-placed.html',
    'placed': '01-order-placed.html',
    'ordered': '02-order-confirmed-premium.html',
    'confirmed': '02-order-confirmed-premium.html',
    'packed': '03-order-packed.html',
    'shipped': '04-order-shipped.html',
    'out for delivery': '05-out-for-delivery.html',
    'delivered': '06-order-delivered.html'
};

// Get email subject by status
const getEmailSubject = (status, orderId) => {
    const statusLower = String(status || '').toLowerCase();
    const subjects = {
        'order placed': `✓ Order Received - ${orderId} | eShopper Luxe`,
        'placed': `✓ Order Received - ${orderId} | eShopper Luxe`,
        'ordered': `🎉 Order Confirmed - ${orderId} | eShopper Luxe`,
        'confirmed': `🎉 Order Confirmed - ${orderId} | eShopper Luxe`,
        'packed': `📦 Order Packed with Care - ${orderId} | eShopper Luxe`,
        'shipped': `🚚 Order Shipped - Track Your Package | ${orderId}`,
        'out for delivery': `⏰ Arriving Today! - ${orderId} | eShopper Luxe`,
        'delivered': `🎉 Delivered Successfully - ${orderId} | Rate Your Experience`
    };
    return subjects[statusLower] || `Order Update - ${orderId}`;
};

// Map order data to template variables
const mapOrderToTemplateData = (order, user = null) => {
    const frontendUrl = (process.env.FRONTEND_URL || 'https://eshopperr.me').replace(/\/$/, '');
    const logoUrl = process.env.BRAND_LOGO_URL || `${frontendUrl}/logo512.png`;
    
    // Safe access to shipping address
    const shipping = order.shippingAddress || {};
    const customerName = order.userName || user?.name || shipping.fullName || 'Valued Customer';
    const firstName = customerName.split(' ')[0];
    
    // Safe access to products
    const products = Array.isArray(order.products) ? order.products.map(p => ({
        name: p.name || 'Product',
        image: p.pic || p.image || p.pic1 || `${frontendUrl}/placeholder.jpg`,
        category: p.maincategory || p.category || 'Fashion',
        quantity: p.qty || p.quantity || 1,
        price: p.price || p.finalprice || 0,
        total: p.total || (p.price * (p.qty || 1)) || 0,
        size: p.size || '',
        color: p.color || ''
    })) : [];
    
    // Calculate amounts
    const totalAmount = Number(order.totalAmount || 0);
    const shippingAmount = Number(order.shippingAmount || 0);
    const finalAmount = Number(order.finalAmount || totalAmount + shippingAmount);
    const gstAmount = Math.round(finalAmount * 0.18); // Assuming 18% GST
    
    // Format dates
    const orderDate = new Date(order.orderDate || order.createdAt || Date.now()).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    
    const estimatedDelivery = order.estimatedArrival 
        ? new Date(order.estimatedArrival).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })
        : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    
    return {
        // Brand
        BRAND_LOGO_URL: logoUrl,
        
        // Order details
        ORDER_ID: order.orderId,
        ORDER_DATE: orderDate,
        TOTAL_AMOUNT: finalAmount,
        
        // Customer
        CUSTOMER_NAME: firstName,
        CUSTOMER_EMAIL: order.userEmail || user?.email || '',
        
        // Shipping
        SHIPPING_NAME: shipping.fullName || customerName,
        SHIPPING_ADDRESS: shipping.addressline1 || 'N/A',
        SHIPPING_CITY: shipping.city || '',
        SHIPPING_STATE: shipping.state || '',
        SHIPPING_PIN: shipping.pin || '',
        SHIPPING_PHONE: shipping.phone || user?.phone || '',
        
        // Products
        PRODUCTS: products,
        
        // Amounts
        SUBTOTAL: totalAmount,
        SHIPPING_AMOUNT: shippingAmount,
        GST_AMOUNT: gstAmount,
        
        // Payment
        PAYMENT_METHOD: order.paymentMethod || 'COD',
        PAYMENT_STATUS: order.paymentStatus || 'Pending',
        TRANSACTION_ID: order.transactionId || `TXN${Date.now()}`,
        
        // Billing (same as shipping if not provided)
        BILLING_NAME: shipping.fullName || customerName,
        
        // Delivery
        ESTIMATED_DELIVERY_DATE: estimatedDelivery,
        DELIVERY_TIME_SLOT: '10:00 AM - 6:00 PM',
        
        // Packed info
        PACKED_DATE: orderDate,
        ITEMS_COUNT: products.length,
        PACKAGE_WEIGHT: `${(products.length * 0.5).toFixed(1)} kg`,
        
        // Courier info (defaults)
        COURIER_NAME: order.courierName || 'Delhivery',
        AWB_NUMBER: order.awbNumber || `AWB${Date.now()}`,
        SHIPPED_DATE: orderDate,
        CARRIER_WEBSITE: order.carrierWebsite || 'https://www.delhivery.com/track',
        
        // Delivery agent
        AGENT_NAME: order.agentName || 'Delivery Partner',
        AGENT_PHONE: order.agentPhone || '+91 98765 43210',
        
        // Delivered info
        DELIVERED_DATE: orderDate,
        RECEIVED_BY: 'Self',
        
        // Links
        TRACKING_URL: `${frontendUrl}/order-tracking/${order.orderId}`,
        INVOICE_URL: `${frontendUrl}/invoice/${order.orderId}`,
        TAX_INVOICE_URL: `${frontendUrl}/invoice/tax/${order.orderId}`,
        RATING_URL: `${frontendUrl}/rate-order/${order.orderId}`,
        REVIEW_URL: `${frontendUrl}/review/${order.orderId}`,
        REFERRAL_URL: `${frontendUrl}/refer`,
        REFERRAL_CODE: `LUXE${new Date().getFullYear()}${firstName.toUpperCase()}`,
        LIVE_MAP_URL: `${frontendUrl}/live-tracking/${order.orderId}`,
        
        // Support
        WHATSAPP_SUPPORT_URL: 'https://wa.me/918447859784',
        INSTAGRAM_URL: 'https://instagram.com/eshopperluxe',
        SUPPORT_EMAIL: 'support@eshopperr.me',
        SUPPORT_PHONE: '+91 8447859784',
        PRIVACY_POLICY_URL: `${frontendUrl}/privacy`,
        TERMS_URL: `${frontendUrl}/terms`,
        RETURN_POLICY_URL: `${frontendUrl}/returns`
    };
};

// Send order email based on status
const sendOrderEmail = async (order, status, user = null, options = {}) => {
    try {
        if (!FEATURE_EMAIL_NOTIFICATIONS) {
            console.log('⏭️ Email notifications disabled');
            return { skipped: true };
        }
        
        const statusLower = String(status || order.orderStatus || '').toLowerCase();
        const templateFile = ORDER_STATUS_TEMPLATES[statusLower];
        
        if (!templateFile) {
            console.warn(`⚠️ No email template for status: ${status}`);
            return { skipped: true };
        }
        
        const customerEmail = options.toEmail || order.userEmail || user?.email;
        if (!customerEmail || !customerEmail.includes('@')) {
            console.warn(`⚠️ Invalid email for order ${order.orderId}`);
            return { skipped: true };
        }
        
        // Map order data to template variables
        const templateData = mapOrderToTemplateData(order, user);
        
        // Load and render template
        const htmlContent = await loadEmailTemplate(templateFile, templateData);
        
        // Send email
        await sendTransactionalEmail({
            toEmail: customerEmail,
            toName: options.toName || templateData.CUSTOMER_NAME,
            subject: options.subject || getEmailSubject(statusLower, order.orderId),
            htmlContent: htmlContent,
            textContent: options.textContent || `Your order ${order.orderId} status: ${status}`,
            attachments: Array.isArray(options.attachments) ? options.attachments : []
        });
        
        console.log(`✅ Email sent for ${status}: ${order.orderId} → ${customerEmail}`);
        return { success: true };
        
    } catch (error) {
        console.error(`❌ Error sending order email:`, error.message);
        if (process.env.SENTRY_DSN && Sentry) Sentry.captureException(error);
        return { error: error.message };
    }
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

// 🔴 BUILD ORDER RECEIPT HTML - Luxury design with 💎 emoji logo
const buildOrderReceiptHtml = ({
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
    const orderDateObj = new Date(orderDate || Date.now());
    const orderDateText = orderDateObj.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const subtotal = Number(totalAmount || safeProducts.reduce((sum, item) => sum + Number(item.total || (item.price * item.qty) || 0), 0));
    const shipping = Number(shippingAmount ?? Math.max(0, Number(finalAmount || 0) - subtotal));
    const payable = Number(finalAmount || (subtotal + shipping));

    const rows = safeProducts.map((item, idx) => {
        const qty = Number(item.qty || 1);
        const price = Number(item.price || 0);
        const line = Number(item.total || (qty * price));
        const sizeText = item.size ? ` (Size: ${item.size})` : '';
        const colorText = item.color ? `, ${item.color}` : '';
        const itemDesc = `${item.name || 'Product'}${sizeText}${colorText}`;
        return `
            <tr>
                <td style="padding:12px 10px; text-align:center; font-size:12px; color:#666; border:1px solid #e8dcc8;">${idx + 1}</td>
                <td style="padding:12px 10px; font-size:13px; color:#111; font-weight:600; border:1px solid #e8dcc8;">${itemDesc}</td>
                <td style="padding:12px 10px; text-align:center; font-size:13px; color:#111; border:1px solid #e8dcc8;">${qty}</td>
                <td style="padding:12px 10px; text-align:right; font-size:13px; color:#666; border:1px solid #e8dcc8;">₹${price.toLocaleString('en-IN')}</td>
                <td style="padding:12px 10px; text-align:right; font-size:14px; color:#d4af37; font-weight:700; border:1px solid #e8dcc8;">₹${line.toLocaleString('en-IN')}</td>
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
                body { background: #f5f5f3; color: #2c2c2c; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; line-height: 1.6; }
                .wrap { max-width: 900px; margin: 0 auto; padding: 16px; position: relative; }
                .watermark {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) rotate(-45deg);
                    font-size: 72px;
                    font-weight: 300;
                    color: rgba(212, 175, 55, 0.08);
                    white-space: nowrap;
                    pointer-events: none;
                    z-index: 0;
                    letter-spacing: 8px;
                    font-style: italic;
                }
                
                .card { background: #fdfdfd; border: 2px solid #d4af37; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.08); position: relative; z-index: 1; }
                .head { padding: 24px 20px; background: linear-gradient(135deg, #fdfdfd, #f9f7f4); border-bottom: 1px solid #e8dcc8; }
                .brand-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
                .brand-left { width: 64px; text-align: left; vertical-align: middle; }
                .brand-center { text-align: center; vertical-align: middle; }
                .brand-spacer { width: 64px; }
                .brand-badge { width: 50px; height: 50px; border-radius: 12px; background: linear-gradient(135deg, #0a0a0a, #16213e); border: 2px solid #d4af37; text-align: center; overflow: hidden; display: flex; align-items: center; justify-content: center; }
                .brand-badge img { width: 100%; height: 100%; object-fit: contain; display: block; }
                .brand-title { font-size: 34px; font-weight: 900; color: #d4af37; letter-spacing: 1px; margin: 0; line-height: 1.2; }
                .tagline { font-size: 12px; color: #8b7521; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin: 6px 0 0 0; }
                .body { padding: 36px; }
                .title { font-size: 36px; font-weight: 900; margin: 0 0 12px; color: #0f0f0f; letter-spacing: 2px; text-align: center; }
                .subtitle { font-size: 14px; color: #8b7521; text-align: center; font-weight: 700; letter-spacing: 1px; margin-bottom: 28px; }
                .status-badge { display: inline-block; background: linear-gradient(135deg, #1f8f54, #16a34a); color: #fff; padding: 12px 24px; border-radius: 20px; font-weight: 700; margin: 0 auto 16px; display: block; text-align: center; width: fit-content; box-shadow: 0 4px 12px rgba(31,143,84,0.3); }
                .status-message { text-align: center; color: #0f0f0f; font-weight: 600; font-size: 14px; margin-bottom: 32px; }
                .next-steps { margin: 32px 0; }
                .steps-title { font-size: 13px; letter-spacing: 2px; text-transform: uppercase; color: #0f0f0f; font-weight: 700; margin-bottom: 20px; text-align: center; }
                .steps-container { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
                .step { border: 2px solid #d4af37; border-radius: 12px; padding: 20px 16px; background: linear-gradient(135deg, #fffef8 0%, #fff9e6 100%); text-align: center; box-shadow: 0 2px 8px rgba(212,175,55,0.1); }
                .step-icon { font-size: 32px; margin-bottom: 12px; }
                .step-text { font-size: 12px; font-weight: 700; color: #0f0f0f; }
                .delivery-highlight { border: 3px solid #d4af37; border-radius: 14px; padding: 24px; background: linear-gradient(135deg, #a37f1f 0%, #d4af37 50%, #8b7521 100%); text-align: center; margin: 32px 0; box-shadow: 0 4px 16px rgba(212,175,55,0.2); }
                .delivery-label { color: #fff; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; margin-bottom: 8px; }
                .delivery-date { color: #fff; font-size: 24px; font-weight: 900; letter-spacing: 1px; }
                .items-section { margin: 32px 0; }
                .section-title { font-size: 13px; letter-spacing: 2px; text-transform: uppercase; color: #0f0f0f; font-weight: 700; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 2px solid #d4af37; }
                table { width: 100%; border-collapse: collapse; background: #fff; }
                th { background: linear-gradient(135deg, #0f0f0f, #1a1a1a); color: #ffd700; font-size: 11px; letter-spacing: 1.2px; padding: 14px 12px; text-transform: uppercase; font-weight: 700; text-align: left; border: 2px solid #d4af37; }
                td { border: 1px solid #e8dcc8; padding: 13px 12px; font-size: 13px; color: #2c2c2c; }
                tr:nth-child(odd) { background: #fafaf8; }
                tr:hover { background: #f5f0e6; }
                .summary-boxes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 32px 0; }
                .summary-box { border: 2px solid #d4af37; border-radius: 12px; padding: 18px 16px; background: linear-gradient(135deg, #fffef8 0%, #fff9e6 100%); text-align: center; box-shadow: 0 2px 8px rgba(212,175,55,0.1); }
                .summary-label { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #8b7521; font-weight: 700; margin-bottom: 10px; }
                .summary-value { font-size: 18px; font-weight: 900; color: #0f0f0f; }
                .disclaimer { border-left: 4px solid #d4af37; padding: 16px; background: #f9f7f4; margin: 32px 0; font-size: 12px; color: #555; line-height: 1.8; }
                .disclaimer-title { font-weight: 700; color: #0f0f0f; margin-bottom: 8px; }
                .footer { margin-top: 32px; padding-top: 20px; border-top: 2px solid #e8dcc8; }
                .foot { font-size: 12px; color: #666; text-align: center; line-height: 1.8; }
                .foot-premium { color: #d4af37; font-weight: 700; margin-top: 14px; font-size: 13px; letter-spacing: 1px; }
                @media (max-width: 768px) {
                    .steps-container { grid-template-columns: 1fr; gap: 12px; }
                    .summary-boxes { grid-template-columns: 1fr; gap: 12px; }
                    .title { font-size: 28px; }
                }
            </style>
        </head>
        <body>
            <div class="watermark">eShopper Luxe</div>
            <div class="wrap">
                <div class="card">
                    <!-- PREMIUM HEADER -->
                    <div class="head">
                        <table class="brand-table" role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                                <td class="brand-left">
                                    <div class="brand-badge">
                                        <img src="${BRAND_LOGO_PDF_SRC}" alt="Logo" onerror="this.onerror=null;this.src='${BRAND_LOGO_FALLBACK_URL}'" />
                                    </div>
                                </td>
                                <td class="brand-center">
                                    <p class="brand-title">eShopper Boutique Luxe</p>
                                    <p class="tagline">Premium Fashion Destination</p>
                                </td>
                                <td class="brand-spacer"></td>
                            </tr>
                        </table>
                    </div>

                    <!-- MAIN CONTENT -->
                    <div class="body">
                        <h1 class="title">ORDER RECEIPT</h1>
                        <p class="subtitle">Thank you for your premium order</p>
                        
                        <!-- STATUS BADGE -->
                        <div style="text-align: center; margin-bottom: 28px;">
                            <div style="display: inline-block; background: linear-gradient(135deg, #1f8f54, #16a34a); color: #fff; padding: 10px 24px; border-radius: 20px; font-weight: 900; font-size: 12px; letter-spacing: 1px;">✓ ORDER RECEIVED</div>
                        </div>

                        <!-- ORDER STEPS -->
                        <div style="margin: 32px 0;">
                            <div style="font-size: 13px; letter-spacing: 2px; text-transform: uppercase; color: #0f0f0f; font-weight: 700; margin-bottom: 20px; text-align: center;">⏳ Order Processing Steps</div>
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;">
                                <div style="border: 2px solid #D4AF37; border-radius: 10px; padding: 16px; background: linear-gradient(135deg, #fffef8 0%, #fff9e6 100%); text-align: center;">
                                    <div style="font-size: 28px; margin-bottom: 8px;">✓</div>
                                    <div style="font-size: 12px; font-weight: 700; color: #8b7521;">Quality Check</div>
                                </div>
                                <div style="border: 2px solid #D4AF37; border-radius: 10px; padding: 16px; background: linear-gradient(135deg, #fffef8 0%, #fff9e6 100%); text-align: center;">
                                    <div style="font-size: 28px; margin-bottom: 8px;">📦</div>
                                    <div style="font-size: 12px; font-weight: 700; color: #8b7521;">Premium Packaging</div>
                                </div>
                                <div style="border: 2px solid #D4AF37; border-radius: 10px; padding: 16px; background: linear-gradient(135deg, #fffef8 0%, #fff9e6 100%); text-align: center;">
                                    <div style="font-size: 28px; margin-bottom: 8px;">🚚</div>
                                    <div style="font-size: 12px; font-weight: 700; color: #8b7521;">Dispatch</div>
                                </div>
                            </div>
                        </div>

                        <!-- ORDER DETAILS -->
                        <div class="items-section">
                            <div class="section-title">📦 Your Order</div>
                            <table>
                                <thead>
                                    <tr>
                                        <th style="width:8%">#</th>
                                        <th style="width:50%">Item</th>
                                        <th style="width:12%">Qty</th>
                                        <th style="width:30%">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>${rows || '<tr><td colspan="4" style="text-align:center;padding:16px;">No items found</td></tr>'}</tbody>
                            </table>
                        </div>

                        <!-- SUMMARY -->
                        <div class="summary-boxes">
                            <div class="summary-box">
                                <div class="summary-label">📦 Subtotal</div>
                                <div class="summary-value">₹${subtotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                            </div>
                            <div class="summary-box">
                                <div class="summary-label">🚚 Shipping</div>
                                <div class="summary-value">${shipping <= 0 ? '🎁 FREE' : `₹${shipping.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}</div>
                            </div>
                            <div class="summary-box">
                                <div class="summary-label">💰 Total</div>
                                <div class="summary-value">₹${payable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                            </div>
                        </div>

                        <!-- PAYMENT INFO -->
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 32px 0;">
                            <div style="border: 2px solid #d4af37; border-radius: 12px; padding: 16px 18px; background: linear-gradient(135deg, #fffef8 0%, #fff9e6 100%); box-shadow: 0 2px 8px rgba(212,175,55,0.1);">
                                <div style="font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: #8b7521; font-weight: 700; margin-bottom: 8px;">💳 Payment Method</div>
                                <div style="font-size: 15px; font-weight: 700; color: #0f0f0f;">${paymentMethod || 'Cash on Delivery'}</div>
                            </div>
                            <div style="border: 2px solid #d4af37; border-radius: 12px; padding: 16px 18px; background: linear-gradient(135deg, #fffef8 0%, #fff9e6 100%); box-shadow: 0 2px 8px rgba(212,175,55,0.1);">
                                <div style="font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: #8b7521; font-weight: 700; margin-bottom: 8px;">📊 Order Date</div>
                                <div style="font-size: 15px; font-weight: 700; color: #0f0f0f;">${orderDateText}</div>
                            </div>
                        </div>

                        <!-- DISCLAIMER -->
                        <div class="disclaimer">
                            <div class="disclaimer-title">📋 IMPORTANT NOTICE</div>
                            This is a preliminary receipt confirming that your order has been successfully placed. Your official Tax Invoice will be generated and sent to you upon successful delivery of your order. We appreciate your purchase and look forward to serving you!
                        </div>

                        <!-- FOOTER -->
                        <div class="footer">
                            <div class="foot">
                                <strong>For support:</strong> support@eshopperr.me<br/>
                                <strong>Website:</strong> eshopperr.me<br/>
                                <strong>Order ID:</strong> ${orderId}
                            </div>
                            <div class="foot-premium">💎 eShopper Boutique Luxe • Premium Edition • Authenticity Guaranteed 💎</div>
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
};

// 🔴 BUILD ORDER CONFIRMATION PROFORMA HTML - For verified/confirmed orders
const buildOrderConfirmationProformaHtml = ({
    orderId,
    userName,
    userEmail,
    paymentMethod,
    finalAmount,
    totalAmount,
    shippingAmount,
    shippingAddress,
    products,
    orderDate,
    estimatedArrival,
    deliveryPartner
}) => {
    const displayName = userName || 'Valued Customer';
    const safeProducts = Array.isArray(products) ? products : [];
    const orderDateObj = new Date(orderDate || Date.now());
    const orderDateText = orderDateObj.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const expectedDate = new Date(estimatedArrival || (Date.now() + 6 * 24 * 60 * 60 * 1000));
    const expectedDateText = expectedDate.toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    const subtotal = Number(totalAmount || safeProducts.reduce((sum, item) => sum + Number(item.total || (item.price * item.qty) || 0), 0));
    const shipping = Number(shippingAmount ?? Math.max(0, Number(finalAmount || 0) - subtotal));
    const payable = Number(finalAmount || (subtotal + shipping));

    const partner = deliveryPartner || 'Delhivery';
    const trackingLink = `${BRAND_SITE_URL}/order-tracking/${encodeURIComponent(orderId || '')}`;
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(trackingLink)}`;

    const rows = safeProducts.map((item, idx) => {
        const qty = Number(item.qty || 1);
        const price = Number(item.price || 0);
        const line = Number(item.total || (qty * price));
        const itemDesc = item.name ? `${item.name}${item.size ? ` • Size: ${item.size}` : ''}${item.color ? ` • ${item.color}` : ''}` : 'Product';
        return `
            <tr>
                <td style="width:8%; text-align:center;">${String(idx + 1).padStart(2, '0')}</td>
                <td style="width:52%;"><strong>${itemDesc}</strong><br/><span style="font-size:10px;color:#555;">Quality Inspected: Yes</span></td>
                <td style="width:10%; text-align:center; font-weight:700;">${qty}</td>
                <td style="width:15%; text-align:right; font-weight:700;">₹${price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                <td style="width:15%; text-align:right; font-weight:800; color:#1f8f54;">₹${line.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
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
                @page { size: A4 portrait; margin: 12mm; }
                * { box-sizing: border-box; margin: 0; padding: 0; }
                html { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                body { background:#f6f6f4; color:#1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
                .wrap { max-width: 900px; margin: 0 auto; padding: 6px; position: relative; }
                .card { background:#fff; border:2px solid #d4af37; border-radius:12px; overflow:hidden; position:relative; }
                .watermark { position:absolute; top:110px; left:50%; transform:translateX(-50%) rotate(-18deg); color:rgba(31,143,84,0.10); font-size:52px; font-weight:900; letter-spacing:2px; white-space:nowrap; }
                .head { padding:18px 20px; background:#faf8f2; border-bottom:1px solid #eadfbf; }
                .brand { display:flex; align-items:center; gap:10px; }
                .brand img { width:42px; height:42px; border-radius:8px; border:1px solid #d4af37; background:#fff; object-fit:contain; }
                .brand-title { font-size:22px; font-weight:900; color:#8b7521; }
                .title { margin-top:10px; font-size:15px; letter-spacing:1.5px; text-transform:uppercase; font-weight:800; color:#2a2a2a; }
                .badge { display:inline-block; margin-top:10px; background:linear-gradient(135deg,#1f8f54,#16a34a); color:#fff; font-size:11px; font-weight:900; padding:7px 12px; border-radius:14px; }
                .body { padding:20px; }
                .delivery { border:1px solid #d4af37; border-radius:10px; padding:14px; background:#fffaf0; margin-bottom:16px; }
                .delivery .k { font-size:10px; letter-spacing:1px; color:#8b7521; font-weight:800; text-transform:uppercase; }
                .delivery .v { margin-top:7px; font-size:18px; color:#111; font-weight:900; }
                .delivery .sub { margin-top:4px; font-size:12px; color:#555; }
                .meta { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:16px; }
                .box { border:1px solid #e6dcc4; border-radius:8px; padding:10px; background:#fcfbf8; }
                .box .k { font-size:10px; color:#7c6b3a; text-transform:uppercase; letter-spacing:1px; font-weight:800; }
                .box .v { margin-top:6px; font-size:12px; font-weight:700; color:#222; }
                table { width:100%; border-collapse:collapse; }
                th { background:#1a1a1a; color:#d4af37; text-transform:uppercase; font-size:10px; letter-spacing:1px; font-weight:800; padding:10px 8px; text-align:left; }
                td { border:1px solid #ececec; padding:10px 8px; font-size:12px; }
                tbody tr:nth-child(odd) { background:#ffffff; }
                tbody tr:nth-child(even) { background:#f3f3f3; }
                .summary { margin-top:14px; margin-left:auto; width:280px; border:1px solid #dadada; border-radius:8px; padding:10px 12px; }
                .row { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #eee; font-size:12px; }
                .row:last-child { border-bottom:none; }
                .grand { font-weight:900; font-size:15px; color:#0f0f0f; }
                .footer { display:flex; justify-content:space-between; gap:14px; margin-top:18px; }
                .terms { flex:1; border-left:3px solid #d4af37; background:#faf8f2; padding:10px 12px; font-size:10.5px; color:#555; line-height:1.6; }
                .qr { width:120px; text-align:center; }
                .qr img { width:90px; height:90px; border:1px solid #d4af37; border-radius:6px; background:#fff; }
                .qr p { font-size:10px; color:#666; margin-top:6px; }
                @media (max-width:700px) {
                    .meta { grid-template-columns:1fr; }
                    .footer { flex-direction:column; }
                    .summary { width:100%; }
                }
            </style>
        </head>
        <body>
            <div class="wrap">
                <div class="card">
                    <div class="watermark">Verified & Confirmed</div>
                    <div class="head">
                        <div class="brand">
                            <div style="font-size:48px; font-weight:900; color:#d4af37; margin-bottom:8px;">💎</div>
                            <div class="brand-title">eShopper Boutique Luxe</div>
                        </div>
                        <div class="title">Order Confirmation Proforma Invoice</div>
                        <span class="badge">Verified & Confirmed</span>
                    </div>

                    <div class="body">
                        <div class="delivery">
                            <div class="k">Expected Delivery</div>
                            <div class="v">${expectedDateText}</div>
                            <div class="sub">Delivery Partner: ${partner}</div>
                        </div>

                        <div class="meta">
                            <div class="box"><div class="k">Order ID</div><div class="v">${orderId || '-'}</div></div>
                            <div class="box"><div class="k">Date</div><div class="v">${orderDateText}</div></div>
                            <div class="box"><div class="k">Payment</div><div class="v">${paymentMethod || 'COD'} | ₹${payable.toLocaleString('en-IN')}</div></div>
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th style="width:8%">#</th>
                                    <th style="width:52%">Itemized Detail</th>
                                    <th style="width:10%">Qty</th>
                                    <th style="width:15%">Unit</th>
                                    <th style="width:15%">Total</th>
                                </tr>
                            </thead>
                            <tbody>${rows || '<tr><td colspan="5" style="text-align:center">No items found</td></tr>'}</tbody>
                        </table>

                        <div class="summary">
                            <div class="row"><span>Subtotal</span><span>₹${subtotal.toLocaleString('en-IN')}</span></div>
                            <div class="row"><span>Shipping</span><span>${shipping <= 0 ? 'Free' : `₹${shipping.toLocaleString('en-IN')}`}</span></div>
                            <div class="row grand"><span>Grand Total</span><span>₹${payable.toLocaleString('en-IN')}</span></div>
                        </div>

                        <div class="footer">
                            <div class="terms">
                                <strong>Cancellation & Return Policy (Summary):</strong><br/>
                                Orders can be cancelled before dispatch. Return requests are accepted as per policy window for eligible items in original condition with tags and packaging intact.
                            </div>
                            <div class="qr">
                                <img src="${qrSrc}" alt="Support QR"/>
                                <p>Scan to open Order Tracking</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
};

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

    const rows = safeProducts.map((item, idx) => {
        const qty = Number(item.qty || 1);
        const price = Number(item.price || 0);
        const line = Number(item.total || (qty * price));
        const itemDesc = item.name ? `${item.name}${item.size ? ` • Size: ${item.size}` : ''}${item.color ? ` • ${item.color}` : ''}` : 'Product';
        const hsn = item.hsn || '6204';
        const unitPrice = price;
        const discountPct = item.discountPercent || 0;
        const taxRate = 18; // IGST
        const taxAmount = Math.round((line * taxRate) / 100);
        const priceBeforeTax = line;

        return `
            <tr>
                <td style="width:6%; text-align:center;">${String(idx + 1).padStart(2, '0')}</td>
                <td style="width:3%; text-align:center; font-weight:600;">${hsn}</td>
                <td style="width:38%;"><strong>${itemDesc}</strong></td>
                <td style="width:8%; text-align:center;">${qty}</td>
                <td style="width:12%; text-align:right; font-weight:600;">₹${unitPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                <td style="width:10%; text-align:center;">${discountPct}%</td>
                <td style="width:12%; text-align:right; font-weight:600;">₹${priceBeforeTax.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                <td style="width:11%; text-align:right; font-weight:700; color:#1f8f54;">₹${taxAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
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
                body { background: #f5f5f3; color: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; line-height: 1.5; }
                .wrap { max-width: 900px; margin: 0 auto; padding: 16px; position: relative; }
                
                /* PAID STAMP */
                .paid-stamp {
                    position: fixed;
                    top: 30%;
                    right: 10%;
                    transform: rotate(25deg);
                    font-size: 64px;
                    font-weight: 900;
                    color: rgba(31, 143, 84, 0.15);
                    white-space: nowrap;
                    pointer-events: none;
                    z-index: 0;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                    border: 3px solid rgba(31, 143, 84, 0.15);
                    padding: 12px 28px;
                    border-radius: 8px;
                }
                
                .card { background: #fff; border: 2px solid #d4af37; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); position: relative; z-index: 1; }
                .head { padding: 22px 20px; background: #f5f5f3; border-bottom: 1px solid #e8dcc8; position: relative; }
                .tax-label { position: absolute; top: 20px; right: 20px; font-size: 14px; font-weight: 900; color: #d4af37; letter-spacing: 2px; text-transform: uppercase; }
                .brand-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
                .brand-left { width: 64px; text-align: left; vertical-align: middle; }
                .brand-center { text-align: center; vertical-align: middle; }
                .brand-spacer { width: 64px; }
                .brand-badge { width: 48px; height: 48px; border-radius: 10px; background: linear-gradient(135deg, #0a0a0a, #16213e); border: 2px solid #d4af37; overflow: hidden; display: flex; align-items: center; justify-content: center; }
                .brand-badge img { width: 100%; height: 100%; object-fit: contain; }
                .brand-title { font-size: 32px; font-weight: 900; color: #d4af37; letter-spacing: 1px; margin: 0; }
                .tagline { font-size: 11px; color: #8b7521; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin: 4px 0 0 0; }
                .body { padding: 32px; }
                .title { font-size: 20px; font-weight: 800; margin: 0 0 12px; color: #0f0f0f; letter-spacing: 1px; }
                .seller-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; font-size: 12px; line-height: 1.8; }
                .seller-box { border: 1px solid #d4af37; padding: 12px; background: #f9f7f4; border-radius: 8px; }
                .seller-title { font-weight: 800; color: #0f0f0f; margin-bottom: 8px; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; }
                .seller-text { color: #333; font-size: 11px; }
                .items-section { margin: 24px 0; }
                .section-title { font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; color: #0f0f0f; font-weight: 800; margin-bottom: 12px; }
                table { width: 100%; border-collapse: collapse; background: #fff; }
                th { background: linear-gradient(135deg, #0f0f0f, #1a1a1a); color: #ffd700; font-size: 10px; letter-spacing: 1px; padding: 12px 8px; text-transform: uppercase; font-weight: 800; text-align: left; border: 1px solid #d4af37; white-space: nowrap; }
                td { border: 1px solid #e8dcc8; padding: 11px 8px; font-size: 12px; color: #1a1a1a; }
                tr:nth-child(even) { background: #f5f5f3; }
                tr:nth-child(odd) { background: #fff; }
                tr:hover { background: #fffef8; }
                .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0; }
                .summary-box { border: 1px solid #d4af37; padding: 14px; background: #f9f7f4; border-radius: 8px; text-align: center; }
                .summary-label { font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: #8b7521; font-weight: 800; margin-bottom: 6px; }
                .summary-value { font-size: 16px; font-weight: 800; color: #0f0f0f; }
                .payment-info { border: 2px solid #1f8f54; padding: 16px; background: rgba(31, 143, 84, 0.05); border-radius: 8px; margin: 20px 0; }
                .payment-badge { display: inline-block; background: linear-gradient(135deg, #1f8f54, #16a34a); color: #fff; padding: 8px 16px; border-radius: 14px; font-weight: 800; font-size: 11px; letter-spacing: 1px; margin-bottom: 10px; }
                .payment-detail { font-size: 12px; color: #333; margin: 6px 0; }
                .qr-section { text-align: center; margin: 20px 0; padding: 16px; background: #f9f7f4; border-radius: 8px; border: 1px solid #d4af37; }
                .qr-unit { display: inline-block; width: 120px; height: 120px; background: #fff; border: 2px solid #d4af37; border-radius: 6px; }
                .qr-label { font-size: 10px; margin-top: 8px; color: #666; letter-spacing: 1px; text-transform: uppercase; font-weight: 700; }
                .signature-block { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 24px 0; padding-top: 16px; border-top: 1px solid #e8dcc8; }
                .sig-item { text-align: center; }
                .sig-line { border-top: 2px solid #000; margin-bottom: 4px; height: 40px; }
                .sig-label { font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: #333; font-weight: 700; }
                .return-box { border-left: 4px solid #d4af37; padding: 12px; background: #f9f7f4; margin: 16px 0; font-size: 11px; color: #333; border-radius: 4px; }
                .return-title { font-weight: 800; color: #0f0f0f; margin-bottom: 6px; }
                .footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid #e8dcc8; }
                .foot { font-size: 11px; color: #666; text-align: center; line-height: 1.7; }
                .foot-premium { color: #d4af37; font-weight: 800; margin-top: 8px; font-size: 12px; letter-spacing: 1px; }
                @media (max-width: 768px) {
                    .body { padding: 20px; }
                    .seller-section { grid-template-columns: 1fr; }
                    .signature-block { grid-template-columns: 1fr; }
                    table { font-size: 11px; }
                    th, td { padding: 8px 6px; }
                }
            </style>
        </head>
        <body>
            <div class="paid-stamp">PAID</div>
            <div class="wrap">
                <div class="card">
                    <!-- PREMIUM HEADER -->
                    <div class="head">
                        <div class="tax-label">TAX INVOICE</div>
                        <table class="brand-table" role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                                <td class="brand-left">
                                    <div class="brand-badge">
                                        <img src="${BRAND_LOGO_PDF_SRC}" alt="Logo" onerror="this.onerror=null;this.src='${BRAND_LOGO_FALLBACK_URL}'" />
                                    </div>
                                </td>
                                <td class="brand-center">
                                    <p class="brand-title">eShopper Boutique Luxe</p>
                                    <p class="tagline">Premium Fashion Destination</p>
                                </td>
                                <td class="brand-spacer"></td>
                            </tr>
                        </table>
                    </div>

                    <!-- MAIN CONTENT -->
                    <div class="body">
                        <!-- SELLER INFO -->
                        <div class="seller-section">
                            <div class="seller-box">
                                <div class="seller-title">📋 Seller Details</div>
                                <div class="seller-text">
                                    <strong>eShopper Boutique Luxe</strong><br/>
                                    Premium Fashion Destination<br/><br/>
                                    <strong>GSTIN:</strong> 07AADCR5055K1Z1<br/>
                                    <strong>PAN:</strong> AADCR5055K<br/>
                                    <strong>Registered Office:</strong><br/>
                                    Plot No. 101, Tech Park,<br/>
                                    New Delhi - 110001, India
                                </div>
                            </div>
                            <div class="seller-box">
                                <div class="seller-title">🛍️ Bill To / Ship To</div>
                                <div class="seller-text">
                                    <strong>${shippingAddress?.fullName || 'Customer'}</strong><br/>
                                    ${shippingAddress?.addressline1 || 'Address Line'}<br/>
                                    ${shippingAddress?.city || 'City'}, ${shippingAddress?.state || 'State'} - ${shippingAddress?.pin || 'PIN'}<br/>
                                    ${shippingAddress?.country || 'India'}<br/>
                                    <strong>Phone:</strong> ${shippingAddress?.phone || 'N/A'}<br/>
                                    <strong>Email:</strong> ${userEmail || 'N/A'}
                                </div>
                            </div>
                        </div>

                        <!-- ORDER META -->
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
                            <div style="border: 1px solid #d4af37; padding: 10px; background: #f9f7f4; border-radius: 6px;">
                                <div style="font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: #8b7521; font-weight: 800; margin-bottom: 4px;">🆔 Invoice #</div>
                                <div style="font-size: 13px; font-weight: 800; color: #0f0f0f;">${orderId}</div>
                            </div>
                            <div style="border: 1px solid #d4af37; padding: 10px; background: #f9f7f4; border-radius: 6px;">
                                <div style="font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: #8b7521; font-weight: 800; margin-bottom: 4px;">📅 Invoice Date</div>
                                <div style="font-size: 13px; font-weight: 800; color: #0f0f0f;">Today</div>
                            </div>
                            <div style="border: 1px solid #d4af37; padding: 10px; background: #f9f7f4; border-radius: 6px;">
                                <div style="font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: #8b7521; font-weight: 800; margin-bottom: 4px;">📦 Order Date</div>
                                <div style="font-size: 13px; font-weight: 800; color: #0f0f0f;">${orderDateText}</div>
                            </div>
                        </div>

                        <!-- ITEMS TABLE WITH HSN & TAX -->
                        <div class="items-section">
                            <div class="section-title">📦 Itemized Breakdown</div>
                            <table>
                                <thead>
                                    <tr>
                                        <th style="width:6%">#</th>
                                        <th style="width:3%">HSN</th>
                                        <th style="width:38%">Description</th>
                                        <th style="width:8%">Qty</th>
                                        <th style="width:12%">Unit Price</th>
                                        <th style="width:10%">Disc %</th>
                                        <th style="width:12%">Amount</th>
                                        <th style="width:11%">Tax (18%)</th>
                                    </tr>
                                </thead>
                                <tbody>${rows || '<tr><td colspan="8" style="text-align:center;padding:16px;">No items found</td></tr>'}</tbody>
                            </table>
                        </div>

                        <!-- SUMMARY -->
                        <div class="summary-grid">
                            <div class="summary-box">
                                <div class="summary-label">🛍️ Subtotal</div>
                                <div class="summary-value">₹${subtotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                            </div>
                            <div class="summary-box">
                                <div class="summary-label">🚚 Shipping</div>
                                <div class="summary-value">${shipping <= 0 ? '🎁 FREE' : `₹${shipping.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}</div>
                            </div>
                            <div class="summary-box">
                                <div class="summary-label">💰 Total Amount</div>
                                <div class="summary-value">₹${payable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                            </div>
                            <div class="summary-box">
                                <div class="summary-label">💳 Payment Method</div>
                                <div class="summary-value">${paymentMethod || 'COD'}</div>
                            </div>
                        </div>

                        <!-- PAYMENT INFO BADGE -->
                        <div class="payment-info">
                            <div class="payment-badge">✓ PAYMENT RECEIVED</div>
                            <div class="payment-detail"><strong>Status:</strong> ${paymentStatus === 'Paid' ? 'Paid Successfully' : 'Payment Pending'}</div>
                            <div class="payment-detail"><strong>Payment ID:</strong> PAY-${orderId.substring(0, 8)}</div>
                            <div class="payment-detail"><strong>Mode:</strong> ${paymentMethod || 'Cash on Delivery'}</div>
                        </div>

                        <!-- QR CODE -->
                        <div class="qr-section">
                            <div style="font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: #8b7521; font-weight: 800; margin-bottom: 10px;">📱 Scan for Order Status & Returns</div>
                            <svg class="qr-unit" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                                <rect width="200" height="200" fill="white"/>
                                <rect x="20" y="20" width="50" height="50" fill="black"/>
                                <rect x="30" y="30" width="30" height="30" fill="white"/>
                                <rect x="130" y="20" width="50" height="50" fill="black"/>
                                <rect x="140" y="30" width="30" height="30" fill="white"/>
                                <rect x="20" y="130" width="50" height="50" fill="black"/>
                                <rect x="30" y="140" width="30" height="30" fill="white"/>
                                <circle cx="100" cy="100" r="15" fill="black" opacity="0.4"/>
                            </svg>
                            <div class="qr-label">Links to Order History & Return Policy</div>
                        </div>

                        <!-- SIGNATURE BLOCK -->
                        <div class="signature-block">
                            <div class="sig-item">
                                <div class="sig-line"></div>
                                <div class="sig-label">Authorized Signatory</div>
                            </div>
                            <div class="sig-item">
                                <div style="text-align: center; margin-bottom: 8px; font-size: 20px;">🔒</div>
                                <div class="sig-label">Security Seal</div>
                            </div>
                        </div>

                        <!-- RETURN INFO -->
                        <div class="return-box">
                            <div class="return-title">📱 Scan for Easy 7-Day Returns & Exchange Policy</div>
                            This invoice QR code provides quick access to our comprehensive return and exchange policy. Returns are accepted within 7 days of delivery in original condition.
                        </div>

                        <!-- FOOTER -->
                        <div class="footer">
                            <div class="foot">
                                This is a computer-generated Tax Invoice and does not require a physical signature per GST Rules.<br/>
                                <strong>Support:</strong> support@eshopperr.me | <strong>Website:</strong> eshopperr.me
                            </div>
                            <div class="foot-premium">💎 eShopper Boutique Luxe • TAX INVOICE • Certified Authentic 💎</div>
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
};

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
                .head { padding: 24px 20px; background: #f5f5f3; }
                .brand-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
                .brand-left { width: 64px; text-align: left; vertical-align: middle; }
                .brand-center { text-align: center; vertical-align: middle; }
                .brand-spacer { width: 64px; }
                .brand-badge { width: 50px; height: 50px; border-radius: 12px; background: linear-gradient(135deg, #0a0a0a, #16213e); border: 2px solid #d4af37; text-align: center; overflow: hidden; display: flex; align-items: center; justify-content: center; }
                .brand-badge img { width: 100%; height: 100%; object-fit: contain; display: block; }
                .brand-title { font-size: 34px; font-weight: 900; color: #d4af37; letter-spacing: 1px; margin: 0; line-height: 1.2; }
                .tagline { font-size: 12px; color: #8b7521; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin: 6px 0 0 0; }
                .logo-section { margin-bottom: 16px; }
                .logo-icon { font-size: 64px; line-height: 1; margin: 0 0 12px 0; display: inline-block; }
                .brand-name { font-size: 56px; font-weight: 700; letter-spacing: 4px; margin: 0 0 4px 0; background: linear-gradient(90deg, #fff9e6, #d4af37, #fff9e6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
                .brand-tagline { font-size: 13px; letter-spacing: 3px; text-transform: uppercase; color: #ffd700; font-weight: 700; margin-top: 8px; }
                .tag-badge { font-size: 11px; letter-spacing: 2px; margin-top: 14px; text-transform: uppercase; color: #fff9e6; font-weight: 700; display: inline-block; border: 1px solid #ffd700; padding: 6px 16px; border-radius: 20px; }
                .body { padding: 36px; }
                .title { font-family: 'Playfair Display', serif; font-size: 32px; font-weight: 700; margin: 0 0 28px; color: #0f0f0f; letter-spacing: 1px; text-align: center; }
                .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
                .box { border: 2px solid #d4af37; border-radius: 12px; padding: 16px 18px; background: linear-gradient(135deg, #fffef8 0%, #fff9e6 100%); transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(212,175,55,0.1); }
                .box:hover { border-color: #ff9d00; box-shadow: 0 4px 16px rgba(212,175,55,0.2); }
                .k { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: #8b7521; font-weight: 700; }
                .v { font-size: 15px; font-weight: 700; margin-top: 8px; color: #0f0f0f; word-break: break-word; }
                .items-section { margin: 32px 0; }
                .section-title { font-size: 13px; letter-spacing: 2px; text-transform: uppercase; color: #0f0f0f; font-weight: 700; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 2px solid #d4af37; }
                table { width: 100%; border-collapse: collapse; background: #fff; }
                th { background: linear-gradient(135deg, #0f0f0f, #1a1a1a); color: #ffd700; font-size: 11px; letter-spacing: 1.2px; padding: 14px 12px; text-transform: uppercase; font-weight: 700; text-align: left; border: 2px solid #d4af37; white-space: nowrap; }
                td { border: 1px solid #e8dcc8; padding: 13px 12px; font-size: 13px; color: #2c2c2c; word-wrap: break-word; }
                td:nth-child(4), td:nth-child(5) { font-weight: 800; color: #0f0f0f; text-align: right; padding-right: 16px; }
                tr:nth-child(odd) { background: #fafaf8; }
                tr:hover { background: #f5f0e6; }
                .totals-section { margin: 32px 0; }
                .summary-boxes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
                .summary-box { border: 2px solid #d4af37; border-radius: 12px; padding: 18px 16px; background: linear-gradient(135deg, #fffef8 0%, #fff9e6 100%); text-align: center; box-shadow: 0 2px 8px rgba(212,175,55,0.1); }
                .summary-label { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #8b7521; font-weight: 700; margin-bottom: 10px; }
                .summary-value { font-size: 18px; font-weight: 900; color: #0f0f0f; word-break: break-word; }
                .qr-section { border: 2px solid #d4af37; border-radius: 12px; padding: 20px; background: linear-gradient(135deg, #fffef8 0%, #fff9e6 100%); text-align: center; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(212,175,55,0.1); }
                .qr-label { font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #8b7521; font-weight: 700; margin-bottom: 14px; }
                .qr-code { display: inline-block; width: 160px; height: 160px; }
                .qr-info { font-size: 12px; color: #666; margin-top: 12px; }
                .totals { border: 3px solid #d4af37; border-radius: 14px; padding: 24px 28px; background: linear-gradient(135deg, #a37f1f 0%, #d4af37 50%, #8b7521 100%); box-shadow: 0 4px 16px rgba(212,175,55,0.2); }
                .final-row { display: grid; grid-template-columns: auto 1fr auto; gap: 20px; align-items: center; padding: 20px 0; border: none !important; }
                .final-label { font-weight: 800; font-size: 18px; color: #fff; letter-spacing: 0.5px; }
                .final-value { text-align: right; font-size: 32px; font-weight: 900; letter-spacing: 1px; color: #fff; }
                .address-section { margin: 32px 0; }
                .ship { border: 2px solid #d4af37; border-radius: 12px; padding: 20px 24px; background: linear-gradient(135deg, #fffef8 0%, #fff9e6 100%); font-size: 13px; line-height: 1.8; color: #2c2c2c; box-shadow: 0 2px 8px rgba(212,175,55,0.1); }
                .ship-title { font-weight: 700; color: #0f0f0f; margin-bottom: 14px; font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; }
                .ship-addr { font-size: 13px; color: #0f0f0f; line-height: 1.8; }
                .footer { margin-top: 32px; padding-top: 20px; border-top: 2px solid #e8dcc8; }
                .foot { font-size: 12px; color: #666; text-align: center; line-height: 1.8; }
                .foot-premium { color: #d4af37; font-weight: 700; margin-top: 14px; font-size: 13px; letter-spacing: 1px; }
                @media (max-width: 768px) {
                    .wrap { padding: 12px; }
                    .head { padding: 18px 16px; }
                    .body { padding: 24px; }
                    .brand-left, .brand-spacer { width: 52px; }
                    .brand-badge { width: 40px; height: 40px; border-radius: 10px; }
                    .brand-title { font-size: 22px; }
                    .tagline { font-size: 10px; } 
                    .brand-name { font-size: 40px; letter-spacing: 2px; }
                    .logo-icon { font-size: 48px; }
                    .title { font-size: 24px; }
                    .meta { grid-template-columns: repeat(2, 1fr); gap: 12px; }
                    .box { padding: 12px 14px; }
                    .k { font-size: 9px; }
                    .v { font-size: 13px; }
                    th, td { padding: 10px 8px; font-size: 12px; }
                    .summary-boxes { grid-template-columns: repeat(3, 1fr); gap: 12px; }
                    .summary-box { padding: 14px 12px; }
                    .summary-label { font-size: 10px; }
                    .summary-value { font-size: 16px; }
                    .qr-code { width: 140px; height: 140px; }
                    .final-value { font-size: 26px; }
                }
                @media (max-width: 480px) {
                    .wrap { padding: 8px; }
                    .head { padding: 20px 16px; }
                    .body { padding: 16px; }
                    .brand-name { font-size: 28px; letter-spacing: 1px; }
                    .brand-tagline { font-size: 11px; letter-spacing: 1px; }
                    .logo-icon { font-size: 40px; }
                    .title { font-size: 18px; margin-bottom: 16px; }
                    .meta { grid-template-columns: 1fr; gap: 10px; }
                    table { font-size: 11px; }
                    th, td { padding: 8px 6px; }
                    .summary-boxes { grid-template-columns: 1fr; gap: 10px; margin-bottom: 16px; }
                    .summary-box { padding: 12px 10px; }
                    .summary-label { font-size: 9px; margin-bottom: 8px; }
                    .summary-value { font-size: 14px; }
                    .qr-section { padding: 16px; margin-bottom: 16px; }
                    .qr-label { font-size: 11px; margin-bottom: 10px; }
                    .qr-code { width: 120px; height: 120px; }
                    .qr-info { font-size: 11px; }
                    .totals { padding: 16px 14px; }
                    .final-label { font-size: 14px; }
                    .final-value { font-size: 20px; }
                    .final-row { gap: 10px; padding: 14px 0; }
                }
            </style>
        </head>
        <body>
            <div class="wrap">
                <div class="card">
                    <!-- PREMIUM HEADER -->
                    <div class="head">
                        <table class="brand-table" role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                                <td class="brand-left">
                                    <div class="brand-badge">
                                        <img src="${BRAND_LOGO_PDF_SRC}" alt="Logo" onerror="this.onerror=null;this.src='${BRAND_LOGO_FALLBACK_URL}'" />
                                    </div>
                                </td>
                                <td class="brand-center">
                                    <p class="brand-title">eShopper Boutique Luxe</p>
                                    <p class="tagline">Premium Fashion Destination</p>
                                </td>
                                <td class="brand-spacer"></td>
                            </tr>
                        </table>
                    </div>

                    <!-- MAIN CONTENT -->
                    <div class="body">
                        <h2 class="title">TAX INVOICE</h2>
                        
                        <!-- ORDER DETAILS -->
                        <div class="meta">
                            <div class="box"><div class="k">🆔 Order ID</div><div class="v">${orderId}</div></div>
                            <div class="box"><div class="k">📅 Date</div><div class="v">${orderDateText}</div></div>
                            <div class="box"><div class="k">👤 Customer</div><div class="v">${displayName.split(' ')[0]}</div></div>
                        </div>

                        <!-- ITEMS TABLE -->
                        <div class="items-section">
                            <div class="section-title">📦 Order Items</div>
                            <table>
                                <thead>
                                    <tr>
                                        <th style="width:8%">#</th>
                                        <th style="width:40%">Description</th>
                                        <th style="width:12%">Qty</th>
                                        <th style="width:20%">Unit Price</th>
                                        <th style="width:20%">Total</th>
                                    </tr>
                                </thead>
                                <tbody>${rows || '<tr><td colspan="5" style="text-align:center;padding:16px;">No items found</td></tr>'}</tbody>
                            </table>
                        </div>

                        <!-- SUMMARY BOXES -->
                        <div class="totals-section">
                            <div class="summary-boxes">
                                <div class="summary-box">
                                    <div class="summary-label">📦 Subtotal</div>
                                    <div class="summary-value">₹${subtotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                                </div>
                                <div class="summary-box">
                                    <div class="summary-label">🚚 Shipping</div>
                                    <div class="summary-value">${shipping <= 0 ? '🎁 FREE' : `₹${shipping.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}</div>
                                </div>
                                <div class="summary-box">
                                    <div class="summary-label">📊 Taxes</div>
                                    <div class="summary-value">Included</div>
                                </div>
                            </div>
                        </div>

                        <!-- QR CODE SECTION -->
                        <div class="qr-section">
                            <div class="qr-label">📱 Track Your Order</div>
                            <svg class="qr-code" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                                <rect width="200" height="200" fill="white"/>
                                <rect x="20" y="20" width="50" height="50" fill="black"/>
                                <rect x="30" y="30" width="30" height="30" fill="white"/>
                                <rect x="130" y="20" width="50" height="50" fill="black"/>
                                <rect x="140" y="30" width="30" height="30" fill="white"/>
                                <rect x="20" y="130" width="50" height="50" fill="black"/>
                                <rect x="30" y="140" width="30" height="30" fill="white"/>
                                <circle cx="100" cy="100" r="15" fill="black" opacity="0.3"/>
                                <circle cx="80" cy="60" r="8" fill="black" opacity="0.3"/>
                                <circle cx="140" cy="140" r="8" fill="black" opacity="0.3"/>
                            </svg>
                            <div class="qr-info">Scan to track your package in real-time</div>
                        </div>

                        <!-- FINAL TOTAL -->
                        <div class="totals">
                            <div class="final-row">
                                <span class="final-label">💰 TOTAL PAYABLE</span>
                                <span></span>
                                <span class="final-value">₹${payable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                            </div>
                        </div>

                        <!-- PAYMENT & ORDER INFO -->
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 28px 0;">
                            <div class="box">
                                <div class="k">💳 Payment Method</div>
                                <div class="v">${paymentMethod || 'Cash on Delivery'}</div>
                            </div>
                            <div class="box">
                                <div class="k">📊 Payment Status</div>
                                <div class="v">${paymentStatus || 'Pending'}</div>
                            </div>
                        </div>

                        <!-- DELIVERY ADDRESS -->
                        <div class="address-section">
                            <div class="section-title">📍 Delivery Address</div>
                            <div class="ship">
                                <div class="ship-title">Recipient</div>
                                <div class="ship-addr">
                                    <strong>${shippingAddress?.fullName || 'Customer'}</strong><br/>
                                    ${shippingAddress?.addressline1 || 'Address Line'}<br/>
                                    ${shippingAddress?.city || 'City'}, ${shippingAddress?.state || 'State'} - ${shippingAddress?.pin || 'PIN'}<br/>
                                    ${shippingAddress?.country || 'India'}<br/>
                                    <strong style="color:#d4af37;">📱 Phone:</strong> ${shippingAddress?.phone || 'N/A'}
                                </div>
                            </div>
                        </div>

                        <!-- FOOTER -->
                        <div class="footer">
                            <div class="foot">
                                This is a computer-generated invoice and does not require a physical signature.<br/>
                                <strong>For support:</strong> support@eshopperr.me | <strong>Website:</strong> eshopperr.me
                            </div>
                            <div class="foot-premium">💎 eShopper Boutique Luxe • Premium Edition • Authenticity Guaranteed 💎</div>
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
};

const formatMoneyInr = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const amountToWordsIndian = (amountValue) => {
    const amount = Math.round(Number(amountValue || 0));
    if (!Number.isFinite(amount) || amount <= 0) return 'Zero Rupees Only';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const twoDigit = (n) => {
        if (n < 10) return ones[n];
        if (n < 20) return teens[n - 10];
        const t = Math.floor(n / 10);
        const o = n % 10;
        return `${tens[t]}${o ? ` ${ones[o]}` : ''}`.trim();
    };

    const threeDigit = (n) => {
        const h = Math.floor(n / 100);
        const r = n % 100;
        if (!h) return twoDigit(r);
        return `${ones[h]} Hundred${r ? ` ${twoDigit(r)}` : ''}`.trim();
    };

    const crore = Math.floor(amount / 10000000);
    const lakh = Math.floor((amount % 10000000) / 100000);
    const thousand = Math.floor((amount % 100000) / 1000);
    const rest = amount % 1000;

    const parts = [];
    if (crore) parts.push(`${threeDigit(crore)} Crore`);
    if (lakh) parts.push(`${threeDigit(lakh)} Lakh`);
    if (thousand) parts.push(`${threeDigit(thousand)} Thousand`);
    if (rest) parts.push(threeDigit(rest));

    return `${parts.join(' ').trim()} Rupees Only`;
};

const buildPremiumOrderReceiptHtml = ({
    orderId,
    userName,
    paymentMethod,
    finalAmount,
    totalAmount,
    shippingAmount,
    shippingAddress,
    products,
    orderDate
}) => {
    const safeProducts = Array.isArray(products) ? products : [];
    const orderDateText = new Date(orderDate || Date.now()).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const subtotal = Number(totalAmount || safeProducts.reduce((sum, item) => sum + Number(item.total || (item.price * item.qty) || 0), 0));
    const shipping = Number(shippingAmount ?? Math.max(0, Number(finalAmount || 0) - subtotal));
    const payable = Number(finalAmount || (subtotal + shipping));

    const rows = safeProducts.map((item, idx) => {
        const qty = Number(item.qty || 1);
        const price = Number(item.price || 0);
        const line = Number(item.total || qty * price);
        const name = item.name || item.title || 'Product';
        const variant = [item.size ? `Size: ${item.size}` : '', item.color || ''].filter(Boolean).join(' • ');
        return `
            <tr>
                <td>${idx + 1}</td>
                <td><strong>${name}</strong>${variant ? `<br/><span class="muted">${variant}</span>` : ''}</td>
                <td class="center">${qty}</td>
                <td class="right">${formatMoneyInr(price)}</td>
                <td class="right strong">${formatMoneyInr(line)}</td>
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
                @page { size: A4; margin: 12mm; }
                * { box-sizing: border-box; }
                html { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                body { margin: 0; background: #f5f3ee; color: #141414; font-family: 'Segoe UI', Arial, sans-serif; }
                .sheet { border: 2px solid #c8a74b; border-radius: 12px; background: #fff; overflow: hidden; }
                .head { padding: 22px 24px; background: linear-gradient(135deg, #111 0%, #2b2b2b 100%); color: #fff; }
                .brand { font-size: 26px; font-weight: 900; letter-spacing: .8px; color: #d9bc68; }
                .sub { margin-top: 4px; font-size: 11px; letter-spacing: 1.3px; text-transform: uppercase; color: #d2d2d2; }
                .title { margin-top: 14px; font-size: 22px; font-weight: 800; letter-spacing: .8px; }
                .body { padding: 20px 22px 16px; }
                .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
                .box { border: 1px solid #dfd6bf; background: #fcfaf4; border-radius: 8px; padding: 10px; }
                .k { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #7a6a3b; font-weight: 700; }
                .v { margin-top: 6px; font-size: 12px; font-weight: 700; color: #222; word-break: break-word; }
                table { width: 100%; border-collapse: collapse; margin-top: 6px; }
                th { background: #171717; color: #d9bc68; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; padding: 9px 8px; text-align: left; border: 1px solid #c8a74b; }
                td { border: 1px solid #e7e1d0; padding: 9px 8px; font-size: 12px; }
                tbody tr:nth-child(even) { background: #faf7ef; }
                .center { text-align: center; }
                .right { text-align: right; }
                .strong { font-weight: 800; }
                .muted { font-size: 10px; color: #666; }
                .totals { margin-top: 12px; margin-left: auto; width: 290px; border: 1px solid #ddd1ad; border-radius: 8px; background: #fffaf0; padding: 10px 12px; }
                .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #ece5d3; font-size: 12px; }
                .row:last-child { border-bottom: none; }
                .grand { font-weight: 900; font-size: 15px; color: #111; }
                .note { margin-top: 14px; border-left: 3px solid #c8a74b; background: #f9f5ea; padding: 10px 12px; font-size: 11px; line-height: 1.6; color: #444; }
                .footer { margin-top: 12px; padding-top: 10px; border-top: 1px solid #e7dcc3; font-size: 10px; color: #666; text-align: center; line-height: 1.7; }
                @media (max-width: 760px) { .meta { grid-template-columns: 1fr; } .totals { width: 100%; } }
            </style>
        </head>
        <body>
            <div class="sheet">
                <div class="head">
                    <div class="brand">eShopper Boutique Luxe</div>
                    <div class="sub">Premium Order Document</div>
                    <div class="title">Order Receipt</div>
                </div>
                <div class="body">
                    <div class="meta">
                        <div class="box"><div class="k">Receipt No</div><div class="v">${orderId || '-'}</div></div>
                        <div class="box"><div class="k">Receipt Date</div><div class="v">${orderDateText}</div></div>
                        <div class="box"><div class="k">Payment Method</div><div class="v">${paymentMethod || 'COD'}</div></div>
                    </div>
                    <div class="box" style="margin-bottom: 10px;"><div class="k">Customer</div><div class="v">${userName || 'Valued Customer'}${shippingAddress?.city ? ` • ${shippingAddress.city}` : ''}</div></div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width:8%">#</th>
                                <th style="width:46%">Item</th>
                                <th style="width:12%">Qty</th>
                                <th style="width:17%">Unit Price</th>
                                <th style="width:17%">Line Total</th>
                            </tr>
                        </thead>
                        <tbody>${rows || '<tr><td colspan="5" class="center">No items available</td></tr>'}</tbody>
                    </table>
                    <div class="totals">
                        <div class="row"><span>Subtotal</span><span>${formatMoneyInr(subtotal)}</span></div>
                        <div class="row"><span>Shipping</span><span>${shipping <= 0 ? 'Free' : formatMoneyInr(shipping)}</span></div>
                        <div class="row grand"><span>Total Paid</span><span>${formatMoneyInr(payable)}</span></div>
                    </div>
                    <div class="note">
                        This is an acknowledgement of order placement and payment initiation. A detailed proforma/final tax invoice will be shared as per order progress and delivery status.
                    </div>
                    <div class="footer">
                        Support: support@eshopperr.me | Website: ${BRAND_SITE_URL}<br/>
                        This is a system-generated receipt.
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
};

const buildPremiumOrderConfirmationProformaHtml = ({
    orderId,
    userName,
    paymentMethod,
    finalAmount,
    totalAmount,
    shippingAmount,
    products,
    orderDate,
    estimatedArrival,
    deliveryPartner
}) => {
    const safeProducts = Array.isArray(products) ? products : [];
    const orderedAt = new Date(orderDate || Date.now());
    const orderDateText = orderedAt.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const etaDate = new Date(estimatedArrival || (Date.now() + 5 * 24 * 60 * 60 * 1000));
    const expectedDateText = etaDate.toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    const subtotal = Number(totalAmount || safeProducts.reduce((sum, item) => sum + Number(item.total || (item.price * item.qty) || 0), 0));
    const shipping = Number(shippingAmount ?? Math.max(0, Number(finalAmount || 0) - subtotal));
    const payable = Number(finalAmount || (subtotal + shipping));
    const trackingLink = `${BRAND_SITE_URL}/order-tracking/${encodeURIComponent(orderId || '')}`;
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(trackingLink)}`;

    const rows = safeProducts.map((item, idx) => {
        const qty = Number(item.qty || 1);
        const price = Number(item.price || 0);
        const line = Number(item.total || qty * price);
        const desc = `${item.name || item.title || 'Product'}${item.size ? ` • Size: ${item.size}` : ''}${item.color ? ` • ${item.color}` : ''}`;
        return `
            <tr>
                <td class="center">${idx + 1}</td>
                <td><strong>${desc}</strong><br/><span class="muted">Quality Inspected: Yes</span></td>
                <td class="center">${qty}</td>
                <td class="right">${formatMoneyInr(price)}</td>
                <td class="right strong">${formatMoneyInr(line)}</td>
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
                @page { size: A4; margin: 12mm; }
                * { box-sizing: border-box; }
                html { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                body { margin: 0; background: #f6f5f2; color: #161616; font-family: 'Segoe UI', Arial, sans-serif; }
                .sheet { border: 2px solid #c5a24a; border-radius: 12px; background: #fff; overflow: hidden; position: relative; }
                .mark { position: absolute; top: 120px; left: 50%; transform: translateX(-50%) rotate(-18deg); color: rgba(23, 140, 86, 0.10); font-size: 52px; font-weight: 900; white-space: nowrap; letter-spacing: 1px; }
                .head { padding: 20px 22px; background: #151515; color: #fff; }
                .brand { font-size: 24px; font-weight: 900; color: #d9bc68; letter-spacing: .6px; }
                .title { margin-top: 10px; font-size: 19px; font-weight: 800; letter-spacing: .6px; }
                .badge { margin-top: 8px; display: inline-block; background: linear-gradient(135deg, #178c56, #1fac6b); color: #fff; border-radius: 16px; padding: 7px 12px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: .9px; }
                .body { padding: 18px 20px 16px; position: relative; z-index: 2; }
                .delivery { border: 1px solid #d9c28a; border-radius: 8px; background: #fff8e8; padding: 11px; margin-bottom: 10px; }
                .k { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #7a6938; font-weight: 700; }
                .v { margin-top: 5px; font-size: 16px; font-weight: 900; color: #141414; }
                .sub { margin-top: 3px; font-size: 11px; color: #575757; }
                .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; margin-bottom: 10px; }
                .box { border: 1px solid #e4dbc4; border-radius: 8px; background: #fcfbf7; padding: 9px; }
                .box .vk { font-size: 10px; text-transform: uppercase; letter-spacing: .8px; color: #7a6938; font-weight: 700; }
                .box .vv { margin-top: 5px; font-size: 12px; font-weight: 700; color: #222; }
                table { width: 100%; border-collapse: collapse; }
                th { background: #191919; color: #d9bc68; font-size: 10px; text-transform: uppercase; letter-spacing: .9px; padding: 9px 8px; text-align: left; border: 1px solid #cab068; }
                td { border: 1px solid #ebe6d8; padding: 9px 8px; font-size: 12px; }
                tbody tr:nth-child(even) { background: #f4f4f4; }
                .center { text-align: center; }
                .right { text-align: right; }
                .strong { font-weight: 800; }
                .muted { font-size: 10px; color: #666; }
                .summary { width: 285px; margin-left: auto; margin-top: 10px; border: 1px solid #d8ceb0; border-radius: 8px; padding: 9px 11px; background: #fffaf0; }
                .row { display: flex; justify-content: space-between; font-size: 12px; padding: 6px 0; border-bottom: 1px solid #ece5d4; }
                .row:last-child { border-bottom: none; }
                .grand { font-size: 15px; font-weight: 900; color: #111; }
                .foot { margin-top: 12px; display: flex; justify-content: space-between; gap: 10px; }
                .terms { flex: 1; border-left: 3px solid #c8a74b; background: #faf6eb; padding: 9px 11px; font-size: 10px; color: #4f4f4f; line-height: 1.65; }
                .qr { width: 118px; text-align: center; }
                .qr img { width: 88px; height: 88px; border: 1px solid #c8a74b; border-radius: 5px; background: #fff; }
                .qr p { margin: 6px 0 0; font-size: 9px; color: #666; }
                @media (max-width: 760px) { .meta { grid-template-columns: 1fr; } .foot { flex-direction: column; } .summary { width: 100%; } }
            </style>
        </head>
        <body>
            <div class="sheet">
                <div class="mark">Verified and Confirmed</div>
                <div class="head">
                    <div class="brand">eShopper Boutique Luxe</div>
                    <div class="title">Order Confirmation Proforma Invoice</div>
                    <span class="badge">Verified and Confirmed</span>
                </div>
                <div class="body">
                    <div class="delivery">
                        <div class="k">Expected Delivery</div>
                        <div class="v">${expectedDateText}</div>
                        <div class="sub">Delivery Partner: ${deliveryPartner || 'Delhivery'}</div>
                    </div>

                    <div class="meta">
                        <div class="box"><div class="vk">Order ID</div><div class="vv">${orderId || '-'}</div></div>
                        <div class="box"><div class="vk">Order Date</div><div class="vv">${orderDateText}</div></div>
                        <div class="box"><div class="vk">Payment</div><div class="vv">${paymentMethod || 'COD'} • ${formatMoneyInr(payable)}</div></div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th style="width:8%">#</th>
                                <th style="width:52%">Itemized Detail</th>
                                <th style="width:10%">Qty</th>
                                <th style="width:15%">Unit</th>
                                <th style="width:15%">Total</th>
                            </tr>
                        </thead>
                        <tbody>${rows || '<tr><td colspan="5" class="center">No items available</td></tr>'}</tbody>
                    </table>

                    <div class="summary">
                        <div class="row"><span>Subtotal</span><span>${formatMoneyInr(subtotal)}</span></div>
                        <div class="row"><span>Shipping</span><span>${shipping <= 0 ? 'Free' : formatMoneyInr(shipping)}</span></div>
                        <div class="row grand"><span>Grand Total</span><span>${formatMoneyInr(payable)}</span></div>
                    </div>

                    <div class="foot">
                        <div class="terms">
                            <strong>Cancellation and Return Policy (Summary):</strong><br/>
                            Orders may be cancelled before dispatch. Eligible items can be returned as per policy window in original condition with tags and packaging.
                        </div>
                        <div class="qr">
                            <img src="${qrSrc}" alt="Tracking QR"/>
                            <p>Scan to track this order</p>
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
};

const buildPremiumTaxInvoiceHtml = ({
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
    const safeProducts = Array.isArray(products) ? products : [];
    const invoiceDateText = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const orderDateText = new Date(orderDate || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const gross = Number(totalAmount || safeProducts.reduce((sum, item) => sum + Number(item.total || (item.price * item.qty) || 0), 0));
    const shipping = Number(shippingAmount ?? Math.max(0, Number(finalAmount || 0) - gross));
    const taxableValue = gross + Math.max(0, shipping);
    const cgst = Math.round((taxableValue * 9) / 100);
    const sgst = Math.round((taxableValue * 9) / 100);
    const grandTotal = Number(finalAmount || (taxableValue + cgst + sgst));
    const totalTax = cgst + sgst;

    const rows = safeProducts.map((item, idx) => {
        const qty = Number(item.qty || 1);
        const price = Number(item.price || 0);
        const line = Number(item.total || qty * price);
        const discountPct = Number(item.discountPercent || 0);
        const taxableLine = Math.max(0, Math.round(line * (100 - discountPct) / 100));
        const lineTax = Math.round(taxableLine * 0.18);
        const name = `${item.name || item.title || 'Product'}${item.size ? ` • ${item.size}` : ''}${item.color ? ` • ${item.color}` : ''}`;
        return `
            <tr>
                <td class="center">${idx + 1}</td>
                <td class="center">${item.hsn || '6204'}</td>
                <td>${name}</td>
                <td class="center">${qty}</td>
                <td class="right">${formatMoneyInr(price)}</td>
                <td class="center">${discountPct}%</td>
                <td class="right">${formatMoneyInr(taxableLine)}</td>
                <td class="right strong">${formatMoneyInr(lineTax)}</td>
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
                @page { size: A4; margin: 12mm; }
                * { box-sizing: border-box; }
                html { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                body { margin: 0; background: #f5f4f0; color: #141414; font-family: 'Segoe UI', Arial, sans-serif; }
                .paid { position: fixed; top: 42%; right: 9%; transform: rotate(24deg); border: 3px solid rgba(31, 143, 84, 0.2); color: rgba(31, 143, 84, 0.2); font-size: 54px; font-weight: 900; letter-spacing: 2px; padding: 10px 20px; border-radius: 8px; }
                .sheet { border: 2px solid #c8a74b; border-radius: 12px; background: #fff; overflow: hidden; position: relative; z-index: 2; }
                .head { padding: 20px 22px; background: #151515; color: #fff; position: relative; }
                .brand { font-size: 24px; font-weight: 900; color: #d9bc68; letter-spacing: .8px; }
                .tax { position: absolute; right: 22px; top: 20px; font-size: 12px; letter-spacing: 1.2px; text-transform: uppercase; color: #d9bc68; font-weight: 900; }
                .sub { margin-top: 5px; color: #d0d0d0; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; }
                .body { padding: 16px 20px; }
                .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
                .box { border: 1px solid #dccfae; background: #faf8f1; border-radius: 8px; padding: 9px 10px; font-size: 11px; line-height: 1.7; }
                .title { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #765f2d; font-weight: 800; margin-bottom: 4px; }
                .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 10px; }
                .m { border: 1px solid #e5dbc2; border-radius: 7px; background: #fcfbf7; padding: 8px; }
                .mk { font-size: 9px; text-transform: uppercase; color: #776236; letter-spacing: .8px; font-weight: 800; }
                .mv { margin-top: 4px; font-size: 12px; font-weight: 700; color: #202020; }
                table { width: 100%; border-collapse: collapse; }
                th { background: #181818; color: #d9bc68; border: 1px solid #c8a74b; font-size: 9.5px; letter-spacing: .8px; padding: 8px 6px; text-transform: uppercase; text-align: left; }
                td { border: 1px solid #ece6d4; padding: 8px 6px; font-size: 11px; }
                tbody tr:nth-child(even) { background: #f7f7f7; }
                .center { text-align: center; }
                .right { text-align: right; }
                .strong { font-weight: 800; }
                .summary { margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                .totals { border: 1px solid #dbcda9; border-radius: 8px; background: #fffaf0; padding: 8px 11px; }
                .r { display: flex; justify-content: space-between; font-size: 12px; padding: 5px 0; border-bottom: 1px solid #ece4cf; }
                .r:last-child { border-bottom: none; }
                .grand { font-size: 15px; font-weight: 900; color: #111; }
                .amount-words { border: 1px dashed #c8a74b; border-radius: 8px; background: #fcfaf3; padding: 9px 10px; font-size: 11px; line-height: 1.6; }
                .bank { border-left: 3px solid #c8a74b; background: #faf6eb; border-radius: 6px; padding: 9px 10px; font-size: 10px; line-height: 1.7; margin-top: 10px; }
                .sign { margin-top: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                .signbox { border-top: 1px solid #dfd5be; padding-top: 12px; text-align: center; font-size: 10px; color: #555; }
                .footer { margin-top: 10px; padding-top: 8px; border-top: 1px solid #e6dcc2; text-align: center; font-size: 10px; color: #666; line-height: 1.7; }
                @media (max-width: 760px) { .grid2, .meta, .summary, .sign { grid-template-columns: 1fr; } }
            </style>
        </head>
        <body>
            <div class="paid">PAID</div>
            <div class="sheet">
                <div class="head">
                    <div class="brand">eShopper Boutique Luxe</div>
                    <div class="tax">Final Tax Invoice</div>
                    <div class="sub">GST Compliant Legal Invoice</div>
                </div>
                <div class="body">
                    <div class="grid2">
                        <div class="box">
                            <div class="title">Seller Details</div>
                            <strong>eShopper Boutique Luxe</strong><br/>
                            GSTIN: 07AADCR5055K1Z1<br/>
                            PAN: AADCR5055K<br/>
                            Plot No. 101, Tech Park,<br/>
                            New Delhi - 110001, India
                        </div>
                        <div class="box">
                            <div class="title">Bill To / Ship To</div>
                            <strong>${shippingAddress?.fullName || userName || 'Customer'}</strong><br/>
                            ${shippingAddress?.addressline1 || 'Address line not available'}<br/>
                            ${shippingAddress?.city || 'City'}, ${shippingAddress?.state || 'State'} - ${shippingAddress?.pin || 'PIN'}<br/>
                            ${shippingAddress?.country || 'India'}<br/>
                            Phone: ${shippingAddress?.phone || 'N/A'}<br/>
                            Email: ${userEmail || 'N/A'}
                        </div>
                    </div>

                    <div class="meta">
                        <div class="m"><div class="mk">Invoice No.</div><div class="mv">${orderId || '-'}</div></div>
                        <div class="m"><div class="mk">Invoice Date</div><div class="mv">${invoiceDateText}</div></div>
                        <div class="m"><div class="mk">Order Date</div><div class="mv">${orderDateText}</div></div>
                        <div class="m"><div class="mk">Payment</div><div class="mv">${paymentMethod || 'COD'} • ${paymentStatus || 'Paid'}</div></div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th style="width:5%">#</th>
                                <th style="width:8%">HSN</th>
                                <th style="width:33%">Item Description</th>
                                <th style="width:7%">Qty</th>
                                <th style="width:13%">Unit Price</th>
                                <th style="width:8%">Disc %</th>
                                <th style="width:14%">Taxable Value</th>
                                <th style="width:12%">Tax (18%)</th>
                            </tr>
                        </thead>
                        <tbody>${rows || '<tr><td colspan="8" class="center">No items available</td></tr>'}</tbody>
                    </table>

                    <div class="summary">
                        <div class="amount-words">
                            <div class="title">Amount in Words</div>
                            <strong>${amountToWordsIndian(grandTotal)}</strong>
                            <div style="margin-top: 8px;"><strong>GST Breakup:</strong> CGST (9%): ${formatMoneyInr(cgst)} | SGST (9%): ${formatMoneyInr(sgst)}</div>
                        </div>
                        <div class="totals">
                            <div class="r"><span>Taxable Amount</span><span>${formatMoneyInr(taxableValue)}</span></div>
                            <div class="r"><span>Total GST</span><span>${formatMoneyInr(totalTax)}</span></div>
                            <div class="r"><span>Shipping</span><span>${shipping <= 0 ? 'Free' : formatMoneyInr(shipping)}</span></div>
                            <div class="r grand"><span>Grand Total</span><span>${formatMoneyInr(grandTotal)}</span></div>
                        </div>
                    </div>

                    <div class="bank">
                        <strong>Payment and Bank Details:</strong><br/>
                        Account Name: Eshopper Retail Private Limited<br/>
                        Bank: HDFC Bank | A/C: 502000XXXXXX19 | IFSC: HDFC0001234<br/>
                        UPI: eshopper@hdfcbank
                    </div>

                    <div class="sign">
                        <div class="signbox">Authorized Signature</div>
                        <div class="signbox">For eShopper Boutique Luxe</div>
                    </div>

                    <div class="footer">
                        This is a computer-generated legal tax invoice and does not require a manual signature.<br/>
                        Support: support@eshopperr.me | ${BRAND_SITE_URL}
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
};

const generateInvoicePdfBuffer = async (orderPayload) => {
    if (!FEATURE_INVOICE_SYSTEM) {
        throw new Error('Invoice system disabled');
    }
    // Determine which HTML builder to use based on explicit type + status fallback
    const requestedType = String(orderPayload?.pdfType || '').trim().toLowerCase();
    const normalizedStatus = String(orderPayload?.orderStatus || '').trim().toLowerCase();
    const isDelivered = orderPayload?.isDelivered || normalizedStatus === 'delivered';

    let htmlBuilder = buildPremiumOrderReceiptHtml;
    if (requestedType === 'confirmation' || requestedType === 'proforma' || requestedType === 'confirmed') {
        htmlBuilder = buildPremiumOrderConfirmationProformaHtml;
    } else if (requestedType === 'final' || requestedType === 'tax' || requestedType === 'invoice' || isDelivered) {
        htmlBuilder = buildPremiumTaxInvoiceHtml;
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
                } catch (_) {}
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

const sendWhatsApp = async (number, message) => {
    if (!FEATURE_WHATSAPP_NOTIFICATIONS) {
        return { skipped: true, reason: 'whatsapp-notifications-disabled' };
    }
    const apiUrl = process.env.EVOLUTION_API_URL ? process.env.EVOLUTION_API_URL.trim().replace(/\/$/, '') : '';
    const token = process.env.WHATSAPP_TOKEN ? process.env.WHATSAPP_TOKEN.trim() : '';
    const apiKey = process.env.EVOLUTION_API_KEY ? process.env.EVOLUTION_API_KEY.trim() : '';
    const instance = process.env.WHATSAPP_INSTANCE || 'eshopper_bot';
    const senderNumber = process.env.WHATSAPP_SENDER_NUMBER ? process.env.WHATSAPP_SENDER_NUMBER.trim() : '';
    const adminEmail = process.env.ADMIN_EMAIL || 'theafzalhussain786@gmail.com';

    // 🔴 STRICT PHONE FORMAT CONVERSION (91 + 10 digits)
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
    const normalizedSender = normalizePhoneStrict(senderNumber);

    console.log('🔔 WhatsApp Send Debug:');
    console.log(`   API URL: ${apiUrl ? '✅ Set (' + apiUrl + ')' : '❌ Missing'}`);
    console.log(`   Token: ${token ? '✅ Set' : '❌ Missing'}`);
    console.log(`   API Key: ${apiKey ? '✅ Set' : '⏭️  Not set'}`);
    console.log(`   Instance: ${instance}`);
    console.log(`   Sender Phone: ${normalizedSender || '❌ Not configured'}`);
    console.log(`   Contact (raw): ${number}`);
    console.log(`   Contact (normalized): ${contactNumber || '❌ Invalid'}`);
    console.log(`   Message: ${message.substring(0, 50)}...`);

    // 🔴 VALIDATION CHECKS
    if (!apiUrl) {
        console.error('❌ EVOLUTION_API_URL not set');
        throw new Error('EVOLUTION_API_URL not configured');
    }
    if (!token && !apiKey) {
        console.error('❌ WHATSAPP_TOKEN or EVOLUTION_API_KEY not set');
        throw new Error('WhatsApp credentials not configured');
    }
    if (!contactNumber || contactNumber.length < 12) {
        console.error('❌ Contact number is invalid or too short:', contactNumber);
        // Return silently instead of throwing - fallback to email only
        console.warn('⚠️  Skipping WhatsApp due to invalid phone number');
        return false;
    }
    if (!message || String(message).trim().length === 0) {
        console.error('❌ Message is empty');
        throw new Error('Message cannot be empty');
    }

    // 🔴 SELF-LOOP PREVENTION
    if (normalizedSender && contactNumber === normalizedSender) {
        console.warn(`⚠️  SELF-LOOP DETECTED! Message would be sent to bot's own number: ${contactNumber}`);
        console.warn(`    Skipping WhatsApp to prevent infinite loop`);

        // Send admin notification instead
        try {
            const warningSubject = `⚠️ WhatsApp Self-Loop Prevented - ${new Date().toLocaleString()}`;
            const warningHtml = `
                <div style="font-family:Arial,sans-serif;background:#fff3cd;padding:20px;border:2px solid #ff9800;border-radius:8px;">
                    <h2 style="color:#ff6b00;margin:0 0 10px 0;">⚠️ WhatsApp Self-Loop Detected</h2>
                    <p style="margin:0 0 10px 0;color:#333;"><strong>Time:</strong> ${new Date().toLocaleString('en-IN')}</p>
                    <p style="margin:0 0 10px 0;color:#333;"><strong>Sender Number:</strong> ${normalizedSender}</p>
                    <p style="margin:0 0 10px 0;color:#333;"><strong>Contact Number:</strong> ${contactNumber}</p>
                    <p style="margin:0 0 10px 0;color:#333;"><strong>Message:</strong> ${String(message).substring(0, 100)}...</p>
                    <p style="margin:0;color:#d32f2f;"><strong>Action Taken:</strong> Message BLOCKED to prevent infinite loop</p>
                    <hr style="margin:15px 0;border:none;border-top:1px solid #ff9800;" />
                    <p style="margin:0;font-size:12px;color:#666;">This is an automated security alert. Check your order processing logic.</p>
                </div>
            `;

            await axios.post('https://api.brevo.com/v3/smtp/email', {
                sender: { name: 'Eshopper System', email: 'support@eshopperr.me' },
                to: [{ email: adminEmail }],
                subject: warningSubject,
                htmlContent: warningHtml,
                replyTo: { email: 'support@eshopperr.me' }
            }, {
                headers: {
                    'api-key': process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.trim() : '',
                    'content-type': 'application/json',
                    'accept': 'application/json'
                },
                timeout: 10000
            });

            console.log(`✅ Admin alert sent to ${adminEmail}`);
        } catch (alertError) {
            console.error('⚠️  Failed to send admin alert:', alertError.message);
        }

        const selfLoopError = new Error('Cannot send message to bot\'s own number (self-loop prevention)');
        selfLoopError.code = 'WHATSAPP_SELF_LOOP';
        selfLoopError.isExpected = true;
        throw selfLoopError;
    }

    try {
        const endpoint = `${apiUrl}/message/sendText/${instance}`;
        
        // Use only the strict normalized format
        const payloadFormats = [
            // Format 1: Standard (number with 91 prefix)
            {
                number: contactNumber,
                text: String(message)
            },
            // Format 2: Alternative field names
            {
                to: contactNumber,
                message: String(message)
            },
            // Format 3: With chatId format
            {
                chatId: `${contactNumber}@s.whatsapp.net`,
                text: String(message)
            }
        ];

        console.log(`📤 Sending WhatsApp to: ${contactNumber}`);
        console.log(`   Endpoint: ${endpoint}`);
        console.log(`   Strict Format: 91 + 10 digits = ${contactNumber.length} digits total`);

        let response;
        let lastError;

        for (let i = 0; i < payloadFormats.length; i++) {
            try {
                const payload = payloadFormats[i];
                const displayPayload = { 
                    ...payload, 
                    text: payload.text?.substring(0, 30) + '...' || payload.message?.substring(0, 30) + '...' 
                };
                console.log(`   Attempt ${i + 1} with payload:`, displayPayload);

                response = await axios.post(endpoint, payload, {
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': token || apiKey
                    },
                    timeout: 30000
                });

                console.log(`✅ WhatsApp sent successfully on attempt ${i + 1} (Status: ${response.status})`);
                console.log(`   Response: ${JSON.stringify(response.data)}`);
                return true;

            } catch (err) {
                lastError = err;
                console.log(`   ❌ Attempt ${i + 1} failed:`, {
                    status: err.response?.status,
                    error: err.response?.data?.message || err.message
                });

                // If it's a 401, try with Bearer token instead
                if (err.response?.status === 401 && apiKey && i < payloadFormats.length - 1) {
                    try {
                        const bearerPayload = payloadFormats[i];
                        console.log(`   🔄 Retrying with Authorization Bearer header...`);
                        response = await axios.post(endpoint, bearerPayload, {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${apiKey}`
                            },
                            timeout: 30000
                        });

                        console.log(`✅ WhatsApp sent with Bearer auth (Status: ${response.status})`);
                        console.log(`   Response: ${JSON.stringify(response.data)}`);
                        return true;
                    } catch (bearerErr) {
                        lastError = bearerErr;
                        console.log(`   ❌ Bearer auth also failed:`, {
                            status: bearerErr.response?.status,
                            error: bearerErr.response?.data?.message || bearerErr.message
                        });
                    }
                }
            }
        }

        // If all formats failed, throw the last error
        throw lastError || new Error('All WhatsApp payload formats failed');

    } catch (error) {
        console.error('❌ WhatsApp send failed after all attempts:', {
            status: error.response?.status,
            message: error.response?.data?.message || error.response?.data || error.message,
            endpoint: error.config?.url,
            fullError: JSON.stringify(error.response?.data)
        });
        throw error;
    }
};

const isExpectedWhatsAppError = (error) => {
    if (!error) return false;
    if (error.code === 'WHATSAPP_SELF_LOOP' || error.isExpected === true) return true;
    const msg = String(error.message || '').toLowerCase();
    return msg.includes('self-loop prevention') || msg.includes('bot\'s own number');
};

const sendOrderWhatsAppNotification = async ({ phone, orderId, status, customerName, trackingLink }) => {
    const displayName = customerName || 'Customer';
    const safeStatus = status || 'Order Update';
    const message = `Hi ${displayName}, your order ${orderId} is now ${safeStatus}. Track here: ${trackingLink}`;
    return sendWhatsApp(phone, message);
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

// 🔴 LUXURY STATUS NOTIFICATION ORCHESTRATOR
const sendLuxeStatusNotification = async ({ orderId, status, phone, customerName, email, estimatedDelivery, finalAmount, totalAmount, shippingAmount, paymentMethod, paymentStatus, shippingAddress, products }) => {
    if (!FEATURE_EMAIL_NOTIFICATIONS && !FEATURE_WHATSAPP_NOTIFICATIONS) {
        return { skipped: true, reason: 'notifications-disabled' };
    }
    const displayName = customerName || 'Valued Customer';
    const firstName = displayName.split(' ')[0];
    const trackingLink = `https://eshopperr.me/order-tracking/${orderId}`;

    console.log(`🎯 Sending Luxe Notifications for ${orderId} -> ${status}`);

    try {
        if (status === 'Packed') {
            // 📦 PACKED: WhatsApp + Email (Parallel)
            const whatsappMsg = `📦 YOUR ORDER IS BEAUTIFULLY PACKED! ✨\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nHi ${firstName},\nYour premium selection is now expertly packed!\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Order: #${orderId}\n📍 Status: Packed & Ready to Ship\n💎 Quality Check: Completed\n🎁 Premium Packaging: Applied\n\n📅 NEXT STEPS:\n→ Your order will ship out within 24 hours\n→ You'll receive a tracking update shortly\n→ Expected delivery by: ${estimatedDelivery ? new Date(estimatedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Soon'}\n\n🔗 TRACK NOW: ${trackingLink}\n\n💬 Questions? Reply to this message\n📞 Call: 8447859784\n\n🙏 Thank you for choosing Eshopper Boutique! 💎`;
            
            // Send both WhatsApp and Email in parallel
            const packedResults = await Promise.allSettled([
                sendWhatsApp(phone, whatsappMsg).then(() => {
                    console.log(`✅ WhatsApp sent for ${orderId} (Packed)`);
                    return { type: 'WhatsApp', success: true };
                }).catch((err) => {
                    console.log(`ℹ️  WhatsApp skipped for ${orderId} (Packed):`, err.message);
                    throw err;
                }),
                enqueueEmailJob('order-status', {
                    toEmail: email,
                    userName: displayName,
                    orderId,
                    status: 'Packed',
                    trackingLink,
                    estimatedDelivery,
                    totalAmount: finalAmount
                }).then(() => {
                    console.log(`✅ Email queued for ${orderId} (Packed)`);
                    return { type: 'Email', success: true };
                })
            ]);

            // Check results
            packedResults.forEach(result => {
                if (result.status === 'rejected') {
                    const notificationType = result.reason?.type || 'Notification';
                    const isExpected = isExpectedWhatsAppError(result.reason);
                    const severity = isExpected ? '⚠️ ' : '⚠️ ';
                    console.log(`${severity}Packed ${notificationType} failed (non-critical): ${result.reason?.message}`);
                    if (!isExpected && process.env.SENTRY_DSN && Sentry) {
                        Sentry.captureException(result.reason);
                    }
                }
            });
        }

        else if (status === 'Shipped') {
            // 🚚 SHIPPED: WhatsApp + Email (Parallel)
            const deliveryDate = estimatedDelivery ? new Date(estimatedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Soon';
            const shippedMsg = `🚚 YOUR ORDER IS ON THE WAY! 📍✨\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nHi ${firstName},\nYour premium selection is shipping!\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Order: #${orderId}\n📍 Status: Out for Premium Delivery\n🚚 Shipping: Fast & Secure\n📦 Order Value: ₹${Number(finalAmount || 0).toLocaleString('en-IN')}\n\n📅 DELIVERY WINDOW:\n📍 Expected Arrival: ${deliveryDate}\n⏰ Delivery Time: 9 AM - 6 PM\n\n🎯 WHAT TO EXPECT:\n✓ Professional White-Glove delivery\n✓ Careful handling of your selection\n✓ Real-time location tracking\n✓ Safe placement at your doorstep\n\n🔗 LIVE TRACKING: ${trackingLink}\n\n💡 PRO TIP:\n→ Ensure someone is available for delivery\n→ Keep door accessible\n→ Contact us if you need delivery rescheduling\n\n📞 DELIVERY SUPPORT:\n• WhatsApp: wa.me/918447859784\n• Call: 8447859784\n• Email: support@eshopperr.me\n\n💎 Thank you for your business!\nEshopper Boutique Luxe\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

            // Send both WhatsApp and Email in parallel
            const shippedResults = await Promise.allSettled([
                sendWhatsApp(phone, shippedMsg).then(() => {
                    console.log(`✅ Shipped WhatsApp sent for ${orderId}`);
                    return { type: 'WhatsApp', success: true };
                }),
                enqueueEmailJob('order-status', {
                    toEmail: email,
                    userName: displayName,
                    orderId,
                    status: 'Shipped',
                    trackingLink,
                    estimatedDelivery,
                    totalAmount: finalAmount
                }).then(() => {
                    console.log(`✅ Shipped email queued for ${orderId}`);
                    return { type: 'Email', success: true };
                })
            ]);

            // Check results
            shippedResults.forEach(result => {
                if (result.status === 'rejected') {
                    const isExpected = isExpectedWhatsAppError(result.reason);
                    console.log(`⚠️  Shipped notification failed (non-critical): ${result.reason?.message}`);
                    if (!isExpected && process.env.SENTRY_DSN && Sentry) {
                        Sentry.captureException(result.reason);
                    }
                }
            });
        }

        else if (status === 'Out for Delivery') {
            // 🚗 OUT FOR DELIVERY: WhatsApp + Email (Parallel)
            const deliveryDate = estimatedDelivery ? new Date(estimatedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today';
            const outForDeliveryMsg = `🚗 YOUR ORDER IS OUT FOR DELIVERY! 📍\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nHi ${firstName},\nYour package is with our delivery partner!\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Order: #${orderId}\n📍 Status: Out for Delivery (Final Mile)\n🚗 Location: On the way to your address\n📦 Order Value: ₹${Number(finalAmount || 0).toLocaleString('en-IN')}\n\n⏰ EXPECTED DELIVERY:\n📍 Expected Today: ${deliveryDate}\n🕐 Delivery Window: 9 AM - 6 PM\n\n📲 LIVE TRACKING:\n→ Track your package in real-time\n→ Get SMS/WhatsApp updates\n→ Know exact arrival time\n\n🔗 TRACK LIVE: ${trackingLink}\n\n🏠 BE READY:\n✓ Ensure someone is home\n✓ Keep your door accessible\n✓ Have payment ready if COD\n✓ Keep phone nearby for delivery call\n\n❓ NEED HELP?\n→ Contact driver directly\n→ WhatsApp: wa.me/918447859784\n→ Call: 8447859784\n\n📞 DELIVERY SUPPORT TEAM:\n• WhatsApp: wa.me/918447859784\n• Call: 8447859784\n• Email: support@eshopperr.me\n• Chat: Available 24/7\n\n💡 PRO TIP:\nIf you miss delivery, reschedule instantly from tracking page or WhatsApp us!\n\n🎁 Almost there!\nEshopper Boutique Luxe\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

            // Send both WhatsApp and Email in parallel
            const outForDeliveryResults = await Promise.allSettled([
                sendWhatsApp(phone, outForDeliveryMsg).then(() => {
                    console.log(`✅ Out for Delivery WhatsApp sent for ${orderId}`);
                    return { type: 'WhatsApp', success: true };
                }),
                enqueueEmailJob('order-status', {
                    toEmail: email,
                    userName: displayName,
                    orderId,
                    status: 'Out for Delivery',
                    trackingLink,
                    estimatedDelivery,
                    totalAmount: finalAmount
                }).then(() => {
                    console.log(`✅ Out for Delivery email queued for ${orderId}`);
                    return { type: 'Email', success: true };
                })
            ]);

            // Check results
            outForDeliveryResults.forEach(result => {
                if (result.status === 'rejected') {
                    const isExpected = isExpectedWhatsAppError(result.reason);
                    console.log(`⚠️  Out for Delivery notification failed (non-critical): ${result.reason?.message}`);
                    if (!isExpected && process.env.SENTRY_DSN && Sentry) {
                        Sentry.captureException(result.reason);
                    }
                }
            });
        }

        else if (status === 'Delivered') {
            // 🎉 DELIVERED: WhatsApp + Email (Parallel)
            let finalInvoiceBase64 = '';
            try {
                const invoiceBuffer = await generateInvoicePdfBuffer({
                    orderId,
                    userName: displayName,
                    userEmail: email,
                    paymentMethod: paymentMethod || 'Online',
                    paymentStatus: paymentStatus || 'Paid',
                    finalAmount: Number(finalAmount || 0),
                    totalAmount: Number(totalAmount || finalAmount || 0),
                    shippingAmount: Number(shippingAmount || 0),
                    shippingAddress: shippingAddress || { fullName: displayName, phone },
                    products: Array.isArray(products) ? products : [],
                    orderDate: new Date(),
                    estimatedArrival: estimatedDelivery,
                    orderStatus: 'Delivered',
                    pdfType: 'final',
                    isDelivered: true
                });
                if (invoiceBuffer) finalInvoiceBase64 = invoiceBuffer.toString('base64');
            } catch (pdfErr) {
                console.warn(`⚠️ Final invoice generation skipped for ${orderId}:`, pdfErr.message);
                await sendAdminAlert({
                    title: 'Final Tax Invoice PDF Failed',
                    details: `Order ${orderId}: final tax invoice generation failed on Delivered status. Delivered email sent without attachment. Error: ${pdfErr.message}`
                });
            }

            const whatsappMsg = `🎉 ORDER DELIVERED! 💎✨\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nCongratulations, ${firstName}!\nYour premium selection has arrived!\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Order: #${orderId}\n✅ Status: Successfully Delivered\n✅ Order Value: ₹${Number(finalAmount || 0).toLocaleString('en-IN')}\n✅ Delivery Quality: Premium Packaging ✓\n\n🎁 WHAT YOU RECEIVED:\nYour beautifully packaged selection!\n(Check all items are in perfect condition)\n\n⭐ YOUR EXPERIENCE MATTERS!\nPlease share your feedback:\n→ Rate this product\n→ Write a review\n→ Tag us on social media\n\n🔗 PURCHASE LINK: ${trackingLink}\n\n📝 NEXT STEPS:\n✓ Inspect items for quality\n✓ Check packaging condition\n✓ Contact us for any issues\n✓ Share your experience\n\n💰 LOYALTY BONUS:\nGet 5% off on your next purchase!\nUse code at checkout: ESTHANKYOU5\n\n🌟 EXPLORE MORE:\nVisit our collection: https://eshopperr.me\nShop seasonal curations\nDiscover new premium items\n\n❓ SUPPORT:\n📞 WhatsApp: wa.me/918447859784\n📧 Email: support@eshopperr.me\n💬 Chat: Available 9 AM - 9 PM\n\n🙏 THANK YOU!\nFor choosing Eshopper Boutique Luxe\nYour satisfaction is our pride! 💎\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

            // Send both WhatsApp and Email in parallel
            const deliveredResults = await Promise.allSettled([
                sendWhatsApp(phone, whatsappMsg).then(() => {
                    console.log(`✅ Delivered WhatsApp sent for ${orderId}`);
                    return { type: 'WhatsApp', success: true };
                }),
                enqueueEmailJob('order-status', {
                    toEmail: email,
                    userName: displayName,
                    orderId,
                    status: 'Delivered',
                    trackingLink,
                    estimatedDelivery,
                    totalAmount: finalAmount,
                    invoiceBase64: finalInvoiceBase64,
                    attachmentName: `FinalTaxInvoice-${orderId}.pdf`
                }).then(() => {
                    console.log(`✅ Delivered email queued for ${orderId}`);
                    return { type: 'Email', success: true };
                })
            ]);

            // Check results
            deliveredResults.forEach(result => {
                if (result.status === 'rejected') {
                    const isExpected = isExpectedWhatsAppError(result.reason);
                    console.log(`⚠️  Delivered notification failed (non-critical): ${result.reason?.message}`);
                    if (!isExpected && process.env.SENTRY_DSN && Sentry) {
                        Sentry.captureException(result.reason);
                    }
                }
            });
        }

    } catch (error) {
        console.error(`❌ Luxe notification pipeline failed for ${orderId}:`, error.message);
        if (process.env.SENTRY_DSN) Sentry.captureException(error);
    }
};

const sendOrderStatusEmail = async ({ toEmail, userName, orderId, status, trackingLink, estimatedDelivery, totalAmount, shippingAmount, paymentMethod, paymentStatus, shippingAddress, products, invoiceBase64, attachmentName }) => {
    if (!toEmail) return false;

    const displayName = userName || 'Valued Customer';
    const firstName = displayName.split(' ')[0];
    
    const statusConfig = {
        'Ordered': { emoji: '✅', color: '#16a34a', bg1: '#d1fae5', bg2: '#a7f3d0', msg: 'Order Confirmed! Payment received.', lightBg: '#ecfdf5' },
        'Packed': { emoji: '📦', color: '#0066cc', bg1: '#dbeafe', bg2: '#bfdbfe', msg: 'Packed with premium care!', lightBg: '#f0f9ff' },
        'Shipped': { emoji: '🚚', color: '#f59e0b', bg1: '#fef3c7', bg2: '#fde68a', msg: 'On premium delivery!', lightBg: '#fffbeb' },
        'Out for Delivery': { emoji: '🚗', color: '#f97316', bg1: '#ffedd5', bg2: '#fed7aa', msg: 'Arriving today with care!', lightBg: '#fff7ed' },
        'Delivered': { emoji: '🎉', color: '#16a34a', bg1: '#d1fae5', bg2: '#a7f3d0', msg: 'Successfully delivered!', lightBg: '#ecfdf5' }
    };
    
    const config = statusConfig[status] || { emoji: '📦', color: '#111827', bg1: '#f9fafb', bg2: '#f3f4f6', msg: status };
    const normalizedStatus = normalizeOrderStatus(status) || status;
    const statusLower = String(normalizedStatus || '').toLowerCase();
    const deliveryDate = estimatedDelivery ? new Date(estimatedDelivery).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';

    const attachments = [];
    const shouldAttachFinalInvoice = normalizedStatus === 'Delivered';
    if (shouldAttachFinalInvoice && isValidBase64Payload(invoiceBase64)) {
        attachments.push({
            filename: attachmentName || `FinalTaxInvoice-${orderId}.pdf`,
            content: String(invoiceBase64).trim(),
            contentType: 'application/pdf'
        });
    }

    const templateFile = ORDER_STATUS_TEMPLATES[statusLower];
    if (templateFile) {
        try {
            const templateOrder = {
                orderId,
                userName: displayName,
                userEmail: toEmail,
                orderStatus: normalizedStatus,
                finalAmount: Number(totalAmount || 0),
                totalAmount: Number(totalAmount || 0),
                shippingAmount: Number(shippingAmount || 0),
                paymentMethod: paymentMethod || 'COD',
                paymentStatus: paymentStatus || 'Pending',
                estimatedArrival: estimatedDelivery || null,
                shippingAddress: shippingAddress || {},
                products: Array.isArray(products) ? products : [],
                orderDate: new Date()
            };

            const htmlContent = await loadEmailTemplate(templateFile, mapOrderToTemplateData(templateOrder, {
                name: displayName,
                email: toEmail
            }));

            const result = await sendTransactionalEmail({
                toEmail,
                toName: displayName,
                subject: getEmailSubject(statusLower, orderId),
                htmlContent,
                textContent: `Your order ${orderId} status: ${normalizedStatus}`,
                attachments
            });

            console.log(`✅ Status template email sent via ${result.provider}: ${orderId} -> ${normalizedStatus}`);
            return true;
        } catch (templateErr) {
            console.warn(`⚠️ Status template fallback (${orderId} -> ${normalizedStatus}):`, templateErr.message);
        }
    }

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { margin:0; padding:0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#0A0A0A; }
        .container { max-width:600px; margin:0 auto; background:#0A0A0A; border:2px solid #D4AF37; border-radius:12px; overflow:hidden; }
        .header { background:linear-gradient(135deg,#1a1a1a,#0A0A0A); padding:32px 24px; text-align:center; border-bottom:3px solid #D4AF37; }
        .brand-table { width:100%; border-collapse:collapse; table-layout:fixed; }
        .brand-left { width:64px; text-align:left; vertical-align:middle; }
        .brand-center { text-align:center; vertical-align:middle; }
        .brand-spacer { width:64px; }
        .logo-emoji { font-size:56px; line-height:1; margin:0 auto 16px; }
        .brand-title { font-size:28px; font-weight:900; color:#D4AF37; letter-spacing:1.5px; margin:0; line-height:1.2; text-transform:uppercase; }
        .tagline { font-size:12px; color:#888; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; margin:8px 0 0 0; }
        .status-banner { background:linear-gradient(135deg,${config.bg1},${config.bg2}); padding:40px 24px; text-align:center; border-bottom:4px solid ${config.color}; margin:0; }
        .emoji-large { font-size:72px; line-height:1; margin:0 0 16px 0; }
        .status-title { font-size:28px; font-weight:800; color:${config.color}; margin:0 0 8px 0; letter-spacing:0.5px; }
        .status-subtitle { font-size:14px; color:${config.color}; opacity:0.85; margin:0; }
        .content { padding:32px 24px; background:#0A0A0A; }
        .greeting { margin:0 0 24px 0; }
        .greeting h2 { margin:0 0 12px 0; font-size:20px; color:#fff; font-weight:700; }
        .greeting p { margin:0; color:#aaa; font-size:14px; line-height:1.6; }
        .cards { display:flex; gap:16px; flex-wrap:wrap; margin:0 0 28px 0; }
        .card { flex:1; min-width:200px; padding:20px; border-radius:12px; text-align:center; }
        .card-dark { background:#1a1a1a; border:1px solid #333; }
        .card-colored { background:linear-gradient(135deg,${config.bg1},${config.bg2}); border:2px solid ${config.color}; }
        .card-label { font-size:11px; letter-spacing:1.5px; color:${config.color}; text-transform:uppercase; font-weight:700; margin:0 0 8px 0; }
        .card-value { font-size:20px; font-weight:900; color:#fff; margin:0 0 4px 0; }
        .card-sub { font-size:12px; color:#9ca3af; margin:8px 0 0 0; }
        .card-dark .card-label { color:#d4af37; }
        .card-dark .card-value { color:#fff; }
        .card-dark .card-sub { color:#9ca3af; }
        .card-colored .card-label { color:#111827; }
        .card-colored .card-value { color:#111827; }
        .card-colored .card-sub { color:#374151; }
        .info-box { padding:20px; border-radius:12px; border-left:4px solid ${config.color}; background:linear-gradient(135deg,${config.bg1},${config.bg2}); margin:0 0 28px 0; }
        .info-title { font-size:13px; font-weight:700; color:${config.color}; text-transform:uppercase; margin:0 0 8px 0; }
        .info-text { font-size:14px; color:#333; margin:0; line-height:1.6; }
        .button-group { margin:0 0 28px 0; }
        .button { display:block; background:#D4AF37; color:#0A0A0A; padding:16px 32px; border-radius:8px; text-decoration:none; font-weight:900; text-align:center; font-size:15px; letter-spacing:1px; margin:0 0 12px 0; box-shadow:0 4px 12px rgba(212,175,55,0.3); transition:all 0.3s; }
        .button:hover { transform:translateY(-2px); }
        .support-box { background:linear-gradient(135deg,#1a1a1a,#0A0A0A); padding:28px 24px; border-radius:12px; border-left:4px solid #D4AF37; text-align:center; margin:0 0 20px 0; }
        .support-emoji { font-size:48px; margin:0 0 12px 0; line-height:1; }
        .support-title { font-size:22px; font-weight:900; color:#D4AF37; margin:0 0 10px 0; letter-spacing:1px; }
        .support-text { font-size:14px; color:#aaa; margin:0 0 18px 0; line-height:1.6; }
        .support-links { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
        .support-link { display:inline-block; padding:10px 20px; border-radius:8px; text-decoration:none; font-weight:700; font-size:13px; letter-spacing:0.5px; text-transform:uppercase; }
        .link-email { background:#D4AF37; color:#0A0A0A; }
        .link-whatsapp { background:#22c55e; color:#fff; }
        .footer { background:#0A0A0A; padding:28px 24px; text-align:center; border-top:2px solid #333; }
        .footer-logo { font-size:18px; font-weight:900; color:#D4AF37; margin:0 0 10px 0; letter-spacing:1px; }
        .footer-text { font-size:12px; color:#666; margin:0 0 4px 0; line-height:1.6; }
        .footer-link { color:#D4AF37; text-decoration:none; font-weight:700; }
        @media (max-width:600px) {
            .cards { flex-direction:column; }
            .card { min-width:100% !important; }
            .button { font-size:14px; padding:14px 24px; }
            .content { padding:20px 16px; }
            .status-banner { padding:32px 16px; }
            .emoji-large { font-size:64px; }
            .status-title { font-size:24px; }
            .brand-left, .brand-spacer { width:52px; }
            .brand-badge { width:40px; height:40px; line-height:36px; font-size:22px; border-radius:10px; }
            .brand-title { font-size:22px; }
            .tagline { font-size:10px; letter-spacing:1.6px; }
            .support-box { padding:22px 14px; border-radius:20px; }
            .support-emoji { font-size:46px; }
            .support-title { font-size:28px; }
            .support-text { font-size:14px; }
            .support-links { flex-direction:column; gap:10px; }
            .support-link { width:100%; max-width:230px; min-width:0; font-size:16px; padding:10px 14px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="logo-emoji">💎</div>
            <h1 class="brand-title">eShopper</h1>
            <p class="tagline">Boutique Luxe • Order Update</p>
        </div>

        <!-- Status Banner -->
        <div class="status-banner">
            <div class="emoji-large">${config.emoji}</div>
            <div class="status-title">${status}</div>
            <div class="status-subtitle">${config.msg}</div>
        </div>

        <!-- Main Content -->
        <div class="content">
            <!-- Greeting -->
            <div class="greeting">
                <h2>Hi ${firstName},</h2>
                <p>Your order <strong>${orderId}</strong> has been updated. Here's what's next:</p>
            </div>

            <!-- Order Details Cards -->
            <div class="cards">
                <div class="card card-dark">
                    <p class="card-label">🆔 Order ID</p>
                    <p class="card-value">${orderId}</p>
                    <p class="card-sub">${new Date().toLocaleDateString('en-IN')}</p>
                </div>
                <div class="card card-colored">
                    <p class="card-label">🚚 Est. Delivery</p>
                    <p class="card-value" style="color:#111827;">${deliveryDate}</p>
                    <p class="card-sub" style="color:#555;">Track in real-time</p>
                </div>
            </div>

            <!-- Status Info Box -->
            <div class="info-box">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="font-size:32px;">${config.emoji}</div>
                    <div>
                        <p class="info-title" style="color:${config.color};">Status: ${status}</p>
                        <p class="info-text" style="margin:0;">${config.msg}</p>
                    </div>
                </div>
            </div>

            <!-- Amount (if provided) -->
            ${totalAmount ? `
            <div class="info-box" style="background:linear-gradient(135deg,#d4edda,#c3e6cb); border-left-color:#28a745;">
                <p style="margin:0; font-size:12px; color:#28a745; font-weight:700;">💳 ORDER AMOUNT</p>
                <p style="margin:8px 0 0 0; font-size:22px; font-weight:900; color:#28a745;">₹${Number(totalAmount).toLocaleString('en-IN')}</p>
            </div>
            ` : ''}

            <!-- Action Button -->
            <div class="button-group">
                <a href="${trackingLink}" class="button">🔍 TRACK YOUR ORDER IN REAL-TIME</a>
            </div>

            <!-- Support Box -->
            <div class="support-box">
                <div class="support-emoji">🎧</div>
                <div class="support-title">Need Assistance?</div>
                <div class="support-text">Our premium support team is available 24/7 to help you with any questions or concerns</div>
                <div class="support-links">
                    <a href="mailto:support@eshopperr.me" class="support-link link-email">✉ Email Us</a>
                    <a href="https://wa.me/918447859784?text=Hi%20I%20need%20help%20with%20order%20${orderId}" class="support-link link-whatsapp">💬 WhatsApp</a>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p class="footer-logo">✨ EShoppper</p>
            <p class="footer-text">© ${new Date().getFullYear()} Eshopper Boutique Luxe<br>
                <a href="https://eshopperr.me" class="footer-link">eshopperr.me</a>
            </p>
        </div>
    </div>
</body>
</html>`;

    try {
        const result = await sendTransactionalEmail({
            toEmail,
            toName: displayName,
            subject: `${config.emoji} ${status} - Order ${orderId} | Eshopper Boutique`,
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
        const firstName = (userName || 'Valued Customer').split(' ')[0];
        const safeProducts = Array.isArray(products) ? products : [];

        // Prefer the dedicated template file first to keep dispatcher behavior consistent.
        try {
            const templateOrder = {
                orderId,
                userName,
                userEmail: toEmail,
                orderStatus: 'Order Placed',
                finalAmount: Number(finalAmount || 0),
                totalAmount: Number(finalAmount || 0),
                shippingAmount: 0,
                shippingAddress: shippingAddress || {},
                products: safeProducts,
                orderDate: new Date()
            };

            const htmlContent = await loadEmailTemplate('01-order-placed.html', mapOrderToTemplateData(templateOrder, {
                name: userName,
                email: toEmail
            }));

            const templateAttachments = invoiceBuffer
                ? [{ filename: `OrderReceipt-${orderId}.pdf`, content: invoiceBuffer, contentType: 'application/pdf' }]
                : [];

            const result = await sendTransactionalEmail({
                toEmail,
                toName: userName || 'Customer',
                subject: getEmailSubject('order placed', orderId),
                htmlContent,
                textContent: `Your order ${orderId} has been placed successfully.`,
                attachments: templateAttachments
            });

            console.log(`✅ Order Placed template email sent via ${result.provider} to ${toEmail} for ${orderId}`);
            return true;
        } catch (templateErr) {
            console.warn(`⚠️ Order Placed template fallback for ${orderId}:`, templateErr.message);
        }
        
        const productRows = safeProducts.slice(0, 3).map(p => `
            <tr>
                <td style="padding:14px; border-bottom:1px solid #222; vertical-align:middle;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                            <td style="width:80px; padding-right:14px; vertical-align:middle;">
                                ${p.pic ? `<img src="${p.pic}" alt="${p.name}" style="width:80px; height:80px; object-fit:cover; border-radius:8px; border:2px solid #D4AF37; display:block;" />` : `<div style="width:80px; height:80px; background:#1a1a1a; border-radius:8px; border:2px solid #D4AF37; display:table-cell; text-align:center; vertical-align:middle; font-size:32px;">📦</div>`}
                            </td>
                            <td style="vertical-align:middle;">
                                <div style="font-weight:700; color:#fff; font-size:15px; margin:0 0 6px 0;">${p.name}</div>
                                <div style="font-size:13px; color:#aaa;">Quantity: <strong style="color:#D4AF37;">${p.qty || 1}</strong></div>
                                <div style="font-size:13px; color:#aaa; margin-top:4px;">Price: <strong style="color:#D4AF37;">₹${Number(p.price || 0).toLocaleString('en-IN')}</strong></div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        `).join('');

        const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { box-sizing:border-box; margin:0; padding:0; }
        body { font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#0A0A0A; color:#fff; line-height:1.6; }
        .email-wrapper { width:100%; background:#0A0A0A; padding:20px 0; }
        .container { max-width:600px; margin:0 auto; background:#0A0A0A; border:2px solid #D4AF37; border-radius:12px; overflow:hidden; }
        .header { padding:40px 30px; text-align:center; background:linear-gradient(180deg, #1a1a1a 0%, #0A0A0A 100%); border-bottom:3px solid #D4AF37; }
        .logo-emoji { font-size:56px; margin:0 auto 18px; width:70px; height:70px; line-height:70px; }
        .brand-name { font-size:32px; font-weight:900; color:#D4AF37; margin:0 0 8px 0; letter-spacing:1.5px; text-transform:uppercase; }
        .tagline { font-size:13px; color:#888; margin:0; letter-spacing:1.2px; text-transform:uppercase; }
        .status-badge { display:inline-block; background:#D4AF37; color:#0A0A0A; padding:10px 24px; border-radius:25px; font-size:12px; font-weight:900; margin-top:16px; letter-spacing:1px; }
        .content { padding:40px 30px; }
        .greeting-box { background:#1a1a1a; padding:24px; border-radius:10px; border-left:4px solid #D4AF37; margin-bottom:30px; }
        .greeting { font-size:16px; color:#e5e5e5; line-height:1.7; margin:0; }
        .greeting strong { color:#D4AF37; font-weight:700; }
        .section-title { font-size:14px; font-weight:900; color:#D4AF37; margin:0 0 18px 0; text-transform:uppercase; letter-spacing:1.2px; }
        .order-id-box { background:#1a1a1a; padding:24px; border-radius:10px; border:2px solid #D4AF37; margin-bottom:30px; text-align:center; }
        .order-id-label { font-size:11px; color:#888; text-transform:uppercase; letter-spacing:1.5px; margin:0 0 10px 0; }
        .order-id { font-size:26px; font-weight:900; color:#D4AF37; margin:0; letter-spacing:1.2px; font-family:monospace; }
        .order-date { font-size:13px; color:#666; margin:14px 0 0 0; }
        .info-table { width:100%; border-collapse:collapse; background:#1a1a1a; border-radius:10px; overflow:hidden; margin-bottom:30px; border:1px solid #333; }
        .info-table td { padding:14px; color:#e5e5e5; font-size:14px; border-bottom:1px solid #222; }
        .info-table tr:last-child td { border-bottom:none; }
        .amount-box { background:#1a1a1a; padding:24px; border-radius:10px; border:1px solid #333; margin-bottom:30px; }
        .amount-row { display:table; width:100%; padding:12px 0; border-bottom:1px solid #333; font-size:15px; }
        .amount-row:last-child { border-bottom:none; border-top:2px solid #D4AF37; padding-top:16px; margin-top:10px; }
        .amount-label { display:table-cell; color:#aaa; }
        .amount-value { display:table-cell; color:#fff; font-weight:700; text-align:right; }
        .total-value { color:#D4AF37; font-size:22px; font-weight:900; }
        .track-button { display:block; background:#D4AF37; color:#0A0A0A; padding:16px 32px; border-radius:8px; text-decoration:none; font-weight:900; text-align:center; font-size:15px; margin:30px 0; transition:all 0.3s; letter-spacing:0.5px; }
        .track-button:hover { background:#ffd700; transform:translateY(-2px); }
        .info-note { font-size:13px; color:#666; text-align:center; margin-top:28px; line-height:1.6; }
        .footer { padding:32px 30px; text-align:center; border-top:2px solid #333; background:#0A0A0A; }
        .footer-brand { font-size:18px; font-weight:900; color:#D4AF37; margin:0 0 6px 0; letter-spacing:1px; }
        .footer-text { font-size:12px; color:#666; margin:6px 0; }
        .footer-link { color:#D4AF37; text-decoration:none; font-weight:700; }
        .footer-link:hover { color:#ffd700; }
        @media (max-width:600px) {
            .header { padding:30px 20px; }
            .content { padding:30px 20px; }
            .footer { padding:24px 20px; }
            .brand-name { font-size:26px; }
            .logo-emoji { font-size:48px; width:60px; height:60px; line-height:60px; }
            .greeting-box { padding:18px; }
            .info-table td { padding:12px 10px; font-size:13px; }
            .track-button { padding:14px 28px; font-size:14px; }
        }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="container">
            <div class="header">
                <div class="logo-emoji">💎</div>
                <h1 class="brand-name">eShopper</h1>
                <p class="tagline">Boutique Luxe</p>
                <span class="status-badge">📦 ORDER RECEIVED</span>
            </div>
            
            <div class="content">
                <div class="greeting-box">
                    <p class="greeting">Hello <strong>${firstName}</strong>,</p>
                    <p class="greeting" style="margin-top:10px;">Thank you for choosing eShopper! We've successfully received your order and our team is now reviewing your request. You'll receive a detailed confirmation email shortly with all order information.</p>
                </div>
                
                <p class="section-title">📋 Order Summary</p>
                <div class="order-id-box">
                    <p class="order-id-label">Order ID</p>
                    <p class="order-id">${orderId}</p>
                    <p class="order-date">Placed on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                
                ${safeProducts.length > 0 ? `
                <p class="section-title">🛍️ Items Ordered</p>
                <table class="info-table">
                    <tbody>${productRows}</tbody>
                </table>
                ${safeProducts.length > 3 ? `<p style="font-size:13px; color:#888; margin:-20px 0 25px 0; text-align:center;">+ ${safeProducts.length - 3} more item(s) in your order</p>` : ''}
                ` : ''}
                
                <p class="section-title">💰 Payment Details</p>
                <div class="amount-box">
                    <div class="amount-row">
                        <span class="amount-label">Order Total</span>
                        <span class="amount-value total-value">₹ ${Number(finalAmount || 0).toLocaleString('en-IN')}</span>
                    </div>
                </div>
                
                <a href="https://eshopperr.me/order-tracking/${orderId}" class="track-button">TRACK YOUR ORDER</a>
                
                <p class="info-note">
                    📧 You'll receive a confirmation email with complete order details and invoice shortly.<br>
                    <span style="display:block; margin-top:8px; font-size:12px; color:#555;">Our team is processing your request...</span>
                </p>
            </div>
            
            <div class="footer">
                <p class="footer-brand">eShopper Boutique Luxe</p>
                <p class="footer-text">Premium Fashion & Lifestyle Destination</p>
                <p class="footer-text" style="margin-top:16px;">
                    <a href="mailto:support@eshopperr.me" class="footer-link">📧 support@eshopperr.me</a>
                </p>
                <p class="footer-text" style="margin-top:10px; font-size:11px; color:#555;">
                    This is an automated notification. Please do not reply to this email.
                </p>
            </div>
        </div>
    </div>
</body>
</html>`;

        const attachments = invoiceBuffer
            ? [{ filename: `OrderReceipt-${orderId}.pdf`, content: invoiceBuffer, contentType: 'application/pdf' }]
            : [];

        const result = await sendTransactionalEmail({
            toEmail,
            toName: userName || 'Customer',
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

// ==================== EMAIL #2: ORDER CONFIRMED (PREMIUM TABLE TEMPLATE) ====================
const sendOrderConfirmationEmail = async ({ toEmail, userName, orderId, paymentMethod, finalAmount, shippingAddress, products, estimatedArrival, invoiceBase64 }) => {
    if (!toEmail || !toEmail.includes('@')) {
        console.error('❌ Invalid email:', toEmail);
        throw new Error('Invalid toEmail address');
    }

    try {
        const frontendUrl = (process.env.FRONTEND_URL || 'https://eshopperr.me').replace(/\/$/, '');
        const displayName = userName || 'Valued Customer';
        const safeShipping = shippingAddress || {};
        const rawProducts = Array.isArray(products) ? products : [];

        const normalizedProducts = rawProducts.slice(0, 8).map((p) => {
            const quantity = Number(p.qty || p.qt || p.quantity || 1) || 1;
            const price = Number(p.price || p.finalprice || 0) || 0;
            const total = Number(p.total || (price * quantity)) || 0;
            return {
                name: p.title || p.name || 'Product',
                image: p.pic || p.image || p.imageURL || p.pic1 || `${frontendUrl}/logo512.png`,
                category: p.maincategory || p.category || '',
                size: p.size || '',
                color: p.color || '',
                quantity,
                price,
                total
            };
        });

        const totalAmount = Number(finalAmount || 0);
        const productsForTemplate = normalizedProducts.length > 0
            ? normalizedProducts
            : [{
                name: 'Curated Product',
                image: `${frontendUrl}/logo512.png`,
                category: 'Premium Selection',
                size: '',
                color: '',
                quantity: 1,
                price: Math.round(totalAmount || 0),
                total: Math.round(totalAmount || 0)
            }];

        const subtotal = productsForTemplate.reduce((sum, p) => sum + Number(p.total || 0), 0);
        const finalTotalAmount = Number(totalAmount || subtotal || 0);
        const gstAmount = finalTotalAmount > subtotal ? Math.max(0, finalTotalAmount - subtotal) : Math.round(finalTotalAmount * 0.05);

        const orderDate = new Date().toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        const estimatedDelivery = estimatedArrival
            ? new Date(estimatedArrival).toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            })
            : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });

        const templateData = {
            BRAND_LOGO_URL: process.env.BRAND_LOGO_URL || `${frontendUrl}/logo512.png`,
            ORDER_ID: orderId,
            ORDER_DATE: orderDate,
            ESTIMATED_DELIVERY_DATE: estimatedDelivery,
            PRODUCTS: productsForTemplate,
            SHIPPING_NAME: safeShipping.name || safeShipping.fullName || displayName,
            SHIPPING_ADDRESS: safeShipping.street || safeShipping.addressline1 || safeShipping.address || 'N/A',
            SHIPPING_CITY: safeShipping.city || '',
            SHIPPING_STATE: safeShipping.state || '',
            SHIPPING_PIN: safeShipping.zip || safeShipping.pin || '',
            SHIPPING_PHONE: safeShipping.phone || '',
            PAYMENT_METHOD: paymentMethod || 'Secure Payment',
            TRANSACTION_ID: `TXN-${String(orderId || '').replace(/[^a-zA-Z0-9]/g, '').slice(-10) || Date.now()}`,
            BILLING_NAME: safeShipping.name || safeShipping.fullName || displayName,
            CUSTOMER_EMAIL: toEmail,
            SUBTOTAL: Math.round(subtotal),
            GST_AMOUNT: Math.round(gstAmount),
            TOTAL_AMOUNT: Math.round(finalTotalAmount),
            TRACKING_URL: `${frontendUrl}/order-tracking/${orderId}`,
            INVOICE_URL: `${frontendUrl}/invoice/${orderId}`,
            INSTAGRAM_URL: 'https://instagram.com/eshopperluxe',
            SUPPORT_EMAIL: 'support@eshopperr.me'
        };

        const htmlContent = await loadEmailTemplate('02-order-confirmed-premium.html', templateData);

        const attachments = [];
        if (invoiceBase64 && typeof invoiceBase64 === 'string' && invoiceBase64.trim().length > 0 && /^[A-Za-z0-9+/=]+$/.test(invoiceBase64.trim())) {
            attachments.push({ filename: `Confirmation-${orderId}.pdf`, content: invoiceBase64.trim(), contentType: 'application/pdf' });
        }

        const result = await sendTransactionalEmail({
            toEmail,
            toName: displayName,
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

        // 📧 SEND "ORDER PLACED" EMAIL AUTOMATICALLY
        if (FEATURE_EMAIL_NOTIFICATIONS) {
            setImmediate(async () => {
                try {
                    await enqueueEmailJob('order-placed', {
                        toEmail: recipientEmail,
                        userName: user.name,
                        orderId,
                        finalAmount: payable,
                        products: cleanProducts,
                        shippingAddress: addressPayload,
                        invoiceBuffer
                    });
                    console.log(`✅ Order Placed email sent for ${orderId} → ${recipientEmail}`);
                } catch (emailErr) {
                    console.error(`⚠️ Order Placed email failed for ${orderId}:`, emailErr.message);
                    if (process.env.SENTRY_DSN) Sentry.captureException(emailErr);
                }
            });
        }

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
                brevoApiKey: process.env.BREVO_API_KEY ? '✅ Configured' : '❌ Missing',
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
                await axios.post('https://api.brevo.com/v3/smtp/email', {
                    sender: { name: 'Eshopper', email: 'support@eshopperr.me' },
                    to: [{ email: email, name: 'Test User' }],
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
                    `,
                    replyTo: { email: 'support@eshopperr.me' }
                }, {
                    headers: {
                        'api-key': process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.trim() : '',
                        'content-type': 'application/json',
                        'accept': 'application/json'
                    },
                    timeout: 15000
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
            .select('orderId orderStatus finalAmount paymentStatus paymentMethod estimatedArrival updatedAt createdAt')
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
                    estimatedArrival: item.estimatedArrival || null,
                    estimatedDelivery: item.estimatedArrival || null,
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
                estimatedArrival: item.estimatedArrival || null,
                estimatedDelivery: item.estimatedArrival || null,
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
            .select('orderId orderStatus finalAmount estimatedArrival updatedAt createdAt')
            .lean();

        return res.json({
            success: true,
            orders: orders.map((item) => ({
                orderId: item.orderId,
                orderStatus: item.orderStatus || 'Order Placed',
                finalAmount: Number(item.finalAmount || 0),
                estimatedArrival: item.estimatedArrival || null,
                estimatedDelivery: item.estimatedArrival || null,
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
            const isReceiptStage = orderStatus === 'ordered' || orderStatus === 'order placed';
            const pdfType = isDelivered ? 'final' : (isReceiptStage ? 'receipt' : 'confirmation');
            
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
                : (isReceiptStage ? `Receipt-${order.orderId}.pdf` : `Confirmation-${order.orderId}.pdf`);
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
        const timeoutId = setTimeout(() => {}, 120000);

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
                pdfType: pdfType // 'receipt' | 'confirmation' | 'final'
            });

            clearTimeout(timeoutId);

            if (!pdfBuffer || pdfBuffer.length < 500) {
                return res.status(500).json({ message: 'PDF generation failed - invalid buffer' });
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
            if (process.env.SENTRY_DSN) Sentry.captureException(pdfErr);
            return res.status(500).json({ message: 'Failed to generate PDF - please try again' });
        }
    } catch (e) {
        console.error('❌ Download endpoint error:', e.message, e.stack);
        if (process.env.SENTRY_DSN) Sentry.captureException(e);
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
        const timeoutId = setTimeout(() => {}, 120000);

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
            .select('orderId userid userName userEmail orderStatus paymentStatus finalAmount estimatedArrival updatedAt createdAt products')
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
                estimatedArrival: item.estimatedArrival || null,
                estimatedDelivery: item.estimatedArrival || null,
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
        const { orderId, status, estimatedArrival, estimatedDelivery, expectedDays } = req.body;
        const normalized = normalizeOrderStatus(status);

        if (!orderId || !normalized) {
            return res.status(400).json({
                message: `orderId and valid status are required (${ALLOWED_ORDER_STATUS.join(', ')})`
            });
        }

        // 🔴 FIRST: Try to find by orderId (from Order collection)
        let order = await Order.findOne({ orderId });
        const nextEstimatedArrival = resolveEstimatedArrival({
            status: normalized,
            explicitDate: estimatedArrival || estimatedDelivery,
            expectedDays
        });
        
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
                estimatedArrival: nextEstimatedArrival,
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
            order.estimatedArrival = nextEstimatedArrival;
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
            estimatedArrival: order.estimatedArrival || null,
            estimatedDelivery: order.estimatedArrival || null,
            updatedAt: new Date().toISOString()
        };

        // 🔴 EMIT REAL-TIME STATUS UPDATE VIA SOCKET.IO (instant UI update)
        io.to(`user:${order.userid}`).emit('statusUpdate', payload);
        console.log(`✅ Status updated for order ${order.orderId} to ${normalized}, emitted to user:${order.userid}`);

        // 🔴 SEND AUTOMATIC EMAIL ON STATUS CHANGE (email-only path)
        if (FEATURE_EMAIL_NOTIFICATIONS && !FEATURE_WHATSAPP_NOTIFICATIONS) {
            setImmediate(() => {
                (async () => {
                    let invoiceBase64 = '';
                    let attachmentName = '';

                    if (normalized === 'Delivered' && FEATURE_INVOICE_SYSTEM) {
                        try {
                            const finalPdfBuffer = await generateInvoicePdfBuffer({
                                orderId: order.orderId,
                                userName: order.userName,
                                userEmail: order.userEmail,
                                paymentMethod: order.paymentMethod || 'COD',
                                paymentStatus: order.paymentStatus || 'Paid',
                                finalAmount: Number(order.finalAmount || 0),
                                totalAmount: Number(order.totalAmount || order.finalAmount || 0),
                                shippingAmount: Number(order.shippingAmount || 0),
                                shippingAddress: order.shippingAddress || {},
                                products: Array.isArray(order.products) ? order.products : [],
                                orderDate: order.orderDate || new Date(),
                                estimatedArrival: order.estimatedArrival,
                                orderStatus: 'Delivered',
                                pdfType: 'final',
                                isDelivered: true
                            });

                            if (finalPdfBuffer && finalPdfBuffer.length > 0) {
                                invoiceBase64 = finalPdfBuffer.toString('base64');
                                attachmentName = `FinalTaxInvoice-${order.orderId}.pdf`;
                            }
                        } catch (pdfErr) {
                            console.warn(`⚠️ Final invoice generation skipped for ${order.orderId}:`, pdfErr.message);
                            await sendAdminAlert({
                                title: 'Final Tax Invoice PDF Failed',
                                details: `Order ${order.orderId}: final tax invoice generation failed on Delivered status. Delivered email sent without attachment. Error: ${pdfErr.message}`
                            });
                        }
                    }

                    try {
                        await enqueueEmailJob('order-status', {
                            toEmail: order.userEmail,
                            userName: order.userName,
                            orderId: order.orderId,
                            status: normalized,
                            trackingLink: getTrackingLink(order.orderId),
                            estimatedDelivery: order.estimatedArrival,
                            totalAmount: order.finalAmount,
                            shippingAmount: order.shippingAmount,
                            paymentMethod: order.paymentMethod,
                            paymentStatus: order.paymentStatus,
                            shippingAddress: order.shippingAddress,
                            products: order.products,
                            invoiceBase64,
                            attachmentName
                        });
                    } catch (emailErr) {
                        console.error(`⚠️ Email send error for ${order.orderId}:`, emailErr.message);
                    }
                })();
            });
        }

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
            estimatedArrival: order.estimatedArrival || null,
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
        const { orderId, estimatedArrival, estimatedDelivery, expectedDays } = req.body;
        
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

        // Ensure ETA exists before generating proforma so email attachment and UI stay aligned.
        order.estimatedArrival = resolveEstimatedArrival({
            status: 'Ordered',
            explicitDate: estimatedArrival || estimatedDelivery,
            expectedDays
        });

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
            estimatedArrival: order.estimatedArrival || null,
            estimatedDelivery: order.estimatedArrival || null,
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
                estimatedArrival: order.estimatedArrival || null,
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
