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

    console.log('✅ Firebase Admin SDK initialized successfully');
    console.log(`🔐 Project ID: ${firebaseCredentials.project_id}`);
    console.log(`📧 Service Account: ${firebaseCredentials.client_email}`);

} catch (err) {
    console.error('❌ CRITICAL: Firebase Admin SDK initialization failed');
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
    process.exit(1);
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
const BRAND_LOGO_PRIMARY_URL = process.env.BRAND_LOGO_URL || `${BRAND_SITE_URL}/assets/eshopper-logo-mark.svg`;
const BRAND_LOGO_FALLBACK_URL = process.env.BRAND_LOGO_FALLBACK_URL || `${BRAND_SITE_URL}/assets/eshopper-logo-horizontal.svg`;
const BRAND_LOGO_EMAIL_URL = process.env.BRAND_LOGO_EMAIL_URL || `${BRAND_SITE_URL}/assets/eshopper-logo-horizontal.svg`;

let BRAND_LOGO_PDF_SRC = BRAND_LOGO_PRIMARY_URL;
try {
    const localLogoPath = path.join(__dirname, 'public', 'assets', 'eshopper-logo-mark.svg');
    if (fs.existsSync(localLogoPath)) {
        const svg = fs.readFileSync(localLogoPath, 'utf8');
        BRAND_LOGO_PDF_SRC = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    }
} catch (logoErr) {
    console.warn('⚠️ Could not inline local brand logo for PDF:', logoErr.message);
}

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

// 🔴 BUILD ORDER RECEIPT HTML - For immediate download when order is placed
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
    const orderDateText = orderDateObj.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Calculate estimated delivery (5-7 days from now)
    const deliveryDateMin = new Date(orderDateObj.getTime() + 5 * 24 * 60 * 60 * 1000);
    const deliveryDateMax = new Date(orderDateObj.getTime() + 7 * 24 * 60 * 60 * 1000);
    const deliveryDateText = `${deliveryDateMin.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${deliveryDateMax.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;

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
                <td style="width:50%;"><strong>${itemDesc}</strong></td>
                <td style="width:12%; text-align:center; font-weight:600;">${qty}</td>
                <td style="width:30%; text-align:right; font-weight:600; color:#d4af37;">₹${line.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
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
                
                /* WATERMARK */
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
                        <h1 class="title">ORDER PLACEMENT RECEIPT</h1>
                        <p class="subtitle">Your Luxury Purchase has been Registered</p>
                        
                        <!-- STATUS BADGE -->
                        <div style="text-align: center; margin-bottom: 32px;">
                            <div class="status-badge">✓ Order Received</div>
                            <div class="status-message">Our artisans have started verifying your premium selection</div>
                        </div>

                        <!-- NEXT STEPS -->
                        <div class="next-steps">
                            <div class="steps-title">⏳ Your Order Journey</div>
                            <div class="steps-container">
                                <div class="step">
                                    <div class="step-icon">✓</div>
                                    <div class="step-text">Quality Check</div>
                                </div>
                                <div class="step">
                                    <div class="step-icon">📦</div>
                                    <div class="step-text">White-Glove Packing</div>
                                </div>
                                <div class="step">
                                    <div class="step-icon">🚚</div>
                                    <div class="step-text">Courier Handover</div>
                                </div>
                            </div>
                        </div>

                        <!-- ESTIMATED DELIVERY -->
                        <div class="delivery-highlight">
                            <div class="delivery-label">📅 Expected Delivery</div>
                            <div class="delivery-date">${deliveryDateText}</div>
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

const generateInvoicePdfBuffer = async (orderPayload) => {
    // Determine which HTML builder to use based on delivery status
    const isDelivered = orderPayload?.isDelivered || false;
    const htmlBuilder = isDelivered 
        ? buildTaxInvoiceHtml 
        : buildOrderReceiptHtml;
    
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
const sendLuxeStatusNotification = async ({ orderId, status, phone, customerName, email, estimatedDelivery, finalAmount }) => {
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
                sendOrderStatusEmail({
                    toEmail: email,
                    userName: displayName,
                    orderId,
                    status: 'Packed',
                    trackingLink,
                    estimatedDelivery,
                    totalAmount: finalAmount
                }).then(() => {
                    console.log(`✅ Email sent for ${orderId} (Packed)`);
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
                sendOrderStatusEmail({
                    toEmail: email,
                    userName: displayName,
                    orderId,
                    status: 'Shipped',
                    trackingLink,
                    estimatedDelivery,
                    totalAmount: finalAmount
                }).then(() => {
                    console.log(`✅ Shipped email sent for ${orderId}`);
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
                sendOrderStatusEmail({
                    toEmail: email,
                    userName: displayName,
                    orderId,
                    status: 'Out for Delivery',
                    trackingLink,
                    estimatedDelivery,
                    totalAmount: finalAmount
                }).then(() => {
                    console.log(`✅ Out for Delivery email sent for ${orderId}`);
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
            const whatsappMsg = `🎉 ORDER DELIVERED! 💎✨\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nCongratulations, ${firstName}!\nYour premium selection has arrived!\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Order: #${orderId}\n✅ Status: Successfully Delivered\n✅ Order Value: ₹${Number(finalAmount || 0).toLocaleString('en-IN')}\n✅ Delivery Quality: Premium Packaging ✓\n\n🎁 WHAT YOU RECEIVED:\nYour beautifully packaged selection!\n(Check all items are in perfect condition)\n\n⭐ YOUR EXPERIENCE MATTERS!\nPlease share your feedback:\n→ Rate this product\n→ Write a review\n→ Tag us on social media\n\n🔗 PURCHASE LINK: ${trackingLink}\n\n📝 NEXT STEPS:\n✓ Inspect items for quality\n✓ Check packaging condition\n✓ Contact us for any issues\n✓ Share your experience\n\n💰 LOYALTY BONUS:\nGet 5% off on your next purchase!\nUse code at checkout: ESTHANKYOU5\n\n🌟 EXPLORE MORE:\nVisit our collection: https://eshopperr.me\nShop seasonal curations\nDiscover new premium items\n\n❓ SUPPORT:\n📞 WhatsApp: wa.me/918447859784\n📧 Email: support@eshopperr.me\n💬 Chat: Available 9 AM - 9 PM\n\n🙏 THANK YOU!\nFor choosing Eshopper Boutique Luxe\nYour satisfaction is our pride! 💎\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

            // Send both WhatsApp and Email in parallel
            const deliveredResults = await Promise.allSettled([
                sendWhatsApp(phone, whatsappMsg).then(() => {
                    console.log(`✅ Delivered WhatsApp sent for ${orderId}`);
                    return { type: 'WhatsApp', success: true };
                }),
                sendOrderStatusEmail({
                    toEmail: email,
                    userName: displayName,
                    orderId,
                    status: 'Delivered',
                    trackingLink,
                    estimatedDelivery,
                    totalAmount: finalAmount
                }).then(() => {
                    console.log(`✅ Delivered email sent for ${orderId}`);
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

const sendOrderStatusEmail = async ({ toEmail, userName, orderId, status, trackingLink, estimatedDelivery, totalAmount }) => {
    const BREVO_KEY = process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.trim() : null;
    if (!BREVO_KEY || !toEmail) return false;

    const displayName = userName || 'Valued Customer';
    const firstName = displayName.split(' ')[0];
    
    const statusConfig = {
        'Ordered': { emoji: '✅', color: '#28a745', bg1: '#d4edda', bg2: '#c3e6cb', msg: 'Order Confirmed! Payment received.' },
        'Packed': { emoji: '📦', color: '#0066cc', bg1: '#d1ecf1', bg2: '#bee5eb', msg: 'Packed & ready for shipment!' },
        'Shipped': { emoji: '🚚', color: '#ff6600', bg1: '#fff3cd', bg2: '#ffeaa7', msg: 'On the way to you!' },
        'Out for Delivery': { emoji: '🚗', color: '#ff9500', bg1: '#ffe0b2', bg2: '#ffcc80', msg: 'Out for delivery - arriving today!' },
        'Delivered': { emoji: '🎉', color: '#27ae60', bg1: '#d4edda', bg2: '#c3e6cb', msg: 'Successfully delivered!' }
    };
    
    const config = statusConfig[status] || { emoji: '📦', color: '#111827', bg1: '#f9fafb', bg2: '#f3f4f6', msg: status };
    const deliveryDate = estimatedDelivery ? new Date(estimatedDelivery).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { margin:0; padding:0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f5f5f5; }
        .container { max-width:600px; margin:0 auto; background:#fff; }
        .header { background:linear-gradient(135deg,#0f0f0f,#1a1a1a); padding:24px 18px; }
        .brand-table { width:100%; border-collapse:collapse; table-layout:fixed; }
        .brand-left { width:64px; text-align:left; vertical-align:middle; }
        .brand-center { text-align:center; vertical-align:middle; }
        .brand-spacer { width:64px; }
        .brand-badge { width:48px; height:48px; border-radius:12px; background:linear-gradient(135deg,#0a0a0a,#16213e); border:2px solid #d4af37; color:#ffd700; font-size:28px; font-weight:900; line-height:44px; text-align:center; overflow:hidden; }
        .brand-badge img { width:100%; height:100%; object-fit:contain; display:block; }
        .brand-title { font-size:30px; font-weight:900; color:#f9e7b2; letter-spacing:1px; margin:0; line-height:1.2; }
        .tagline { font-size:11px; color:#d4af37; font-weight:700; letter-spacing:2px; text-transform:uppercase; margin:8px 0 0 0; }
        .status-banner { background:linear-gradient(135deg,${config.bg1},${config.bg2}); padding:40px 24px; text-align:center; border-bottom:4px solid ${config.color}; }
        .emoji-large { font-size:72px; line-height:1; margin:0 0 16px 0; }
        .status-title { font-size:28px; font-weight:800; color:${config.color}; margin:0 0 8px 0; letter-spacing:0.5px; }
        .status-subtitle { font-size:14px; color:${config.color}; opacity:0.85; margin:0; }
        .content { padding:32px 24px; }
        .greeting { margin:0 0 28px 0; }
        .greeting h2 { margin:0 0 12px 0; font-size:24px; color:#111827; font-weight:700; }
        .greeting p { margin:0; color:#555; font-size:15px; line-height:1.6; }
        .cards { display:flex; gap:16px; flex-wrap:wrap; margin:0 0 28px 0; }
        .card { flex:1; min-width:200px; padding:20px; border-radius:12px; text-align:center; }
        .card-dark { background:linear-gradient(135deg,#111827,#1f2937); border:1px solid #333; }
        .card-colored { background:linear-gradient(135deg,${config.bg1},${config.bg2}); border:2px solid ${config.color}; }
        .card-label { font-size:11px; letter-spacing:1.5px; color:${config.color}; text-transform:uppercase; font-weight:700; margin:0 0 8px 0; }
        .card-value { font-size:20px; font-weight:900; color:#fff; margin:0; }
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
        .button { display:block; background:linear-gradient(135deg,#111827,#1f2937); color:#fff; padding:16px 32px; border-radius:12px; text-decoration:none; font-weight:700; text-align:center; font-size:15px; letter-spacing:0.5px; margin:0 0 12px 0; box-shadow:0 4px 12px rgba(0,0,0,0.3); }
        .button:hover { opacity:0.9; }
        .support-box { background:#f7e8a9; padding:30px 20px; border-radius:26px; border:4px solid #efb11f; text-align:center; margin:0 0 20px 0; }
        .support-emoji { font-size:56px; margin:0 0 10px 0; line-height:1; }
        .support-title { font-size:36px; font-weight:900; color:#7b340f; margin:0 0 10px 0; letter-spacing:0.1px; }
        .support-text { font-size:15px; color:#a34d12; margin:0 0 20px 0; line-height:1.5; }
        .support-links { display:flex; gap:14px; justify-content:center; flex-wrap:wrap; align-items:center; }
        .support-link { display:inline-flex; align-items:center; justify-content:center; min-width:160px; padding:11px 18px; border-radius:13px; text-decoration:none; font-weight:900; font-size:18px; letter-spacing:0.3px; text-transform:uppercase; }
        .link-email { background:#ffffff; color:#124ac1; border:2px solid #efb11f; }
        .link-whatsapp { background:#22c55e; color:#124ac1; border:2px solid #22c55e; }
        .footer { background:linear-gradient(135deg,#111827,#0f0f0f); padding:32px 24px; text-align:center; }
        .footer-logo { font-size:18px; font-weight:800; background:linear-gradient(135deg,#ffd700,#d4af37); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; margin:0 0 12px 0; }
        .footer-text { font-size:12px; color:#9ca3af; margin:0; }
        .footer-link { color:#d4af37; text-decoration:none; font-weight:600; }
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
            <table class="brand-table" role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                    <td class="brand-left">
                        <div class="brand-badge">
                            <img src="${BRAND_LOGO_EMAIL_URL}" alt="eShopper Logo" onerror="this.onerror=null;this.src='${BRAND_LOGO_FALLBACK_URL}'" />
                        </div>
                    </td>
                    <td class="brand-center">
                        <p class="brand-title">eShopper Boutique Luxe</p>
                        <p class="tagline">Order Status Update</p>
                    </td>
                    <td class="brand-spacer"></td>
                </tr>
            </table>
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
        await axios.post('https://api.brevo.com/v3/smtp/email', {
            sender: { name: 'Eshopper', email: 'support@eshopperr.me' },
            to: [{ email: toEmail, name: displayName }],
            subject: `${config.emoji} ${status} - Order ${orderId} | Eshopper Boutique`,
            htmlContent,
            replyTo: { email: 'support@eshopperr.me' }
        }, {
            headers: {
                'api-key': BREVO_KEY,
                'content-type': 'application/json',
                'accept': 'application/json'
            }
        });
        console.log(`✅ Status email sent: ${orderId} -> ${status}`);
        return true;
    } catch (error) {
        console.error('❌ Status email failed:', error.message);
        return false;
    }
};

// ==================== EMAIL #1: ORDER PLACED (IMMEDIATE NOTIFICATION) ====================
const sendOrderPlacedEmail = async ({ toEmail, userName, orderId, finalAmount, products, shippingAddress, invoiceBuffer }) => {
    const BREVO_KEY = process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.trim() : null;
    if (!BREVO_KEY) {
        console.error('❌ BREVO_API_KEY not configured');
        throw new Error('BREVO_API_KEY not configured');
    }
    if (!toEmail || !toEmail.includes('@')) {
        console.error('❌ Invalid email:', toEmail);
        throw new Error('Invalid toEmail address');
    }

    try {
        const firstName = (userName || 'Valued Customer').split(' ')[0];
        const safeProducts = Array.isArray(products) ? products : [];
        
        const productRows = safeProducts.slice(0, 3).map(p => `
            <tr>
                <td style="padding:12px; border-bottom:1px solid #333; vertical-align:top;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                            <td style="width:70px; padding-right:12px;">
                                ${p.pic ? `<img src="${p.pic}" alt="${p.name}" style="width:70px; height:70px; object-fit:cover; border-radius:8px; border:1px solid #444;" />` : `<div style="width:70px; height:70px; background:#1a1a1a; border-radius:8px; border:1px solid #444; display:flex; align-items:center; justify-content:center; font-size:28px;">📦</div>`}
                            </td>
                            <td style="vertical-align:top;">
                                <div style="font-weight:700; color:#fff; font-size:14px; margin:0 0 6px 0;">${p.name}</div>
                                <div style="font-size:12px; color:#999;">Qty: <strong>${p.qty || 1}</strong> | ₹${Number(p.price || 0).toLocaleString()}</div>
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
        body { font-family:sans-serif; background:#050505; color:#fff; }
        .header-bar { background:linear-gradient(135deg, #d4af37 0%, #ffd700 100%); padding:16px 0; text-align:center; }
        .header-text { color:#050505; font-size:13px; font-weight:900; letter-spacing:1.5px; text-transform:uppercase; }
        .container { max-width:600px; margin:0 auto; background:#0f0f0f; }
        .header { padding:32px 24px; text-align:center; background:linear-gradient(180deg, #1a1a1a 0%, #050505 100%); border-bottom:3px solid #d4af37; }
        .logo { width:45px; height:45px; margin:0 auto 16px; }
        .logo img { width:100%; height:auto; }
        .title { font-size:28px; font-weight:900; color:#d4af37; margin:0; letter-spacing:1px; text-transform:uppercase; }
        .subtitle { font-size:12px; color:#999; margin:8px 0 0 0; letter-spacing:1px; }
        .badge { display:inline-block; background:#d4af37; color:#050505; padding:8px 16px; border-radius:20px; font-size:11px; font-weight:900; margin-top:12px; }
        .content { padding:32px 24px; }
        .greeting-box { background:linear-gradient(135deg, #1a3a52, #0d2436); padding:20px; border-radius:12px; border-left:4px solid #d4af37; margin-bottom:30px; }
        .greeting { font-size:15px; color:#e5e7eb; line-height:1.6; margin:0; }
        .greeting strong { color:#d4af37; }
        .section-title { font-size:13px; font-weight:900; color:#d4af37; margin:0 0 16px 0; text-transform:uppercase; letter-spacing:1px; }
        .order-id-box { background:#1a1a1a; padding:20px; border-radius:12px; border:2px solid #d4af37; margin-bottom:30px; text-align:center; }
        .order-id-label { font-size:11px; color:#999; text-transform:uppercase; letter-spacing:1px; margin:0 0 8px 0; }
        .order-id { font-size:24px; font-weight:900; color:#d4af37; margin:0; letter-spacing:1px; }
        .order-date { font-size:12px; color:#666; margin:12px 0 0 0; }
        .product-table { width:100%; border-collapse:collapse; background:#1a1a1a; border-radius:8px; overflow:hidden; margin-bottom:30px; }
        .product-table td { color:#fff; }
        .product-table tr:last-child td { border-bottom:none; }
        .amount-box { background:#1a1a1a; padding:20px; border-radius:12px; border:1px solid #333; margin-bottom:30px; }
        .amount-row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #333; font-size:14px; }
        .amount-row:last-child { border-bottom:none; border-top:2px solid #d4af37; padding-top:14px; margin-top:8px; }
        .amount-label { color:#999; }
        .amount-value { color:#fff; font-weight:700; }
        .total-value { color:#d4af37; font-size:20px; font-weight:900; }
        .button { display:block; background:#d4af37; color:#050505; padding:14px 28px; border-radius:8px; text-decoration:none; font-weight:900; text-align:center; frequency:14px; margin:30px 0; transition:all 0.3s; }
        .button:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(212,175,55,0.4); }
        .footer { padding:30px 24px; text-align:center; border-top:1px solid #333; background:#050505; }
        .footer-text { font-size:12px; color:#666; margin:8px 0; }
        .footer-link { color:#d4af37; text-decoration:none; font-weight:700; }
        @media (max-width:600px) {
            .header { padding:24px 16px; }
            .content { padding:20px 16px; }
            .footer { padding:20px 16px; }
            .title { font-size:22px; }
            .greeting-box { padding:16px; }
            .product-table td { padding:10px 8px !important; font-size:13px; }
            .button { padding:12px 24px; font-size:13px; }
        }
    </style>
</head>
<body>
    <div class="header-bar">
        <p class="header-text">✨ ORDER RECEIVED ✨</p>
    </div>
    
    <div class="container">
        <div class="header">
            <div class="logo">
                <img src="${BRAND_LOGO_EMAIL_URL}" alt="eShopper" onerror="this.onerror=null;this.src='${BRAND_LOGO_FALLBACK_URL}'" />
            </div>
            <h1 class="title">We've Received Your Request!</h1>
            <p class="subtitle">Thank you for choosing eShopper Boutique Luxe</p>
            <span class="badge">📦 ORDER PLACED</span>
        </div>
        
        <div class="content">
            <div class="greeting-box">
                <p class="greeting">Hi <strong>${firstName}</strong>,</p>
                <p class="greeting" style="margin-top:8px;">We've received your order. Our premium team is now reviewing and processing your request. You'll receive a confirmation email shortly with full details.</p>
            </div>
            
            <p class="section-title">📋 Order Details</p>
            <div class="order-id-box">
                <p class="order-id-label">Your Order ID</p>
                <p class="order-id">${orderId}</p>
                <p class="order-date">Placed on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
            
            ${safeProducts.length > 0 ? `
            <p class="section-title">📦 Items in Your Order</p>
            <table class="product-table">
                <tbody>${productRows}</tbody>
            </table>
            ${safeProducts.length > 3 ? `<p style="font-size:12px; color:#999; margin:-20px 0 20px 0;">+ ${safeProducts.length - 3} more item(s)</p>` : ''}
            ` : ''}
            
            <p class="section-title">💰 Order Total</p>
            <div class="amount-box">
                <div class="amount-row">
                    <span class="amount-label">Total Amount</span>
                    <span class="amount-value total-value">₹ ${Number(finalAmount || 0).toLocaleString('en-IN')}</span>
                </div>
            </div>
            
            <a href="https://eshopperr.me/order-tracking/${orderId}" class="button">Track Your Order</a>
            
            <p style="font-size:13px; color:#666; text-align:center; margin-top:24px;">
                📧 Keep an eye on your inbox for the full order confirmation email.<br>
                <span style="display:block; margin-top:8px; font-size:11px;">Expected shortly...</span>
            </p>
        </div>
        
        <div class="footer">
            <p class="footer-text">eShopper Boutique Luxe</p>
            <p class="footer-text">Premium Fashion Destination</p>
            <p class="footer-text" style="margin-top:16px;">
                <a href="mailto:support@eshopperr.me" class="footer-link">📧 support@eshopperr.me</a>
            </p>
            <p class="footer-text" style="margin-top:8px; font-size:10px; color:#555;">
                This is an automated message. Please don't reply directly to this email.
            </p>
        </div>
    </div>
</body>
</html>`;

        const response = await axios.post('https://api.brevo.com/v3/smtp/email', {
            sender: { name: 'eShopper Boutique Luxe', email: 'support@eshopperr.me' },
            to: [{ email: toEmail, name: userName || 'Customer' }],
            subject: "We've received your request! 📦",
            htmlContent: htmlContent,
            replyTo: { email: 'support@eshopperr.me' },
            ...(invoiceBuffer && {
                attachment: [{
                    content: invoiceBuffer.toString('base64'),
                    name: `Order-${orderId}-Invoice.pdf`
                }]
            })
        }, {
            headers: {
                'api-key': BREVO_KEY,
                'content-type': 'application/json',
                'accept': 'application/json'
            },
            timeout: 15000
        });

        console.log(`✅ Order Placed email sent to ${toEmail} for ${orderId}`);
        return true;
    } catch (error) {
        console.error('❌ Order Placed email failed:', error.message);
        return false;
    }
};

// ==================== EMAIL #2: ORDER CONFIRMED (ULTRA-PREMIUM) ====================
const sendOrderConfirmationEmail = async ({ toEmail, userName, orderId, paymentMethod, finalAmount, shippingAddress, products, estimatedArrival, invoiceBase64, orderStatus = 'Ordered' }) => {
    const BREVO_KEY = process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.trim() : null;
    if (!BREVO_KEY) {
        console.error('❌ BREVO_API_KEY not configured');
        throw new Error('BREVO_API_KEY not configured');
    }
    if (!toEmail || !toEmail.includes('@')) {
        console.error('❌ Invalid email:', toEmail);
        throw new Error('Invalid toEmail address');
    }

    try {
        const displayName = userName || 'Valued Customer';
        const firstName = displayName.split(' ')[0];
        const safeProducts = Array.isArray(products) ? products : [];
        const deliveryDate = estimatedArrival ? new Date(estimatedArrival).toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A';
        const totalItems = safeProducts.reduce((sum, p) => sum + (p.qty || 1), 0);

        const productRows = safeProducts.slice(0, 5).map(p => `
            <tr>
                <td style="padding:16px; border-bottom:1px solid #333;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1A1A1A; border-radius:12px; overflow:hidden; box-sizing:border-box;">
                        <tr>
                            <td style="width:100px; padding:12px; vertical-align:top;">
                                ${p.pic ? `<img src="${p.pic}" alt="${p.name}" style="width:90px; height:90px; object-fit:cover; border-radius:12px; display:block; border:2px solid #333; box-sizing:border-box; height:auto; max-height:90px;" />` : `<div style="width:90px; height:90px; background:#2A2A2A; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:32px; border:2px solid #333; box-sizing:border-box;">📦</div>`}
                            </td>
                            <td style="padding:12px; vertical-align:top; box-sizing:border-box;">
                                <div style="font-weight:700; color:#fff; font-size:15px; margin:0 0 8px 0; line-height:1.4; font-family:sans-serif;">${p.name}</div>
                                <div style="font-size:13px; color:#999; margin:6px 0; font-family:sans-serif;">
                                    <span style="color:#999;">Qty:</span> <strong style="color:#fff;">${p.qty || 1}</strong>
                                    <span style="color:#666; margin:0 8px;">•</span>
                                    <span style="color:#999;">₹${Number(p.price || 0).toLocaleString()} each</span>
                                </div>
                                <div style="font-size:18px; color:#D4AF37; font-weight:900; margin-top:10px; font-family:sans-serif;">₹${Number(p.total || 0).toLocaleString()}</div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        `).join('');

        // Generate delivery date
        const deliveryDate = estimatedArrival ? new Date(estimatedArrival).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date(Date.now() + 5*24*60*60*1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

        const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Segoe UI',sans-serif; background:#050505; color:#fff; }
        .wrapper { max-width:600px; margin:0 auto; background:#050505; }
        .header { background:linear-gradient(135deg,#1a1a1a 0%,#050505 100%); padding:32px 24px; text-align:center; border-bottom:3px solid #d4af37; }
        .logo-box { margin-bottom:16px; }
        .logo-img { width:50px; height:50px; border:2px solid #d4af37; border-radius:12px; background:#fff; padding:6px; box-sizing:border-box; }
        .elite-title { font-size:32px; font-weight:900; color:#d4af37; margin:12px 0 8px 0; letter-spacing:2px; font-style:italic; }
        .verified-badge { display:inline-block; background:linear-gradient(135deg, #10b981 0%, #059669 100%); color:#fff; padding:6px 16px; border-radius:20px; font-size:11px; font-weight:900; letter-spacing:1px; margin-top:8px; }
        .timeline-section { padding:32px 24px; background:linear-gradient(180deg, #0f0f0f 0%, #050505 100%); position:relative; }
        .timeline-title { font-size:13px; font-weight:900; color:#d4af37; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:24px; }
        .timeline { position:relative; padding:0 24px; }
        .timeline-item { display:flex; margin-bottom:24px; position:relative; }
        .timeline-item:last-child { margin-bottom:0; }
        .timeline-item::before { content:''; position:absolute; left:8px; top:28px; width:2px; height:calc(100% + 24px); background:#d4af37; }
        .timeline-item:last-child::before { display:none; }
        .timeline-dot { width:20px; height:20px; background:#d4af37; border-radius:50%; position:relative; z-index:1; margin-right:16px; flex-shrink:0; }
        .timeline-dot.completed { box-shadow:0 0 12px rgba(212,175,55,0.6); }
        .timeline-content { padding-top:2px; }
        .timeline-label { font-weight:900; color:#d4af37; font-size:12px; text-transform:uppercase; margin-bottom:4px; }
        .timeline-status { font-size:13px; color:#999; }
        .products-section { padding:32px 24px; border-top:1px solid #333; }
        .section-title { font-size:13px; font-weight:900; color:#d4af37; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:20px; }
        .product-item { background:#1a1a1a; border:1px solid #333; border-radius:12px; padding:16px; margin-bottom:16px; display:flex; gap:16px; }
        .product-img { width:80px; height:80px; background:#2a2a2a; border-radius:8px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:28px; border:1px solid #444; overflow:hidden; }
        .product-img img { width:100%; height:100%; object-fit:cover; }
        .product-details { flex:1; }
        .product-name { font-weight:700; color:#fff; font-size:14px; margin-bottom:8px; }
        .product-badge { display:inline-block; background:rgba(212,175,55,0.1); border:1px solid #d4af37; color:#d4af37; padding:4px 8px; border-radius:6px; font-size:10px; font-weight:900; white-space:nowrap; }
        .product-price { font-size:16px; font-weight:900; color:#d4af37; margin-top:8px; }
        .delivery-card { background:linear-gradient(135deg, #065f46 0%, #047857 100%); padding:24px; border-radius:12px; border-left:4px solid #10b981; margin:32px 24px; }
        .delivery-label { font-size:11px; color:#a7f3d0; font-weight:900; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px; }
        .delivery-date { font-size:24px; font-weight:900; color:#fbbf24; margin-bottom:8px; }
        .delivery-text { font-size:13px; color:#d1fae5; }
        .concierge-section { padding:32px 24px; background:linear-gradient(135deg, #fff9e6 0%, #fff4d6 100%); border:2px solid #d4af37; border-radius:12px; margin:32px 24px; text-align:center; }
        .concierge-emoji { font-size:48px; margin-bottom:12px; }
        .concierge-title { font-size:22px; font-weight:900; color:#8b6914; margin-bottom:8px; }
        .concierge-text { font-size:13px; color:#9c6d1f; margin-bottom:20px; line-height:1.6; }
        .concierge-buttons { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
        .btn { display:inline-block; padding:12px 20px; border-radius:8px; text-decoration:none; font-weight:900; font-size:12px; text-transform:uppercase; border:none; cursor:pointer; transition:all 0.3s; }
        .btn-whatsapp { background:#22c55e; color:#fff; }
        .btn-whatsapp:hover { background:#16a34a; transform:translateY(-2px); }
        .btn-email { background:#fff; color:#8b6914; border:2px solid #d4af37; }
        .btn-email:hover { background:#fffbf0; }
        .amount-section { padding:32px 24px; border-top:1px solid #333; }
        .amount-box { background:#1a1a1a; padding:20px; border-radius:12px; border:1px solid #333; }
        .amount-row { display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid #333; font-size:14px; }
        .amount-row:last-child { border-bottom:none; border-top:2px solid #d4af37; padding-top:16px; margin-top:8px; }
        .amount-label { color:#999; }
        .amount-value { color:#fff; font-weight:700; }
        .total-row .amount-label { color:#d4af37; font-weight:900; text-transform:uppercase; font-size:13px; }
        .total-row .amount-value { color:#d4af37; font-size:24px; font-weight:900; }
        .trust-section { padding:32px 24px; background:rgba(212,175,55,0.05); border-top:1px solid #333; }
        .trust-items { display:flex; justify-content:space-around; gap:16px; flex-wrap:wrap; }
        .trust-item { text-align:center; flex:1; min-width:140px; }
        .trust-icon { font-size:28px; margin-bottom:8px; }
        .trust-text { font-size:11px; color:#999; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; }
        .footer { padding:32px 24px; text-align:center; background:#0a0a0a; border-top:1px solid #333; }
        .footer-brand { font-size:20px; font-weight:900; color:#d4af37; margin-bottom:12px; letter-spacing:1px; }
        .footer-links { margin-bottom:16px; font-size:11px; }
        .footer-links a { color:#d4af37; text-decoration:none; margin:0 8px; font-weight:700; }
        .footer-text { font-size:11px; color:#666; line-height:1.8; }
        @media (max-width:600px) {
            .wrapper { font-size:14px; }
            .header { padding:20px 16px; }
            .elite-title { font-size:24px; }
            .timeline { padding:0 16px; }
            .products-section, .delivery-card, .concierge-section, .amount-section, .trust-section, .footer { padding:24px 16px; }
            .product-item { flex-direction:column; }
            .product-img { width:100%; height:100px; }
            .concierge-buttons { flex-direction:column; }
            .btn { width:100%; }
            .trust-items { flex-direction:column; }
        }
    </style>
</head>
<body style="margin:0; padding:0; background:#050505;">
        <div class="wrapper">
            <!-- HEADER WITH LOGO -->
            <div class="header">
                <div class="logo-box">
                    <img src="${BRAND_LOGO_EMAIL_URL}" alt="eShopper" class="logo-img" onerror="this.onerror=null; this.src='${BRAND_LOGO_FALLBACK_URL}';" />
                </div>
                <div class="elite-title">✨ YOUR ORDER IS CONFIRMED ✨</div>
                <span class="verified-badge">✅ PAYMENT VERIFIED</span>
            </div>

            <!-- TIMELINE SECTION -->
            <div class="timeline-section">
                <div class="timeline-title">🚀 Order Journey</div>
                <div class="timeline">
                    <div class="timeline-item">
                        <div class="timeline-dot completed"></div>
                        <div class="timeline-content">
                            <div class="timeline-label">Payment Verified ✅</div>
                            <div class="timeline-status">Order is now securing placement</div>
                        </div>
                    </div>
                    <div class="timeline-item">
                        <div class="timeline-dot"></div>
                        <div class="timeline-content">
                            <div class="timeline-label">Quality Inspection ⏳</div>
                            <div class="timeline-status">Hand-selected & tested for perfection</div>
                        </div>
                    </div>
                    <div class="timeline-item">
                        <div class="timeline-dot"></div>
                        <div class="timeline-content">
                            <div class="timeline-label">Signature Packaging</div>
                            <div class="timeline-status">Premium wrapping & white-glove care</div>
                        </div>
                    </div>
                    <div class="timeline-item">
                        <div class="timeline-dot"></div>
                        <div class="timeline-content">
                            <div class="timeline-label">Elite Dispatch</div>
                            <div class="timeline-status">Shipping to your address</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ORDER INFO CARDS -->
            <div style="padding:24px; display:flex; gap:16px;">
                <div style="flex:1; background:linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding:20px; border-radius:12px; border:2px solid #a78bfa;">
                    <div style="font-size:11px; color:#fff; font-weight:900; text-transform:uppercase; margin-bottom:8px;">Order ID</div>
                    <div style="font-size:20px; font-weight:900; color:#fff; margin-bottom:4px;">${orderId.slice(-6)}</div>
                    <div style="font-size:11px; color:#e0e7ff;">${orderId}</div>
                </div>
                <div style="flex:1; background:linear-gradient(135deg, #10b981 0%, #059669 100%); padding:20px; border-radius:12px; border:2px solid #6ee7b7;">
                    <div style="font-size:11px; color:#fff; font-weight:900; text-transform:uppercase; margin-bottom:8px;">Est. Arrival</div>
                    <div style="font-size:18px; font-weight:900; color:#fbbf24;">${deliveryDate}</div>
                    <div style="font-size:11px; color:#d1fae5;">Free Premium Delivery</div>
                </div>
            </div>

            <!-- PRODUCTS SECTION -->
            <div class="products-section">
                <div class="section-title">📦 Your Selection</div>
                ${products.slice(0, 5).map((product, index) => {
                    const productName = product.title || product.name || 'Product';
                    const productPrice = product.price || 0;
                    const productImage = product.image || product.imageURL || '';
                    const quantity = product.qt || product.quantity || 1;
                    return `
                    <div class="product-item">
                        <div class="product-img">
                            ${productImage ? `<img src="${productImage}" alt="${productName}" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none';" />` : '📷'}
                        </div>
                        <div class="product-details">
                            <div class="product-name">${productName}</div>
                            <div class="product-badge">Hand-inspected for quality</div>
                            <div style="color:#999; font-size:12px; margin-top:8px;">Qty: ${quantity}</div>
                            <div class="product-price">₹${(productPrice * quantity).toLocaleString('en-IN')}</div>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>

            <!-- DELIVERY INSIGHT CARD -->
            <div class="delivery-card">
                <div class="delivery-label">🎁 Expected Arrival</div>
                <div class="delivery-date">${deliveryDate}</div>
                <div class="delivery-text">Your curated selection is being prepared with utmost care and will reach you soon</div>
            </div>

            <!-- PERSONAL CONCIERGE SECTION -->
            <div class="concierge-section">
                <div class="concierge-emoji">👑</div>
                <div class="concierge-title">Personal Concierge</div>
                <div class="concierge-text">Our dedicated team is here to assist with any questions about your order. Reach out anytime!</div>
                <div class="concierge-buttons">
                    <a href="https://wa.me/918447859784?text=Order%20${orderId}%20-%20I%20need%20help" class="btn btn-whatsapp">💬 WhatsApp Support</a>
                    <a href="mailto:support@eshopperr.me?subject=Order%20${orderId}" class="btn btn-email">📧 Email Us</a>
                </div>
            </div>

            <!-- AMOUNT BREAKDOWN -->
            <div class="amount-section">
                <div class="section-title">💰 Amount Breakdown</div>
                <div class="amount-box">
                    <div class="amount-row">
                        <div class="amount-label">Subtotal</div>
                        <div class="amount-value">₹${(finalAmount * 0.95).toLocaleString('en-IN')}</div>
                    </div>
                    <div class="amount-row">
                        <div class="amount-label">Shipping</div>
                        <div class="amount-value">FREE 🎁</div>
                    </div>
                    <div class="amount-row">
                        <div class="amount-label">Taxes</div>
                        <div class="amount-value">₹${(finalAmount * 0.05).toLocaleString('en-IN')}</div>
                    </div>
                    <div class="amount-row total-row">
                        <div class="amount-label total-label">Total Amount</div>
                        <div class="amount-value total-value">₹${finalAmount.toLocaleString('en-IN')}</div>
                    </div>
                </div>
            </div>

            <!-- PAYMENT INFO -->
            <div style="padding:24px; text-align:center; background:rgba(34,197,94,0.1); border-radius:12px; margin:0 24px 24px 24px; border:1px solid #22c55e;">
                <div style="font-size:12px; color:#22c55e; font-weight:900; text-transform:uppercase; margin-bottom:8px;">✅ Payment Method</div>
                <div style="font-size:16px; font-weight:900; color:#fff;">${paymentMethod || 'Secure Payment'}</div>
                <div style="font-size:12px; color:#a7f3d0; margin-top:8px;">Payment successfully processed & verified</div>
            </div>

            <!-- SHIPPING ADDRESS -->
            <div style="padding:24px; margin:0 24px 24px 24px;">
                <div class="section-title">📍 Shipping to</div>
                <div style="background:#1a1a1a; padding:16px; border-radius:12px; border:1px solid #333; line-height:1.8;">
                    <div style="font-weight:900; color:#fff; font-size:14px; margin-bottom:8px;">${shippingAddress.name || userName}</div>
                    <div style="font-size:13px; color:#999;">
                        <div>${shippingAddress.street || ''}</div>
                        <div>${shippingAddress.city || ''}, ${shippingAddress.state || ''} ${shippingAddress.zip || ''}</div>
                        <div style="margin-top:8px; padding-top:8px; border-top:1px dashed #333; color:#999; font-size:12px;">
                            📱 ${shippingAddress.phone || ''} 
                        </div>
                    </div>
                </div>
            </div>

            <!-- TRUST SECTION -->
            <div class="trust-section">
                <div class="trust-items">
                    <div class="trust-item">
                        <div class="trust-icon">🛡️</div>
                        <div class="trust-text">Authenticity Guaranteed</div>
                    </div>
                    <div class="trust-item">
                        <div class="trust-icon">↩️</div>
                        <div class="trust-text">Easy 7-Day Returns</div>
                    </div>
                    <div class="trust-item">
                        <div class="trust-icon">🚚</div>
                        <div class="trust-text">Free Premium Shipping</div>
                    </div>
                </div>
            </div>

            <!-- FOOTER -->
            <div class="footer">
                <div class="footer-brand">✨ eShopper ✨</div>
                <div class="footer-text">
                    Thank you for choosing eShopper. We're committed to delivering excellence.<br><br>
                    <strong>Need help?</strong> Reach us at <a href="mailto:support@eshopperr.me" style="color:#d4af37; text-decoration:none; font-weight:900;">support@eshopperr.me</a> or via WhatsApp
                </div>
            </div>
        </div>
    </body>
</html>`;

        const mailPayload = {
            sender: { name: 'Eshopper', email: 'support@eshopperr.me' },
            to: [{ email: toEmail, name: displayName }],
            subject: `✅ Order Confirmed - ${orderId} | Eshopper Boutique`,
            htmlContent,
            replyTo: { email: 'support@eshopperr.me' }
        };

        if (invoiceBase64 && typeof invoiceBase64 === 'string' && invoiceBase64.trim().length > 0 && /^[A-Za-z0-9+/=]+$/.test(invoiceBase64.trim())) {
            mailPayload.attachment = [{ content: invoiceBase64.trim(), name: `Invoice-${orderId}.pdf` }];
        }

        await axios.post('https://api.brevo.com/v3/smtp/email', mailPayload, {
            headers: { 'api-key': BREVO_KEY, 'content-type': 'application/json', 'accept': 'application/json' },
            timeout: 30000
        });

        console.log(`✅ Confirmation email sent to ${toEmail}`);
        return true;
    } catch (error) {
        console.error('❌ Confirmation email failed:', error.message);
        return false;
    }
};

// ============ FIREBASE AUTH SYNC ROUTE ============
app.post('/api/auth-sync', async (req, res) => {
    try {
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

app.post('/api/place-order', async (req, res) => {
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
                isDelivered: false  // Email #1: Order Receipt (not yet delivered)
            });
        } catch (invoiceError) {
            console.error('Invoice PDF generation failed:', invoiceError.message);
            if (process.env.SENTRY_DSN) Sentry.captureException(invoiceError);
        }

        const recipientEmail = String(user.email || addressPayload?.email || '').trim();

        // 📧 EMAIL #1: Send "Order Placed" email immediately
        try {
            await sendOrderPlacedEmail({
                toEmail: recipientEmail,
                userName: user.name,
                orderId,
                finalAmount: payable,
                products: cleanProducts,
                shippingAddress: addressPayload,
                invoiceBuffer: invoiceBuffer
            });
            console.log(`✅ Email #1 (Order Placed) sent for ${orderId}`);
        } catch (email1Error) {
            console.error('❌ Email #1 (Order Placed) failed:', email1Error.message);
            if (process.env.SENTRY_DSN) Sentry.captureException(email1Error);
        }

        // 📧 EMAIL #2: Send "Order Confirmed" ultra-premium email (will be sent when payment verifies)
        // This is prepared for later use when order status changes to confirmed
        try {
            // For now, we can send it after a short delay or trigger it from payment verification webhook
            // Uncommenting below will send both emails - adjust timing as needed
            // await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
            // await sendOrderConfirmationEmail({...});
        } catch (email2Error) {
            console.error('Email #2 (Order Confirmed) - Prepared but not sent yet');
        }

            try {
                if (recipientEmail && recipientEmail.includes('@')) {
                    await axios.post('https://api.brevo.com/v3/smtp/email', {
                        sender: { name: 'Eshopper', email: 'support@eshopperr.me' },
                        to: [{ email: recipientEmail, name: user.name || 'Customer' }],
                        subject: `✅ Order Confirmed - ${orderId} | Eshopper Boutique`,
                        htmlContent: `<div style="font-family:Arial,sans-serif;padding:20px;background:#f8f8f8;"><h2 style="color:#111;">Order Confirmed</h2><p>Hi ${user.name || 'Customer'}, your order <strong>${orderId}</strong> for <strong>₹${Number(payable || 0).toLocaleString('en-IN')}</strong> is confirmed.</p><p>Track: <a href="https://eshopperr.me/order-tracking/${orderId}">https://eshopperr.me/order-tracking/${orderId}</a></p></div>`,
                        replyTo: { email: 'support@eshopperr.me' }
                    }, {
                        headers: {
                            'api-key': process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.trim() : '',
                            'content-type': 'application/json',
                            'accept': 'application/json'
                        },
                        timeout: 15000
                    });
                    console.log(`✅ Fallback order email sent for ${orderId}`);
                }
            } catch (fallbackEmailError) {
                console.error(`⚠️ Fallback order email failed for ${orderId}:`, fallbackEmailError.message);
                if (process.env.SENTRY_DSN) Sentry.captureException(fallbackEmailError);
            }
        }

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
});

// ==================== TEST NOTIFICATION ENDPOINT ====================
app.post('/api/test-notification', async (req, res) => {
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
            // Check if order is delivered to determine which invoice to show
            const orderStatus = String(order.orderStatus || order.status || 'Ordered').trim().toLowerCase();
            const isDelivered = orderStatus === 'delivered';
            
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
                isDelivered: isDelivered  // Auto-detect: Receipt or Tax Invoice
            });

            clearTimeout(timeoutId);

            if (!pdfBuffer || pdfBuffer.length < 500) {
                return res.status(500).json({ message: 'Invoice generation failed - empty PDF' });
            }

            const fileName = isDelivered ? `TaxInvoice-${order.orderId}.pdf` : `Receipt-${order.orderId}.pdf`;
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
    try {
        const { orderId } = req.params;
        const userId = String(req.query.userId || '').trim();
        const pdfType = String(req.query.type || 'receipt').toLowerCase();

        if (!orderId || !userId) {
            return res.status(400).json({ message: 'orderId and userId are required' });
        }

        if (!['receipt', 'final'].includes(pdfType)) {
            return res.status(400).json({ message: 'Invalid PDF type. Use "receipt" or "final"' });
        }

        // Fetch order
        const order = await Order.findOne({ orderId, userid: userId }).lean();
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check order status
        const orderStatus = String(order.orderStatus || order.status || 'Ordered').trim().toLowerCase();
        const isDelivered = orderStatus === 'delivered';

        // Determine filename based on delivery status
        const fileName = isDelivered ? `TaxInvoice-${orderId}.pdf` : `Receipt-${orderId}.pdf`;

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
                isDelivered: isDelivered,  // Pass delivery status for footer customization
                pdfType: pdfType // 'receipt' or 'final'
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

        // 🔴 TRIGGER LUXURY NOTIFICATIONS (non-blocking via setImmediate)
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
                        finalAmount: order.finalAmount
                    });
                })
                .catch((lookupErr) => {
                    console.warn(`⚠️ User fallback lookup failed for ${order.orderId}:`, lookupErr.message);
                    return sendLuxeStatusNotification({
                        orderId: order.orderId,
                        status: normalized,
                        phone: order.shippingAddress?.phone || order.userPhone,
                        customerName: order.userName,
                        email: order.userEmail,
                        estimatedDelivery: order.estimatedArrival,
                        finalAmount: order.finalAmount
                    });
                })
                .catch(err => {
                    console.error(`⚠️  Background notification error: ${err.message}`);
                });
        });

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

        // Generate PDF invoice for Email #2
        let invoiceBase64 = null;
        try {
            const orderStatus = String(order.orderStatus || order.status || 'Ordered').trim().toLowerCase();
            const isDelivered = orderStatus === 'delivered';
            
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
                isDelivered: isDelivered  // Email #2: Receipt or Tax Invoice based on status
            });
            if (invoiceBuffer) {
                invoiceBase64 = invoiceBuffer.toString('base64');
            }
        } catch (pdfError) {
            console.error('❌ PDF generation for Email #2 failed:', pdfError.message);
        }

        // Send Email #2: Order Confirmed (Ultra-Premium)
        const emailSent = await sendOrderConfirmationEmail({
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
