// 🔴 LOAD ENV VARIABLES FIRST
require('dotenv').config();

// 🔴 SENTRY v10 - MUST INITIALIZE BEFORE REQUIRING EXPRESS/FRAMEWORKS
const Sentry = require('@sentry/node');
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'production',
        tracesSampleRate: 1.0,
        integrations: [Sentry.expressIntegration()],
    });
    console.log('✅ Sentry initialized');
}

// NOW REQUIRE EXPRESS AND OTHER FRAMEWORKS (after Sentry.init)
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
const { GoogleGenerativeAI } = require("@google/generative-ai");// 🔐 FIREBASE ADMIN SDK INITIALIZATION
const puppeteer = require('puppeteer');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

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

// 🔒 TRUST PROXY - MUST BE BEFORE CORS (fixes X-Forwarded-For errors from Railway/Cloudflare)
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
        if (process.env.SENTRY_DSN) Sentry.captureException(error);
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
                .head { padding: 40px 32px; background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #d4af37 100%); color: #fff; text-align: center; box-shadow: inset 0 0 30px rgba(212, 175, 55, 0.2); position: relative; overflow: hidden; }
                .head::before { content: ''; position: absolute; top: -50%; right: -50%; width: 400px; height: 400px; background: radial-gradient(circle, rgba(212,175,55,0.15), transparent); border-radius: 50%; }
                .head-content { position: relative; z-index: 1; }
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
                th { background: linear-gradient(135deg, #0f0f0f, #1a1a1a); color: #ffd700; font-size: 11px; letter-spacing: 1.2px; padding: 14px 12px; text-transform: uppercase; font-weight: 700; text-align: left; border: 2px solid #d4af37; }
                td { border: 1px solid #e8dcc8; padding: 13px 12px; font-size: 13px; color: #2c2c2c; }
                tr:nth-child(odd) { background: #fafaf8; }
                tr:hover { background: #f5f0e6; }
                .totals-section { margin: 32px 0; }
                .totals { border: 3px solid #d4af37; border-radius: 14px; padding: 24px 28px; background: linear-gradient(135deg, #fffef8 0%, #fff9e6 100%); box-shadow: 0 4px 16px rgba(212,175,55,0.1); }
                .totals-row { display: grid; grid-template-columns: auto 1fr auto; gap: 20px; align-items: center; padding: 12px 0; border-bottom: 1px solid #e8dcc8; }
                .totals-row:last-child { border-bottom: none; }
                .totals-label { font-weight: 600; color: #0f0f0f; font-size: 14px; }
                .totals-value { text-align: right; font-weight: 700; color: #0f0f0f; font-size: 15px; }
                .final-row { background: linear-gradient(135deg, #d4af37 0%, #8b7521 100%); color: #fff; padding: 18px 24px !important; border-radius: 10px; margin-top: 12px; display: grid; grid-template-columns: auto 1fr auto; gap: 20px; border: none !important; }
                .final-label { font-weight: 700; font-size: 16px; }
                .final-value { text-align: right; font-size: 28px; font-weight: 800; letter-spacing: 0.5px; }
                .address-section { margin: 32px 0; }
                .ship { border: 2px solid #d4af37; border-radius: 12px; padding: 20px 24px; background: linear-gradient(135deg, #fffef8 0%, #fff9e6 100%); font-size: 13px; line-height: 1.8; color: #2c2c2c; box-shadow: 0 2px 8px rgba(212,175,55,0.1); }
                .ship-title { font-weight: 700; color: #0f0f0f; margin-bottom: 14px; font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; }
                .ship-addr { font-size: 13px; color: #0f0f0f; line-height: 1.8; }
                .footer { margin-top: 32px; padding-top: 20px; border-top: 2px solid #e8dcc8; }
                .foot { font-size: 12px; color: #666; text-align: center; line-height: 1.8; }
                .foot-premium { color: #d4af37; font-weight: 700; margin-top: 14px; font-size: 13px; letter-spacing: 1px; }
                @media (max-width: 768px) {
                    .wrap { padding: 12px; }
                    .head { padding: 28px 20px; }
                    .body { padding: 24px; }
                    .brand-name { font-size: 40px; letter-spacing: 2px; }
                    .logo-icon { font-size: 48px; }
                    .title { font-size: 24px; }
                    .meta { grid-template-columns: repeat(2, 1fr); gap: 12px; }
                    .box { padding: 12px 14px; }
                    .k { font-size: 9px; }
                    .v { font-size: 13px; }
                    th, td { padding: 10px 8px; font-size: 12px; }
                    .final-row { grid-template-columns: auto 1fr auto; }
                    .final-value { font-size: 22px; }
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
                    .final-value { font-size: 18px; }
                }
            </style>
        </head>
        <body>
            <div class="wrap">
                <div class="card">
                    <!-- PREMIUM HEADER -->
                    <div class="head">
                        <div class="head-content">
                            <div class="logo-section">
                                <img src="https://eshopperr.me/assets/eshopper-logo-horizontal.svg" alt="eShopper Boutique Luxe" style="height:80px; margin-bottom:12px; display:block; margin-left:auto; margin-right:auto;" />
                            </div>
                            <div class="tag-badge">🏆 Premium Invoice</div>
                        </div>
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

                        <!-- TOTALS SECTION -->
                        <div class="totals-section">
                            <div class="totals">
                                <div class="totals-row">
                                    <span class="totals-label">Subtotal</span>
                                    <span></span>
                                    <span class="totals-value">₹${subtotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                </div>
                                <div class="totals-row">
                                    <span class="totals-label">Shipping</span>
                                    <span></span>
                                    <span class="totals-value">${shipping <= 0 ? '🎁 FREE' : `₹${shipping.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}</span>
                                </div>
                                <div class="totals-row">
                                    <span class="totals-label">Taxes & Fees</span>
                                    <span></span>
                                    <span class="totals-value">Included</span>
                                </div>
                                <div class="final-row">
                                    <span class="final-label">💰 Total Payable</span>
                                    <span></span>
                                    <span class="final-value">₹${payable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                </div>
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
    const html = buildInvoiceHtml(orderPayload);
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
        
        // Wait for any animations/fonts to load
        await page.waitForTimeout(2000);
        
        // Generate PDF
        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '16mm', right: '12mm', bottom: '16mm', left: '12mm' },
            timeout: 60000
        });

        // Validate PDF
        if (!pdf || !Buffer.isBuffer(pdf) || pdf.length < 500) {
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
        throw new Error(`Invalid phone number format. Expected 91XXXXXXXXXX, got: ${contactNumber}`);
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

    try {
        const endpoint = `${apiUrl}/message/sendMedia/${instance}`;
        const mediaCaption = String(caption).trim();

        const payloadFormats = [
            {
                number: contactNumber,
                mediatype: 'image',
                media: mediaUrl,
                caption: mediaCaption,
                fileName: `eshopper-order-${Date.now()}.png`
            },
            {
                number: contactNumber,
                mediatype: 'image',
                media: mediaUrl,
                text: mediaCaption
            },
            {
                to: contactNumber,
                mediatype: 'image',
                media: mediaUrl,
                caption: mediaCaption
            }
        ];

        console.log(`📸 Sending WhatsApp Media to: ${contactNumber}`);
        console.log(`   Endpoint: ${endpoint}`);
        console.log(`   Media: ${mediaUrl}`);
        console.log(`   Caption: ${mediaCaption.substring(0, 80)}...`);

        let lastError;

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
                console.warn(`⚠️ sendMedia attempt ${i + 1} failed:`, err.response?.status || err.message);

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

        throw lastError || new Error('All sendMedia payload attempts failed');
    } catch (error) {
        console.error('❌ WhatsApp media send failed:', {
            status: error.response?.status,
            message: error.response?.data?.message || error.message,
            endpoint: error.config?.url
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
            // 📦 PACKED: Text + Email
            const whatsappMsg = `📦 YOUR ORDER IS BEAUTIFULLY PACKED! ✨\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nHi ${firstName},\nYour premium selection is now expertly packed!\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Order: #${orderId}\n📍 Status: Packed & Ready to Ship\n💎 Quality Check: Completed\n🎁 Premium Packaging: Applied\n\n📅 NEXT STEPS:\n→ Your order will ship out within 24 hours\n→ You'll receive a tracking update shortly\n→ Expected delivery by: ${estimatedDelivery ? new Date(estimatedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Soon'}\n\n🔗 TRACK NOW: ${trackingLink}\n\n💬 Questions? Reply to this message\n📞 Call: 8447859784\n\n🙏 Thank you for choosing Eshopper Boutique! 💎`;
            
            try {
                await sendWhatsApp(phone, whatsappMsg);
                console.log(`✅ Packed WhatsApp sent for ${orderId}`);
            } catch (waErr) {
                if (isExpectedWhatsAppError(waErr)) {
                    console.warn(`⚠️  Packed WhatsApp skipped (expected):`, waErr.message);
                } else {
                    console.error(`⚠️  Packed WhatsApp failed (non-critical):`, waErr.message);
                    if (process.env.SENTRY_DSN) Sentry.captureException(waErr);
                }
            }

            // Send packed email
            try {
                await sendOrderStatusEmail({
                    toEmail: email,
                    userName: displayName,
                    orderId,
                    status: 'Packed',
                    trackingLink,
                    estimatedDelivery,
                    totalAmount: finalAmount
                });
                console.log(`✅ Packed email sent for ${orderId}`);
            } catch (emailErr) {
                console.error(`⚠️  Packed email failed (non-critical):`, emailErr.message);
                if (process.env.SENTRY_DSN) Sentry.captureException(emailErr);
            }
        }

        else if (status === 'Shipped') {
            // 🚚 SHIPPED: Media + Email (White-Glove experience)
            const mediaUrl = 'https://res.cloudinary.com/dtfvoxw1p/image/upload/v1724068341/order_success_lux.png';
            const deliveryDate = estimatedDelivery ? new Date(estimatedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Soon';
            const caption = `🚚 YOUR ORDER IS ON THE WAY! 📍✨\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nHi ${firstName},\nYour premium selection is shipping!\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Order: #${orderId}\n📍 Status: Out for Premium Delivery\n🚚 Shipping: Fast & Secure\n📦 Order Value: ₹${Number(finalAmount || 0).toLocaleString('en-IN')}\n\n📅 DELIVERY WINDOW:\n📍 Expected Arrival: ${deliveryDate}\n⏰ Delivery Time: 9 AM - 6 PM\n\n🎯 WHAT TO EXPECT:\n✓ Professional White-Glove delivery\n✓ Careful handling of your selection\n✓ Real-time location tracking\n✓ Safe placement at your doorstep\n\n🔗 LIVE TRACKING: ${trackingLink}\n\n💡 PRO TIP:\n→ Ensure someone is available for delivery\n→ Keep door accessible\n→ Contact us if you need delivery rescheduling\n\n📞 DELIVERY SUPPORT:\n• WhatsApp: wa.me/918447859784\n• Call: 8447859784\n• Email: support@eshopperr.me\n\n💎 Thank you for your business!\nEshopper Boutique Luxe\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

            try {
                await sendWhatsAppMedia(phone, mediaUrl, caption);
                console.log(`✅ Shipped WhatsApp media sent for ${orderId}`);
            } catch (waErr) {
                if (isExpectedWhatsAppError(waErr)) {
                    console.warn(`⚠️  Shipped WhatsApp skipped (expected):`, waErr.message);
                } else {
                    console.error(`⚠️  Shipped WhatsApp media failed (non-critical):`, waErr.message);
                    if (process.env.SENTRY_DSN) Sentry.captureException(waErr);
                }
            }

            // Send shipped email
            try {
                await sendOrderStatusEmail({
                    toEmail: email,
                    userName: displayName,
                    orderId,
                    status: 'Shipped',
                    trackingLink,
                    estimatedDelivery,
                    totalAmount: finalAmount
                });
                console.log(`✅ Shipped email sent for ${orderId}`);
            } catch (emailErr) {
                console.error(`⚠️  Shipped email failed (non-critical):`, emailErr.message);
                if (process.env.SENTRY_DSN) Sentry.captureException(emailErr);
            }
        }

        else if (status === 'Delivered') {
            // 🎉 DELIVERED: Celebration message
            const whatsappMsg = `🎉 ORDER DELIVERED! 💎✨\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nCongratulations, ${firstName}!\nYour premium selection has arrived!\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Order: #${orderId}\n✅ Status: Successfully Delivered\n✅ Order Value: ₹${Number(finalAmount || 0).toLocaleString('en-IN')}\n✅ Delivery Quality: Premium Packaging ✓\n\n🎁 WHAT YOU RECEIVED:\nYour beautifully packaged selection!\n(Check all items are in perfect condition)\n\n⭐ YOUR EXPERIENCE MATTERS!\nPlease share your feedback:\n→ Rate this product\n→ Write a review\n→ Tag us on social media\n\n🔗 PURCHASE LINK: ${trackingLink}\n\n📝 NEXT STEPS:\n✓ Inspect items for quality\n✓ Check packaging condition\n✓ Contact us for any issues\n✓ Share your experience\n\n💰 LOYALTY BONUS:\nGet 5% off on your next purchase!\nUse code at checkout: ESTHANKYOU5\n\n🌟 EXPLORE MORE:\nVisit our collection: https://eshopperr.me\nShop seasonal curations\nDiscover new premium items\n\n❓ SUPPORT:\n📞 WhatsApp: wa.me/918447859784\n📧 Email: support@eshopperr.me\n💬 Chat: Available 9 AM - 9 PM\n\n🙏 THANK YOU!\nFor choosing Eshopper Boutique Luxe\nYour satisfaction is our pride! 💎\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

            try {
                await sendWhatsApp(phone, whatsappMsg);
                console.log(`✅ Delivered WhatsApp sent for ${orderId}`);
            } catch (waErr) {
                if (isExpectedWhatsAppError(waErr)) {
                    console.warn(`⚠️  Delivered WhatsApp skipped (expected):`, waErr.message);
                } else {
                    console.error(`⚠️  Delivered WhatsApp failed (non-critical):`, waErr.message);
                    if (process.env.SENTRY_DSN) Sentry.captureException(waErr);
                }
            }

            // Send delivery celebration email
            try {
                await sendOrderStatusEmail({
                    toEmail: email,
                    userName: displayName,
                    orderId,
                    status: 'Delivered',
                    trackingLink,
                    estimatedDelivery,
                    totalAmount: finalAmount
                });
                console.log(`✅ Delivered email sent for ${orderId}`);
            } catch (emailErr) {
                console.error(`⚠️  Delivered email failed (non-critical):`, emailErr.message);
                if (process.env.SENTRY_DSN) Sentry.captureException(emailErr);
            }
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
        .header { background:linear-gradient(135deg,#0f0f0f,#1a1a1a); padding:40px 24px; text-align:center; }
        .logo { font-size:32px; font-weight:900; background:linear-gradient(135deg,#ffd700,#d4af37); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; letter-spacing:2px; margin:0; }
        .tagline { font-size:12px; color:#d4af37; font-weight:700; letter-spacing:3px; text-transform:uppercase; margin:8px 0 0 0; }
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
        .support-box { background:linear-gradient(135deg,#fef3c7,#fde68a); padding:24px; border-radius:12px; border:2px solid #fbbf24; text-align:center; margin:0 0 20px 0; }
        .support-emoji { font-size:32px; margin:0 0 12px 0; }
        .support-title { font-size:16px; font-weight:800; color:#78350f; margin:0 0 8px 0; }
        .support-text { font-size:13px; color:#92400e; margin:0 0 16px 0; }
        .support-links { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
        .support-link { display:inline-block; padding:10px 18px; border-radius:8px; text-decoration:none; font-weight:700; font-size:13px; }
        .link-email { background:#fff; color:#78350f; border:2px solid #fbbf24; }
        .link-whatsapp { background:#25D366; color:#fff; }
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
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <img src="https://eshopperr.me/assets/eshopper-logo-horizontal.svg" alt="eShopper Boutique Luxe" style="height:60px; margin-bottom:12px; display:block; margin-left:auto; margin-right:auto;" />
            <p class="tagline">Order Status Update</p>
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
                <div class="support-title">Need Help?</div>
                <div class="support-text">Our 24/7 Premium Support Team is Here for You</div>
                <div class="support-links">
                    <a href="mailto:support@eshopperr.me" class="support-link link-email">📧 Email Support</a>
                    <a href="https://wa.me/918447859784?text=Hi%20I%20need%20help%20with%20order%20${orderId}" class="support-link link-whatsapp">💬 WhatsApp Us</a>
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
                <td style="padding:20px 24px; border-bottom:1px solid #e5e7eb; background:#f9fafb;">
                    <div style="display:flex; align-items:flex-start; gap:24px;">
                        <div style="flex-shrink:0; padding:8px; background:#fff; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                            ${p.pic ? `<img src="${p.pic}" alt="${p.name}" style="width:90px; height:90px; object-fit:cover; border-radius:8px; border:2px solid #e5e7eb; box-shadow:0 2px 6px rgba(0,0,0,0.05); display:block;" />` : `<div style="width:90px; height:90px; background:linear-gradient(135deg,#e5e7eb,#d1d5db); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:36px; border:2px solid #d1d5db;">📦</div>`}
                        </div>
                        <div style="flex:1; padding:4px 0;">
                            <div style="font-weight:800; color:#111827; font-size:16px; margin:0 0 8px 0; line-height:1.4;">${p.name}</div>
                            <div style="font-size:13px; color:#6b7280; margin:8px 0; display:flex; gap:12px; align-items:center; background:#fff; padding:8px 12px; border-radius:6px; display:inline-flex;">
                                <span style="display:flex; align-items:center; gap:4px;"><span style="color:#9ca3af;">Qty:</span> <strong style="color:#111827;">${p.qty || 1}</strong></span>
                                <span style="color:#e5e7eb;">•</span>
                                <span style="color:#6b7280;">₹${Number(p.price || 0).toLocaleString()} each</span>
                            </div>
                            <div style="font-size:16px; color:#fff; font-weight:800; margin-top:12px; display:inline-block; background:linear-gradient(135deg,#ffd700,#d4af37); padding:8px 16px; border-radius:8px; box-shadow:0 4px 12px rgba(212,175,55,0.3);">₹${Number(p.total || 0).toLocaleString()}</div>
                        </div>
                    </div>
                </td>
            </tr>
        `).join('');

        const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        @keyframes slideIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity:1; } 50% { opacity:0.5; } }
        @keyframes gradientShift { 0%, 100% { background-position:0% 50%; } 50% { background-position:100% 50%; } }
        @keyframes colorShift { 0% { filter:hue-rotate(0deg) brightness(1); } 25% { filter:hue-rotate(15deg) brightness(1.2); } 50% { filter:hue-rotate(30deg) brightness(1.1); } 75% { filter:hue-rotate(15deg) brightness(1.2); } 100% { filter:hue-rotate(0deg) brightness(1); } }
        @keyframes glow { 0%, 100% { text-shadow:0 0 20px rgba(255,215,0,0.6), 0 0 40px rgba(255,215,0,0.4), 0 0 60px rgba(212,175,55,0.3); } 50% { text-shadow:0 0 30px rgba(255,215,0,0.8), 0 0 60px rgba(255,215,0,0.6), 0 0 90px rgba(212,175,55,0.5); } }
        @keyframes sparkle { 0%, 100% { opacity:1; transform:scale(1) rotate(0deg); } 25% { opacity:0.8; transform:scale(1.1) rotate(5deg); } 50% { opacity:1; transform:scale(1.15) rotate(-5deg); } 75% { opacity:0.9; transform:scale(1.05) rotate(3deg); } }
        body { margin:0; padding:0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto Mono', Roboto, sans-serif; background:#f3f4f6; }
        .container { max-width:650px; margin:0 auto; background:#fff; box-shadow:0 10px 30px rgba(0,0,0,0.15); }
        .header { background:linear-gradient(135deg,#0f0f10,#1a1a2e,#16213e); padding:48px 24px; text-align:center; position:relative; overflow:hidden; }
        .header::before { content:''; position:absolute; top:-50%; right:-10%; width:300px; height:300px; background:radial-gradient(circle, rgba(255,215,0,0.2), transparent); border-radius:50%; animation:pulse 4s ease-in-out infinite; }
        .logo { font-size:52px; font-weight:900; background:linear-gradient(135deg,#ffd700 0%, #ffed4e 25%, #ff6b6b 50%, #4ecdc4 75%, #d4af37 100%); background-size:200% 200%; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; letter-spacing:4px; margin:0; position:relative; z-index:1; animation:colorShift 4s ease-in-out infinite, glow 2s ease-in-out infinite, pulse 3s ease-in-out infinite; text-shadow:0 0 40px rgba(255,215,0,0.8); display:inline-block; }
        .logo::before { content:'✨'; position:absolute; left:-40px; top:50%; transform:translateY(-50%); font-size:32px; animation:sparkle 2s ease-in-out infinite; }
        .logo::after { content:'✨'; position:absolute; right:-40px; top:50%; transform:translateY(-50%); font-size:32px; animation:sparkle 2s ease-in-out infinite 1s; }
        .tagline { font-size:12px; color:#d4af37; font-weight:700; letter-spacing:4px; text-transform:uppercase; margin:12px 0 0 0; position:relative; z-index:1; }
        .success-banner { background:linear-gradient(135deg,#d4edda 0%,#c3e6cb 100%); padding:48px 24px; text-align:center; border-bottom:5px solid #28a745; position:relative; overflow:hidden; }
        .success-banner::after { content:''; position:absolute; top:-50%; right:-10%; width:400px; height:400px; background:rgba(40,167,69,0.1); border-radius:50%; }
        .emoji-xl { font-size:80px; line-height:1; margin:0 0 16px 0; animation:pulse 2s infinite; }
        .title { font-size:36px; font-weight:900; color:#155724; margin:0 0 8px 0; letter-spacing:1px; position:relative; z-index:1; }
        .subtitle { font-size:16px; color:#155724; margin:0 0 16px 0; line-height:1.5; }
        .badge { display:inline-block; background:linear-gradient(135deg,#28a745,#20c997); color:#fff; padding:10px 28px; border-radius:25px; font-size:12px; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; box-shadow:0 4px 15px rgba(40,167,69,0.3); }
        .content { padding:40px 24px; }
        .greeting { margin:0 0 32px 0; padding:20px; background:linear-gradient(135deg,#f0f9ff,#e0f2fe); border-radius:12px; border-left:5px solid #0284c7; }
        .greeting-text { font-size:16px; color:#333; margin:0; line-height:1.6; }
        .greeting-bold { font-weight:800; color:#0f0f10; }
        .section-title { font-size:18px; font-weight:900; color:#0f0f10; margin:0 0 20px 0; display:flex; align-items:center; gap:10px; text-transform:uppercase; letter-spacing:1px; }

        .cards-row { display:flex; gap:32px; margin:0 0 40px 0; flex-wrap:wrap; }
        .card-order { flex:1; min-width:240px; padding:32px; background:linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95); border-radius:20px; border:3px solid #6366f1; position:relative; overflow:hidden; box-shadow:0 8px 32px rgba(99,102,241,0.3); transition:all 0.3s ease; }
        .card-order:hover { transform:translateY(-4px); box-shadow:0 12px 40px rgba(99,102,241,0.4); }
        .card-order::before { content:''; position:absolute; top:-60%; right:-40%; width:250px; height:250px; background:radial-gradient(circle, rgba(168,85,247,0.2), transparent); border-radius:50%; animation:pulse 3s ease-in-out infinite; }
        .card-delivery { flex:1; min-width:240px; padding:32px; background:linear-gradient(135deg,#064e3b,#065f46,#047857); border-radius:20px; border:3px solid #10b981; position:relative; overflow:hidden; box-shadow:0 8px 32px rgba(16,185,129,0.3); transition:all 0.3s ease; }
        .card-delivery:hover { transform:translateY(-4px); box-shadow:0 12px 40px rgba(16,185,129,0.4); }
        .card-delivery::before { content:''; position:absolute; top:-60%; right:-40%; width:250px; height:250px; background:radial-gradient(circle, rgba(52,211,153,0.2), transparent); border-radius:50%; animation:pulse 3s ease-in-out infinite; }
        .card-label-lg { font-size:13px; color:#fbbf24; font-weight:900; letter-spacing:1.5px; text-transform:uppercase; margin:0 0 16px 0; position:relative; z-index:1; text-shadow:0 2px 8px rgba(251,191,36,0.3); }
        .card-value-lg { font-size:32px; font-weight:900; color:#fff; margin:0 0 12px 0; position:relative; z-index:1; letter-spacing:-0.5px; text-shadow:0 4px 12px rgba(0,0,0,0.3); }
        .card-sub-lg { font-size:14px; color:#e5e7eb; margin:0; position:relative; z-index:1; font-weight:500; opacity:0.9; }
        .product-section { margin:0 0 40px 0; }
        .product-table { width:100%; border-collapse:collapse; background:#fff; overflow:hidden; }
        .product-table tr:last-child td { border-bottom:none; }
        .amount-section { margin:0 0 40px 0; }
        .amount-box { background:linear-gradient(135deg,#f9fafb,#f3f4f6); padding:28px; border-radius:16px; border:2px dashed #d1d5db; }
        .amount-row { display:flex; justify-content:space-between; align-items:center; padding:14px 0; border-bottom:1px dashed #e5e7eb; }
        .amount-row:last-child { border-bottom:3px solid #0f0f10; padding-top:16px; }
        .amount-label { color:#6b7280; font-size:14px; font-weight:600; }
        .amount-value { font-weight:700; font-size:16px; color:#374151; }
        .total-row { padding:20px 0 0 0 !important; }
        .total-label { font-weight:800; font-size:16px; color:#0f0f10; text-transform:uppercase; }
        .total-value { font-size:28px; font-weight:900; background:linear-gradient(135deg,#ffd700,#d4af37); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
        .payment-section { margin:0 0 40px 0; }
        .payment-box { padding:24px; background:linear-gradient(135deg,#f0fdf4,#dcfce7); border-radius:16px; border:3px solid #22c55e; position:relative; overflow:hidden; }
        .payment-box::before { content:''; position:absolute; top:-50%; right:-10%; width:300px; height:300px; background:rgba(34,197,94,0.1); border-radius:50%; }
        .payment-label { font-size:12px; color:#166534; font-weight:800; letter-spacing:1px; text-transform:uppercase; margin:0 0 12px 0; }
        .payment-method { font-size:18px; font-weight:900; color:#15803d; margin:0; display:flex; align-items:center; gap:8px; position:relative; z-index:1; }
        .payment-detail { font-size:13px; color:#166534; margin:12px 0 0 0; display:flex; align-items:center; gap:6px; }
        .address-section { margin:0 0 40px 0; }
        .address-box { padding:24px; background:#f9fafb; border-radius:16px; border:2px solid #e5e7eb; position:relative; }
        .address-line { font-size:14px; color:#374151; line-height:1.8; margin:0; }
        .address-name { font-weight:800; font-size:15px; color:#0f0f10; margin:0 0 12px 0; }
        .address-phone { margin-top:12px; padding-top:12px; border-top:1px dashed #d1d5db; font-size:13px; color:#6b7280; }
        .button-primary { display:block; background:linear-gradient(135deg,#111827,#0f0f10); color:#fff; padding:18px 32px; border-radius:12px; text-decoration:none; font-weight:800; text-align:center; font-size:15px; letter-spacing:1px; margin:0 0 16px 0; box-shadow:0 6px 20px rgba(0,0,0,0.3); transition:all 0.3s ease; }
        .button-primary:hover { transform:translateY(-3px); box-shadow:0 8px 25px rgba(0,0,0,0.4); }
        .support-section { margin:0 0 40px 0; padding:32px 24px; background:linear-gradient(135deg,#fef3c7,#fde68a); border-radius:20px; border:4px solid #fbbf24; text-align:center; position:relative; overflow:hidden; display:flex; flex-direction:column; align-items:center; justify-content:center; }
        .support-section::before { content:''; position:absolute; top:-50%; right:-10%; width:400px; height:400px; background:rgba(251,191,36,0.15); border-radius:50%; }
        .support-emoji { font-size:48px; margin:0 0 16px 0; animation:slideIn 0.6s ease-out, pulse-glow 2s ease-in-out infinite; position:relative; z-index:1; line-height:1; }
        .support-title { font-size:20px; font-weight:900; color:#78350f; margin:0 0 10px 0; position:relative; z-index:1; letter-spacing:0.5px; }
        .support-text { font-size:13px; color:#92400e; margin:0 0 20px 0; line-height:1.6; position:relative; z-index:1; max-width:400px; }
        .support-links { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; position:relative; z-index:1; align-items:center; width:100%; }
        .support-btn { padding:10px 20px; border-radius:10px; text-decoration:none; font-weight:800; font-size:12px; display:inline-flex; align-items:center; justify-content:center; gap:6px; transition:all 0.3s ease; letter-spacing:0.5px; box-shadow:0 4px 12px rgba(0,0,0,0.1); text-transform:uppercase; white-space:nowrap; }
        .btn-email { background:#fff; color:#78350f; border:2px solid #fbbf24; box-shadow:0 4px 12px rgba(251,191,36,0.2); }
        .btn-email:hover { transform:translateY(-2px) scale(1.03); box-shadow:0 6px 16px rgba(251,191,36,0.35); background:#fffbf0; }
        .btn-whatsapp { background:linear-gradient(135deg,#25D366,#1db854); color:#fff; border:2px solid #1db854; box-shadow:0 4px 12px rgba(37,211,102,0.2); }
        .btn-whatsapp:hover { transform:translateY(-2px) scale(1.03); box-shadow:0 6px 16px rgba(37,211,102,0.35); }
        .footer { background:linear-gradient(135deg,#0f0f10,#1a1a2e); padding:48px 24px; text-align:center; border-top:3px solid #d4af37; position:relative; overflow:hidden; }
        .footer::before { content:''; position:absolute; top:-50%; left:50%; transform:translateX(-50%); width:400px; height:400px; background:radial-gradient(circle, rgba(255,215,0,0.15), transparent); border-radius:50%; animation:pulse 5s ease-in-out infinite; }
        .footer-eshop { font-size:32px; font-weight:900; background:linear-gradient(135deg,#ffd700 0%, #ffed4e 25%, #ff6b6b 50%, #4ecdc4 75%, #d4af37 100%); background-size:200% 200%; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; margin:0 0 16px 0; letter-spacing:3px; position:relative; z-index:1; animation:colorShift 4s ease-in-out infinite, glow 2s ease-in-out infinite; display:inline-block; text-shadow:0 0 40px rgba(255,215,0,0.8); }
        .footer-eshop::before { content:'✨'; margin-right:12px; font-size:28px; animation:sparkle 2s ease-in-out infinite; }
        .footer-eshop::after { content:'✨'; margin-left:12px; font-size:28px; animation:sparkle 2s ease-in-out infinite 1s; }
        .footer-text { font-size:12px; color:#9ca3af; margin:0; line-height:1.8; }
        .footer-link { color:#d4af37; text-decoration:none; font-weight:700; }
        @media (max-width:640px) {
            .container { border-radius:0; }
            .header { padding:32px 16px; }
            .logo { font-size:36px; }
            .tagline { font-size:11px; }
            .success-banner { padding:32px 16px; }
            .emoji-xl { font-size:64px; }
            .title { font-size:28px; }
            .content { padding:24px 16px; }

            .journey-icon { font-size:32px; }
            .cards-row { gap:20px; flex-direction:column; }
            .card-order, .card-delivery { min-width:100%; padding:24px; }
            .card-value-lg { font-size:26px; }
            .support-section { padding:20px 16px; margin-bottom:16px; }
            .support-emoji { font-size:40px; margin:0 0 12px 0; }
            .support-title { font-size:16px; }
            .support-text { font-size:12px; margin:0 0 16px 0; }
            .support-links { gap:8px; }
            .support-btn { padding:8px 14px; font-size:11px; }
            .amount-box { padding:20px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <img src="https://eshopperr.me/assets/eshopper-logo-horizontal.svg" alt="eShopper Boutique Luxe" style="height:60px; margin-bottom:12px; display:block; margin-left:auto; margin-right:auto;" />
        </div>

        <!-- Success Banner -->
        <div class="success-banner">
            <div class="emoji-xl">✅</div>
            <div class="title">ORDER CONFIRMED!</div>
            <div class="subtitle">Thank you for choosing Eshopper Boutique Luxe</div>
            <div class="badge">✨ Premium Care Activated</div>
        </div>

        <!-- Main Content -->
        <div class="content">
            <!-- Greeting -->
            <div class="greeting">
                <p class="greeting-text">Hi <span class="greeting-bold">${firstName}</span>,<br>Your order has been confirmed and is now being prepared with our signature white-glove service. Here's everything you need to know:</p>
            </div>

            <!-- Order Details Cards -->
            <div class="section-title">📋 Order Details</div>
            <div class="cards-row">
                <div class="card-order">
                    <p class="card-label-lg">🆔 ORDER ID</p>
                    <p class="card-value-lg">${orderId}</p>
                    <p class="card-sub-lg">Order Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div class="card-delivery">
                    <p class="card-label-lg">🚚 EST. DELIVERY</p>
                    <p class="card-value-lg" style="color:#ffd700; text-shadow:0 4px 12px rgba(255,215,0,0.4);">${deliveryDate}</p>
                    <p class="card-sub-lg">Premium white-glove delivery</p>
                </div>
            </div>

            <!-- Products Section -->
            <div class="section-title">📦 Order Items</div>
            <div class="product-section">
                <table class="product-table">
                    <tbody>
                        ${productRows}
                    </tbody>
                </table>
                ${safeProducts.length > 5 ? `<p style="font-size:13px; color:#6b7280; margin:16px 0 0 0; padding:0 16px; background:#f9fafb; padding:12px 16px; border-radius:8px;">+ ${safeProducts.length - 5} more item(s) in your order</p>` : ''}
            </div>

            <!-- Amount Breakdown -->
            <div class="section-title">💳 Order Summary</div>
            <div class="amount-section">
                <div class="amount-box">
                    <div class="amount-row">
                        <span class="amount-label">Subtotal</span>
                        <span class="amount-value">₹${Number(finalAmount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div class="amount-row">
                        <span class="amount-label">Delivery Charges</span>
                        <span class="amount-value" style="color:#10b981; font-weight:800;">FREE 🎁</span>
                    </div>
                    <div class="amount-row">
                        <span class="amount-label">Taxes & Fees</span>
                        <span class="amount-value">Included</span>
                    </div>
                    <div class="amount-row total-row">
                        <span class="total-label">💰 Total Amount</span>
                        <span class="total-value">₹${Number(finalAmount || 0).toLocaleString('en-IN')}</span>
                    </div>
                </div>
            </div>

            <!-- Payment Method -->
            <div class="section-title">💳 Payment Method</div>
            <div class="payment-section">
                <div class="payment-box">
                    <p class="payment-label">💳 Payment Method</p>
                    <p class="payment-method">
                        ${paymentMethod === 'Cash on Delivery' ? '🏧' : paymentMethod === 'NetBanking' ? '🏦' : paymentMethod === 'Debit Card' ? '💳' : paymentMethod === 'Credit Card' ? '💳' : '💰'}
                        ${paymentMethod || 'Cash on Delivery'}
                    </p>
                    ${paymentMethod === 'Cash on Delivery' ? '<p class="payment-detail">✓ Pay securely when you receive your order</p>' : '<p class="payment-detail">✓ Payment received & confirmed</p>'}
                </div>
            </div>

            <!-- Shipping Address -->
            <div class="section-title">📍 Shipping Address</div>
            <div class="address-section">
                <div class="address-box">
                    <p class="address-name">${shippingAddress?.fullName || 'N/A'}</p>
                    <p class="address-line">${shippingAddress?.addressline1 || 'N/A'}</p>
                    <p class="address-line">${shippingAddress?.city || 'N/A'}, ${shippingAddress?.state || 'N/A'} - ${shippingAddress?.pin || 'N/A'}</p>
                    <p class="address-line">${shippingAddress?.country || 'India'}</p>
                    <p class="address-phone">📱 <strong>Phone:</strong> ${shippingAddress?.phone || 'N/A'}</p>
                </div>
            </div>

            <!-- Primary Action Button -->
            <a href="https://eshopperr.me/my-orders" class="button-primary">🔍 VIEW & TRACK YOUR ORDER</a>

            <!-- Support Section -->
            <div class="support-section">
                <div class="support-emoji">🎧</div>
                <div class="support-title">Need Assistance?</div>
                <div class="support-text">Our premium support team is available 24/7 to help you with any questions or concerns</div>
                <div class="support-links">
                    <a href="mailto:support@eshopperr.me" class="support-btn btn-email">📧 Email Us</a>
                    <a href="https://wa.me/918447859784?text=Hi%20I%20need%20help%20with%20order%20${orderId}" class="support-btn btn-whatsapp">💬 WhatsApp</a>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p class="footer-eshop">EShopper</p>
            <p class="footer-text">
                © ${new Date().getFullYear()} Eshopper Boutique Luxe. All rights reserved.<br>
                <a href="https://eshopperr.me" class="footer-link">eshopperr.me</a>
            </p>
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
        throw error;
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
                orderDate
            });
        } catch (invoiceError) {
            console.error('Invoice PDF generation failed:', invoiceError.message);
            if (process.env.SENTRY_DSN) Sentry.captureException(invoiceError);
        }

        const recipientEmail = String(user.email || addressPayload?.email || '').trim();

        try {
            await sendOrderConfirmationEmail({
            toEmail: recipientEmail,
                userName: user.name,
                orderId,
                paymentMethod: paymentMethod || 'COD',
                finalAmount: payable,
                shippingAddress: addressPayload,
                products: cleanProducts,
                estimatedArrival,
                invoiceBase64: invoiceBuffer ? invoiceBuffer.toString('base64') : null,
                orderStatus: 'Ordered'
            });
        } catch (emailError) {
            console.error('Order confirmation email failed:', emailError.message);
            if (process.env.SENTRY_DSN) Sentry.captureException(emailError);

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
            console.log(`📱 WhatsApp Debug Info:
   User Phone: ${user.phone || '❌ Not in user object'}
   Address Phone: ${addressPayload?.phone || '❌ Not in address'}
   Final Phone: ${phoneNumber || '❌ Neither found'}
   Order ID: ${orderId}`);
            
            if (!phoneNumber) {
                console.warn(`⚠️  No phone number found for order ${orderId}, skipping WhatsApp`);
            } else {
                const mediaUrl = 'https://res.cloudinary.com/dtfvoxw1p/image/upload/v1724068341/order_success_lux.png';
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

                const caption = `✨ LUXURY EXPERIENCE STARTS NOW! 💎\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nHello ${(user.name || 'Valued Customer').split(' ')[0]} 👋\nThank you for your exquisite order!\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ ORDER CONFIRMED\nOrder ID: #${orderId}\nOrder Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}\n\n📦 YOUR PREMIUM ITEMS:\n${itemSummary}${cleanProducts.length > 5 ? `\n   + ${cleanProducts.length - 5} more exclusive item(s)` : ''}\n\n💹 ORDER BREAKDOWN:\n   Subtotal: ₹${Number(total || 0).toLocaleString('en-IN')}${discountInfo}\n   Shipping: ₹${Number(shipping || 0).toLocaleString('en-IN')} (FREE on orders above ₹999)\n   ─────────────────────────────\n   Final Amount: ₹${Number(payable || 0).toLocaleString('en-IN')} 💳\n\n💳 PAYMENT METHOD: ${paymentMethod === 'COD' ? 'Cash on Delivery (Pay at gate)' : paymentMethod || 'Card Payment'}\n\n📅 ESTIMATED DELIVERY:\n   Expected by: ${formattedDeliveryDate}\n   Status: Your order is being prepared\n\n🎯 WHAT'S NEXT?\n✓ We're hand-preparing your premium selection\n✓ Expert packaging with care\n✓ Fast & secure delivery to your doorstep\n✓ Real-time tracking available\n\n🔗 ACTION LINKS:\n📍 Track Order Live: https://eshopperr.me/order-tracking/${orderId}\n💬 WhatsApp Support: https://wa.me/918447859784\n✉️ Email Support: support@eshopperr.me\n\n❓ NEED HELP?\n• Track your order anytime\n• Check delivery status\n• Modify or cancel order\n• Return or exchange items\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🙏 We appreciate your business!\nHappy shopping with Eshopper Boutique Luxe\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

                try {
                    await sendWhatsAppMedia(phoneNumber, mediaUrl, caption);
                    console.log(`✅ Order placement WhatsApp media sent for order ${orderId}`);
                } catch (mediaError) {
                    console.warn(`⚠️ WhatsApp media failed for ${orderId}, falling back to text:`, mediaError.message);
                    await sendWhatsApp(phoneNumber, caption);
                    console.log(`✅ Order placement WhatsApp text fallback sent for order ${orderId}`);
                }
            }
        } catch (waError) {
            if (isExpectedWhatsAppError(waError)) {
                console.warn(`⚠️  Order WhatsApp skipped (expected) for ${orderId}:`, waError.message);
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

// 🧪 SENTRY TEST ROUTE - Remove after testing
app.get('/debug-sentry', (req, res) => {
    throw new Error('Sentry Test Error - Working!');
});

// 🔴 SENTRY ERROR HANDLER - Must be after all routes (v10 way)
if (process.env.SENTRY_DSN && typeof Sentry.setupExpressErrorHandler === 'function') {
    Sentry.setupExpressErrorHandler(app);
}

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

        const orders = await Order.find({ userid: userId })
            .sort({ updatedAt: -1, createdAt: -1 })
            .select('orderId orderStatus finalAmount paymentStatus paymentMethod updatedAt createdAt')
            .lean();

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
                orderDate: order.orderDate || order.createdAt
            });

            clearTimeout(timeoutId);

            if (!pdfBuffer || pdfBuffer.length < 500) {
                return res.status(500).json({ message: 'Invoice generation failed - empty PDF' });
            }

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `${disposition}; filename="Invoice-${order.orderId}.pdf"`);
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
app.post('/api/update-order-status', async (req, res) => {
    try {
        const { orderId, status } = req.body;
        const normalized = normalizeOrderStatus(status);

        if (!orderId || !normalized) {
            return res.status(400).json({
                message: `orderId and valid status are required (${ALLOWED_ORDER_STATUS.join(', ')})`
            });
        }

        const order = await Order.findOne({ orderId });
        if (!order) return res.status(404).json({ message: 'Order not found' });

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

        const payload = {
            orderId: order.orderId,
            userId: order.userid,
            status: order.orderStatus,
            updatedAt: new Date().toISOString()
        };

        // 🔴 EMIT REAL-TIME STATUS UPDATE VIA SOCKET.IO (instant UI update)
        io.to(`user:${order.userid}`).emit('statusUpdate', payload);
        console.log(`✅ Status updated for order ${orderId} to ${normalized}, emitted to user:${order.userid}`);

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
});

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
