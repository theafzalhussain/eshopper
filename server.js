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
                <td>${String(idx + 1).padStart(2, '0')}</td>
                <td><strong>${itemDesc}</strong>${item.sku ? `<br/><span style="font-size:11px;color:#999;">SKU: ${item.sku}</span>` : ''}</td>
                <td>${qty}</td>
                <td>₹${price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                <td>₹${line.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
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
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');
                * { box-sizing: border-box; margin: 0; padding: 0; }
                html { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                body { background: #f5f5f3; color: #121212; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; }
                .wrap { max-width: 900px; margin: 0 auto; padding: 20px; }
                .card { background: #fff; border: 2px solid #d4af37; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
                .head { padding: 32px; background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #d4af37 100%); color: #fff; box-shadow: inset 0 0 20px rgba(212, 175, 55, 0.2); }
                .brand { font-family: 'Playfair Display', serif; font-size: 48px; font-weight: 700; letter-spacing: 3px; margin: 0; display: flex; align-items: center; gap: 14px; white-space: nowrap; }
                .brand-icon { font-size: 42px; color: #d4af37; text-shadow: 0 0 12px rgba(212, 175, 55, 0.8), 0 0 24px rgba(212, 175, 55, 0.4); animation: glow 2s ease-in-out infinite; }
                .brand-text { background: linear-gradient(135deg, #fff9e6, #d4af37, #fff9e6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
                @keyframes glow { 0%, 100% { text-shadow: 0 0 12px rgba(212, 175, 55, 0.8); } 50% { text-shadow: 0 0 20px rgba(212, 175, 55, 1); } }
                .tag { font-size: 11px; letter-spacing: 2.5px; margin-top: 10px; text-transform: uppercase; color: #fff9e6; font-weight: 700; }
                .body { padding: 32px; }
                .title { font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 700; margin: 0 0 24px; color: #0f0f0f; letter-spacing: 1px; }
                .meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 24px; }
                .box { border: 2px solid #d4af37; border-radius: 10px; padding: 14px 16px; background: linear-gradient(135deg, #fffef8 0%, #fff9e6 100%); transition: all 0.3s ease; }
                .box:hover { border-color: #ff9d00; box-shadow: 0 4px 12px rgba(212, 175, 55, 0.15); }
                .k { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: #8b7521; font-weight: 700; }
                .v { font-size: 15px; font-weight: 700; margin-top: 6px; color: #0f0f0f; word-break: break-word; }
                .items-section { margin-top: 24px; margin-bottom: 24px; }
                table { width: 100%; border-collapse: collapse; background: #fff; }
                th { background: linear-gradient(135deg, #0f0f0f, #1a1a1a); color: #d4af37; font-size: 11px; letter-spacing: 1.2px; padding: 14px 12px; text-transform: uppercase; font-weight: 700; text-align: left; border: 1px solid #d4af37; }
                td { border: 1px solid #e8dcc8; padding: 12px; font-size: 13px; color: #2c2c2c; }
                tr:nth-child(even) { background: #fafaf8; }
                td:nth-child(1) { text-align: center; font-weight: 700; color: #d4af37; }
                td:nth-child(3), td:nth-child(4), td:nth-child(5) { text-align: right; font-weight: 600; }
                .totals { margin-top: 24px; border: 2px solid #d4af37; border-radius: 10px; padding: 18px 20px; background: linear-gradient(135deg, #fffef8 0%, #fff9e6 100%); }
                .totals-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
                .line { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; color: #2c2c2c; font-size: 14px; border-bottom: 1px solid #e8dcc8; }
                .line:last-child { border-bottom: none; }
                .line-label { font-weight: 600; color: #0f0f0f; }
                .line-value { font-weight: 700; color: #0f0f0f; font-size: 15px; }
                .final { background: linear-gradient(135deg, #d4af37 0%, #8b7521 100%); color: #fff; padding: 16px 18px; border-radius: 8px; font-size: 18px; font-weight: 800; display: flex; justify-content: space-between; align-items: center; margin-top: 12px; letter-spacing: 0.5px; }
                .final-label { font-size: 16px; }
                .final-value { font-size: 22px; }
                .address-section { margin-top: 24px; }
                .ship { border: 2px solid #d4af37; border-radius: 10px; padding: 16px; background: linear-gradient(135deg, #fffef8 0%, #fff9e6 100%); font-size: 13px; line-height: 1.8; color: #2c2c2c; }
                .ship-title { font-weight: 700; color: #0f0f0f; margin-bottom: 10px; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; }
                .ship-addr { font-size: 13px; color: #0f0f0f; line-height: 1.7; }
                .footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #e8dcc8; }
                .foot { font-size: 12px; color: #666; text-align: center; line-height: 1.6; }
                .foot-premium { color: #d4af37; font-weight: 700; margin-top: 12px; font-size: 13px; letter-spacing: 1px; }
                @media (max-width: 768px) {
                    .wrap { padding: 12px; }
                    .head { padding: 20px; }
                    .body { padding: 20px; }
                    .brand { font-size: 32px; gap: 8px; }
                    .brand-icon { font-size: 28px; }
                    .title { font-size: 22px; }
                    .meta { grid-template-columns: 1fr; gap: 10px; }
                    .box { padding: 10px 12px; }
                    .totals-grid { grid-template-columns: 1fr; }
                    th, td { padding: 10px 8px; font-size: 12px; }
                    .final { flex-direction: column; gap: 8px; text-align: center; }
                }
                @media (max-width: 480px) {
                    .wrap { padding: 8px; }
                    .head { padding: 16px; }
                    .body { padding: 16px; }
                    .brand { font-size: 24px; }
                    .brand-icon { font-size: 22px; }
                    .title { font-size: 18px; margin-bottom: 16px; }
                    table { font-size: 11px; }
                    th, td { padding: 8px 6px; }
                }
            </style>
        </head>
        <body>
            <div class="wrap">
                <div class="card">
                    <div class="head">
                        <h1 class="brand"><span class="brand-icon">✨</span><span class="brand-text">EShoppper</span></h1>
                        <div class="tag">🏆 Boutique Luxe • Premium Invoice</div>
                    </div>
                    <div class="body">
                        <h2 class="title">Premium Order Invoice</h2>
                        
                        <div class="meta">
                            <div class="box"><div class="k">Order ID</div><div class="v">${orderId}</div></div>
                            <div class="box"><div class="k">Order Date</div><div class="v">${orderDateText}</div></div>
                            <div class="box"><div class="k">Customer Name</div><div class="v">${displayName}</div></div>
                            <div class="box"><div class="k">Customer Email</div><div class="v">${userEmail || 'N/A'}</div></div>
                            <div class="box"><div class="k">Payment Method</div><div class="v">${paymentMethod || 'COD'}</div></div>
                            <div class="box"><div class="k">Status</div><div class="v">${paymentStatus || 'Pending'}</div></div>
                        </div>

                        <div class="items-section">
                            <table>
                                <thead>
                                    <tr>
                                        <th style="width:5%">#</th>
                                        <th style="width:45%">Item Description</th>
                                        <th style="width:10%;">Qty</th>
                                        <th style="width:20%;">Unit Price</th>
                                        <th style="width:20%;">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>${rows || '<tr><td colspan="5" style="text-align:center;padding:16px;">No items found</td></tr>'}</tbody>
                            </table>
                        </div>

                        <div class="totals">
                            <div class="totals-grid">
                                <div>
                                    <div class="line">
                                        <span class="line-label">Subtotal:</span>
                                        <span class="line-value">₹${subtotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                    </div>
                                    <div class="line">
                                        <span class="line-label">Shipping Charges:</span>
                                        <span class="line-value">${shipping <= 0 ? 'FREE' : `₹${shipping.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}</span>
                                    </div>
                                </div>
                                <div></div>
                            </div>
                            <div class="final">
                                <span class="final-label">Total Amount Payable</span>
                                <span class="final-value">₹${payable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                            </div>
                        </div>

                        <div class="address-section">
                            <div class="ship">
                                <div class="ship-title">📍 Delivery Address</div>
                                <div class="ship-addr">
                                    <strong>${shippingAddress?.fullName || 'Customer'}</strong><br/>
                                    ${shippingAddress?.addressline1 || 'Address Line'}<br/>
                                    ${shippingAddress?.city || 'City'}, ${shippingAddress?.state || 'State'} - ${shippingAddress?.pin || 'PIN'}<br/>
                                    ${shippingAddress?.country || 'India'}<br/>
                                    <strong>Phone:</strong> ${shippingAddress?.phone || 'N/A'}
                                </div>
                            </div>
                        </div>

                        <div class="footer">
                            <div class="foot">
                                This is a computer-generated invoice and does not require a physical signature.<br/>
                                For inquiries, contact: <strong>support@eshopperr.me</strong>
                            </div>
                            <div class="foot-premium">💎 EShoppper Premium Edition • Authenticity Guaranteed 💎</div>
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
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '16mm', right: '12mm', bottom: '16mm', left: '12mm' }
        });
        return pdf;
    } finally {
        await browser.close();
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
            const whatsappMsg = `Luxury Craftsmanship Underway! ✨\n\nHello ${firstName}, your Eshopper Boutique order #${orderId} is now beautifully packed with premium care!\n\n📍 Track Your Journey: ${trackingLink}`;
            
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
            const deliveryDate = estimatedDelivery ? new Date(estimatedDelivery).toLocaleDateString('en-IN') : 'Soon';
            const caption = `White-Glove Delivery Initiated! 🚚✨\n\nYour selection is on a curated journey to your doorstep via premium White-Glove Shipping.\n\nOrder: #${orderId}\nEstimated: ${deliveryDate}\n\n📍 Real-Time Tracking: ${trackingLink}\n\n💎 Eshopper Boutique Luxe`;

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
            const whatsappMsg = `Order Delivered! 🎉💎\n\nCongratulations ${firstName}! Your Eshopper Boutique order #${orderId} has arrived at your doorstep.\n\nThank you for choosing luxury. We hope you cherish your selection!\n\n⭐ Share Your Experience: Rate Your Purchase`;

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
    
    // Status-specific configurations
    const statusConfig = {
        'Ordered': { emoji: '✅', color: '#28a745', bgColor: '#d4edda', message: 'Your order has been confirmed and payment received. We\'re now preparing it with premium care.' },
        'Packed': { emoji: '📦', color: '#0066cc', bgColor: '#d1ecf1', message: 'Your order is now packed and ready for shipment. Tracking details coming soon!' },
        'Shipped': { emoji: '🚚', color: '#ff6600', bgColor: '#fff3cd', message: 'Your order is on its way! Track your delivery in real-time.' },
        'Out for Delivery': { emoji: '📍', color: '#e74c3c', bgColor: '#f8d7da', message: 'Great news! Your package is out for delivery today. Please be available to receive it.' },
        'Delivered': { emoji: '🎉', color: '#27ae60', bgColor: '#d4edda', message: 'Congratulations! Your order has been delivered successfully. Thank you for shopping with us!' },
        'Return Initiated': { emoji: '↩️', color: '#9b59b6', bgColor: '#f0e6ff', message: 'Your return has been initiated. We\'ll pick up your package soon.' },
        'Return Completed': { emoji: '✓', color: '#8e44ad', bgColor: '#f0e6ff', message: 'Your return has been completed. Refund processing has started.' },
        'Refund Initiated': { emoji: '💰', color: '#27ae60', bgColor: '#d4edda', message: 'Refund initiated! Your money will be back in 3-5 business days.' },
        'Refund Completed': { emoji: '✓', color: '#27ae60', bgColor: '#d4edda', message: 'Refund successfully completed. Thank you for your patience!' }
    };
    
    const config = statusConfig[status] || { emoji: '📦', color: '#111827', bgColor: '#f9fafb', message: status };
    const deliveryDate = estimatedDelivery ? new Date(estimatedDelivery).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
    
    // Timeline calculation
    const statusSequence = ['Ordered', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];
    const returnSequence = ['Return Initiated', 'Return Completed', 'Refund Initiated', 'Refund Completed'];
    const currentSequence = returnSequence.includes(status) ? returnSequence : statusSequence;
    const currentIndex = currentSequence.indexOf(status);

    const timelineHtml = currentSequence.map((step, idx) => `
        <div style="display:flex;flex-direction:column;align-items:center;flex:1;">
            <div style="width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;margin-bottom:8px;${idx <= currentIndex ? `background:${config.color};color:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.2);` : 'background:#e5e7eb;color:#9ca3af;'}">
                ${idx === 0 ? '✓' : idx === 1 ? '📦' : idx === 2 ? '🚚' : idx === 3 ? '📍' : idx === 4 ? '🎉' : idx === 5 ? '↩️' : idx === 6 ? '✓' : '💰'}
            </div>
            <div style="font-size:11px;font-weight:700;text-align:center;${idx <= currentIndex ? `color:${config.color};` : 'color:#9ca3af;'}">${step.replace(' ', '<br/>')}</div>
            ${idx < currentSequence.length - 1 ? `<div style="width:2px;height:24px;background:${idx < currentIndex ? config.color : '#e5e7eb'};margin-top:8px;"></div>` : ''}
        </div>
    `).join('');

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                @media only screen and (max-width: 600px) {
                    .mobile-padding { padding: 16px !important; }
                    .mobile-text { font-size: 14px !important; }
                    .button-mobile { min-width: 100% !important; margin-bottom: 8px !important; }
                    .timeline-mobile { flex-direction: column !important; }
                }
            </style>
        </head>
        <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;">
            <div style="max-width:650px;margin:0 auto;background:#ffffff;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
                
                <!-- Premium Header -->
                <div style="background:linear-gradient(135deg,#0f0f0f 0%,#1a1a1a 50%,#111827 100%);padding:40px 24px;text-align:center;">
                    <div style="font-size:32px;font-weight:900;background:linear-gradient(135deg,#ffd700,#d4af37,#b8860b);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:2px;margin-bottom:12px;">✨ EShoppper</div>
                    <div style="font-size:12px;color:#d4af37;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Order Status Update</div>
                </div>

                <!-- Status Banner with Emoji -->
                <div style="background:linear-gradient(135deg,${config.bgColor.replace('#', '#').slice(0, 7)} 0%, ${config.bgColor}80 100%);padding:32px 24px;text-align:center;border-bottom:4px solid ${config.color};">
                    <div style="font-size:64px;margin-bottom:12px;animation:bounce 1s ease-in-out;">${config.emoji}</div>
                    <div style="font-size:28px;font-weight:800;color:${config.color};margin-bottom:8px;letter-spacing:1px;">${status}</div>
                    <div style="font-size:15px;color:${config.color};font-weight:500;opacity:0.9;">${config.message}</div>
                </div>

                <!-- Main Content -->
                <div class="mobile-padding" style="padding:32px 28px;">
                    
                    <!-- Greeting -->
                    <div style="margin-bottom:24px;">
                        <h2 style="margin:0 0 12px 0;font-size:22px;color:#111827;font-weight:700;">Hi ${firstName},</h2>
                        <p style="margin:0;color:#4b5563;font-size:15px;line-height:1.7;">
                            Your order <strong style="color:#111827;">${orderId}</strong> has been updated! Here's the latest status:
                        </p>
                    </div>

                    <!-- Order Details Cards -->
                    <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:28px;">
                        <div style="flex:1;min-width:260px;background:linear-gradient(135deg,#111827,#1f2937);border-radius:16px;padding:20px;box-shadow:0 4px 12px rgba(0,0,0,0.15);">
                            <div style="font-size:11px;letter-spacing:1.5px;color:#d4af37;text-transform:uppercase;font-weight:700;margin-bottom:8px;">🆔 Order ID</div>
                            <div style="font-size:20px;font-weight:900;color:#fff;margin-bottom:4px;">${orderId}</div>
                            <div style="font-size:12px;color:#9ca3af;">Updated: ${new Date().toLocaleDateString('en-IN')}</div>
                        </div>
                        <div style="flex:1;min-width:260px;background:linear-gradient(135deg,${config.color},${config.bgColor});border-radius:16px;padding:20px;box-shadow:0 4px 12px rgba(0,0,0,0.1);border:2px solid ${config.color};">
                            <div style="font-size:11px;letter-spacing:1.5px;color:#111827;text-transform:uppercase;font-weight:700;margin-bottom:8px;">🚚 Est. Delivery</div>
                            <div style="font-size:17px;font-weight:800;color:#111827;line-height:1.3;">${deliveryDate}</div>
                        </div>
                    </div>

                    <!-- Order Progress Timeline -->
                    <div style="background:linear-gradient(135deg,#fff9e6,#fffbf0);padding:24px;border-radius:12px;border:2px solid #e5e7eb;margin-bottom:28px;">
                        <div style="text-align:center;margin-bottom:20px;">
                            <div style="font-size:14px;font-weight:700;color:#111827;">📊 Order Journey</div>
                        </div>
                        <div class="timeline-mobile" style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                            ${timelineHtml}
                        </div>
                    </div>

                    <!-- Status Details Box -->
                    <div style="background:linear-gradient(135deg,${config.bgColor},${config.bgColor}99);padding:20px;border-radius:12px;border-left:4px solid ${config.color};margin-bottom:28px;">
                        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                            <div style="font-size:28px;">${config.emoji}</div>
                            <div>
                                <div style="font-size:13px;font-weight:700;color:${config.color};text-transform:uppercase;">Current Status</div>
                                <div style="font-size:18px;color:${config.color};font-weight:800;margin-top:2px;">${status}</div>
                            </div>
                        </div>
                        <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">${config.message}</p>
                    </div>

                    <!-- Amount Section (if total provided) -->
                    ${totalAmount ? `
                    <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);padding:18px;border-radius:12px;border-left:4px solid #22c55e;margin-bottom:28px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <div>
                                <div style="font-size:12px;font-weight:700;color:#166534;text-transform:uppercase;">Order Amount</div>
                                <div style="font-size:16px;color:#166534;font-weight:700;margin-top:4px;">₹${Number(totalAmount).toLocaleString('en-IN')}</div>
                            </div>
                            <div style="font-size:32px;">💳</div>
                        </div>
                    </div>
                    ` : ''}

                    <!-- Action Buttons -->
                    <div style="margin-bottom:28px;">
                        <a href="${trackingLink}" class="button-mobile" style="display:block;background:linear-gradient(135deg,#111827,#1f2937);color:#fff;padding:18px 32px;border-radius:12px;text-decoration:none;font-weight:700;text-align:center;margin-bottom:12px;box-shadow:0 4px 12px rgba(0,0,0,0.3);font-size:16px;letter-spacing:0.5px;">
                            🔍 TRACK IN REAL-TIME
                        </a>
                        ${['Return Initiated', 'Return Completed', 'Refund Initiated', 'Refund Completed'].includes(status) ? `
                        <a href="https://eshopperr.me/returns" class="button-mobile" style="display:block;background:#fff;color:#111827;padding:18px 32px;border-radius:12px;text-decoration:none;font-weight:700;border:2px solid #111827;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.1);font-size:16px;letter-spacing:0.5px;">
                            📋 VIEW RETURN STATUS
                        </a>
                        ` : ''}
                    </div>

                    <!-- Refund Policy Section (for return/refund statuses) -->
                    ${['Return Initiated', 'Return Completed', 'Refund Initiated', 'Refund Completed'].includes(status) ? `
                    <div style="background:linear-gradient(135deg,#ffe6e6,#ffd9d9);padding:24px;border-radius:12px;border:2px solid #e74c3c;margin-bottom:28px;">
                        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                            <div style="font-size:28px;">📋</div>
                            <div style="font-size:16px;font-weight:800;color:#c0392b;">Return & Refund Policy</div>
                        </div>
                        <div style="background:#fff;padding:16px;border-radius:8px;font-size:13px;color:#374151;line-height:1.7;">
                            <p style="margin:0 0 8px 0;"><strong style="color:#c0392b;">✓ Return Window:</strong> 7 days from delivery</p>
                            <p style="margin:0 0 8px 0;"><strong style="color:#c0392b;">✓ Refund Timeline:</strong> 3-5 business days after return pickup</p>
                            <p style="margin:0 0 8px 0;"><strong style="color:#c0392b;">✓ Condition:</strong> Unused & original packaging intact</p>
                            <p style="margin:0;"><strong style="color:#c0392b;">✓ Methods:</strong> Same payment method used</p>
                        </div>
                    </div>
                    ` : `
                    <!-- Return Policy Info (for other statuses) -->
                    <div style="background:linear-gradient(135deg,#f0f4ff,#e5eeff);padding:18px;border-radius:12px;border-left:4px solid #3b82f6;margin-bottom:28px;">
                        <div style="font-size:12px;font-weight:700;color:#1e40af;text-transform:uppercase;margin-bottom:8px;">💡 Need to Return?</div>
                        <p style="margin:0;color:#1e40af;font-size:13px;">You have <strong>7 days from delivery</strong> to initiate a return. <a href="https://eshopperr.me/returns" style="color:#3b82f6;text-decoration:none;font-weight:700;">Learn more →</a></p>
                    </div>
                    `}

                    <!-- Customer Support Section -->
                    <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);padding:24px;border-radius:12px;border:2px solid #fbbf24;margin-bottom:20px;text-align:center;">
                        <div style="font-size:28px;margin-bottom:12px;">🎧</div>
                        <div style="font-size:16px;font-weight:800;color:#78350f;margin-bottom:8px;">Need Help?</div>
                        <div style="font-size:13px;color:#92400e;margin-bottom:16px;">Our premium support team is available 24/7</div>
                        <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;">
                            <a href="mailto:support@eshopperr.me" style="display:inline-flex;align-items:center;gap:6px;background:#fff;color:#78350f;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;border:2px solid #fbbf24;">
                                📧 Email Us
                            </a>
                            <a href="https://wa.me/918447859784?text=Hi%20I%20need%20help%20with%20order%20${orderId}" style="display:inline-flex;align-items:center;gap:6px;background:#25D366;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;">
                                💬 WhatsApp
                            </a>
                        </div>
                    </div>

                </div>

                <!-- Footer -->
                <div style="background:linear-gradient(135deg,#111827,#0f0f0f);padding:32px 24px;text-align:center;">
                    <div style="font-size:18px;font-weight:800;background:linear-gradient(135deg,#ffd700,#d4af37);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:12px;">✨ EShoppper</div>
                    <p style="margin:0;font-size:12px;color:#9ca3af;">
                        © ${new Date().getFullYear()} Eshopper Boutique Luxe<br/>
                        <a href="https://eshopperr.me" style="color:#d4af37;text-decoration:none;font-weight:600;">eshopperr.me</a>
                    </p>
                </div>

            </div>
        </body>
        </html>
    `;

    try {
        await axios.post('https://api.brevo.com/v3/smtp/email', {
            sender: { name: 'Eshopper', email: 'support@eshopperr.me' },
            to: [{ email: toEmail, name: displayName }],
            subject: `📦 Order Update - ${orderId} • ${status} | Eshopper Boutique`,
            htmlContent,
            replyTo: { email: 'support@eshopperr.me' }
        }, {
            headers: {
                'api-key': BREVO_KEY,
                'content-type': 'application/json',
                accept: 'application/json'
            }
        });
        console.log(`✅ Status email sent: ${orderId} -> ${status}`);
        return true;
    } catch (error) {
        console.error('❌ Status email failed:', error.message);
        return false;
    }
};

const sendOrderConfirmationEmail = async ({ toEmail, userName, orderId, paymentMethod, finalAmount, shippingAddress, products, estimatedArrival, invoiceBase64 }) => {
    const BREVO_KEY = process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.trim() : null;
    
    console.log('📧 Order Confirmation Email Debug:');
    console.log(`   API Key: ${BREVO_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`   Email: ${toEmail || '❌ Missing'}`);
    console.log(`   Invoice: ${invoiceBase64 ? `✅ Valid (${(invoiceBase64.length / 1024).toFixed(1)}KB)` : '⏭️  Skipped'}`);
    
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
        const deliveryDate = estimatedArrival ? new Date(estimatedArrival).toLocaleDateString('en-IN', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        }) : 'N/A';

        const productRows = safeProducts.map(p => `
            <tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:16px 12px;">
                    <div style="display:flex;align-items:center;gap:16px;">
                        ${p.pic ? `
                        <img src="${p.pic}" alt="${p.name || 'Product'}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;" />
                        ` : `
                        <div style="width:80px;height:80px;background:linear-gradient(135deg,#f3f4f6,#e5e7eb);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px;">📦</div>
                        `}
                        <div style="flex:1;">
                            <div style="font-weight:700;color:#111827;font-size:15px;margin-bottom:4px;">${p.name || 'Product'}</div>
                            <div style="font-size:13px;color:#6b7280;margin-bottom:2px;">Quantity: ${p.qty || 1}</div>
                            <div style="font-size:13px;color:#10b981;font-weight:600;">₹${Number(p.price || 0).toLocaleString('en-IN')} each</div>
                        </div>
                    </div>
                </td>
                <td style="padding:16px 12px;text-align:right;">
                    <div style="font-weight:800;color:#111827;font-size:17px;">₹${Number(p.total || (p.price * p.qty) || 0).toLocaleString('en-IN')}</div>
                </td>
            </tr>
        `).join('');

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    @media only screen and (max-width: 600px) {
                        .mobile-padding { padding: 16px !important; }
                        .mobile-text { font-size: 14px !important; }
                        .mobile-hide { display: none !important; }
                        .button-mobile { min-width: 100% !important; margin-bottom: 8px !important; }
                    }
                </style>
            </head>
            <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:#f3f4f6;line-height:1.6;">
                <div style="max-width:650px;margin:0 auto;background:#ffffff;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
                    
                    <!-- Premium Header with Brand -->
                    <div style="background:linear-gradient(135deg,#0f0f0f 0%,#1a1a1a 50%,#111827 100%);padding:40px 24px;text-align:center;position:relative;overflow:hidden;">
                        <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDIxMiwxNzUsNTUsMC4xKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+');opacity:0.3;"></div>
                        <div style="position:relative;z-index:1;">
                            <div style="font-size:36px;font-weight:900;background:linear-gradient(135deg,#ffd700,#d4af37,#b8860b);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:2px;text-shadow:0 2px 10px rgba(212,175,55,0.3);">✨ EShoppper</div>
                            <div style="font-size:13px;color:#d4af37;margin-top:12px;font-weight:600;letter-spacing:3px;text-transform:uppercase;">Boutique Luxe</div>
                        </div>
                    </div>

                    <!-- Success Banner with Animation -->
                    <div style="background:linear-gradient(135deg,#d4edda 0%,#c3e6cb 50%,#b8dac5 100%);padding:32px 24px;text-align:center;border-bottom:4px solid #28a745;position:relative;">
                        <div style="font-size:56px;margin-bottom:12px;animation:bounce 1s ease-in-out;">✅</div>
                        <div style="font-size:28px;font-weight:800;color:#155724;margin-bottom:8px;letter-spacing:1px;">ORDER CONFIRMED!</div>
                        <div style="font-size:15px;color:#155724;font-weight:500;">Thank you for choosing Eshopper Boutique</div>
                        <div style="margin-top:16px;display:inline-block;background:#28a745;color:#fff;padding:6px 20px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:1px;">PREMIUM CARE ACTIVATED 💎</div>
                    </div>

                    <!-- Order Progress Timeline -->
                    <div style="background:linear-gradient(135deg,#fff9e6,#fffbf0);padding:24px;border-bottom:1px solid #e5e7eb;">
                        <div style="text-align:center;margin-bottom:16px;">
                            <div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:12px;">📦 ORDER JOURNEY</div>
                            <div style="display:flex;justify-content:space-between;align-items:center;max-width:400px;margin:0 auto;position:relative;">
                                <!-- Progress Line -->
                                <div style="position:absolute;top:15px;left:10%;right:10%;height:3px;background:#e5e7eb;z-index:0;"></div>
                                <div style="position:absolute;top:15px;left:10%;width:0%;height:3px;background:#d4af37;z-index:1;animation:progress 2s ease-out forwards;"></div>
                                
                                <!-- Steps -->
                                <div style="text-align:center;z-index:2;position:relative;">
                                    <div style="width:32px;height:32px;border-radius:50%;background:#28a745;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;box-shadow:0 2px 8px rgba(40,167,69,0.4);">
                                        <span style="color:#fff;font-size:16px;">✓</span>
                                    </div>
                                    <div style="font-size:10px;color:#6b7280;font-weight:600;">Confirmed</div>
                                </div>
                                <div style="text-align:center;z-index:2;position:relative;">
                                    <div style="width:32px;height:32px;border-radius:50%;background:#e5e7eb;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;">
                                        <span style="color:#6b7280;font-size:14px;">📦</span>
                                    </div>
                                    <div style="font-size:10px;color:#6b7280;font-weight:600;">Packed</div>
                                </div>
                                <div style="text-align:center;z-index:2;position:relative;">
                                    <div style="width:32px;height:32px;border-radius:50%;background:#e5e7eb;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;">
                                        <span style="color:#6b7280;font-size:14px;">🚚</span>
                                    </div>
                                    <div style="font-size:10px;color:#6b7280;font-weight:600;">Shipped</div>
                                </div>
                                <div style="text-align:center;z-index:2;position:relative;">
                                    <div style="width:32px;height:32px;border-radius:50%;background:#e5e7eb;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;">
                                        <span style="color:#6b7280;font-size:14px;">🎉</span>
                                    </div>
                                    <div style="font-size:10px;color:#6b7280;font-weight:600;">Delivered</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Main Content -->
                    <div class="mobile-padding" style="padding:32px 28px;">
                        
                        <!-- Greeting -->
                        <div style="margin-bottom:24px;">
                            <h2 style="margin:0 0 12px 0;font-size:22px;color:#111827;font-weight:700;">Dear ${firstName},</h2>
                            <p style="margin:0;color:#4b5563;font-size:15px;line-height:1.7;">
                                🎊 Your order has been confirmed and is now being prepared with <strong style="color:#d4af37;">premium care</strong>. 
                                We're excited to deliver an exceptional shopping experience!
                            </p>
                        </div>

                        <!-- Order Details Cards -->
                        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:28px;">
                            <div style="flex:1;min-width:260px;background:linear-gradient(135deg,#111827,#1f2937);border-radius:16px;padding:20px;box-shadow:0 4px 12px rgba(0,0,0,0.15);">
                                <div style="font-size:11px;letter-spacing:1.5px;color:#d4af37;text-transform:uppercase;font-weight:700;margin-bottom:8px;">🆔 Order ID</div>
                                <div style="font-size:24px;font-weight:900;color:#fff;margin-bottom:4px;">${orderId}</div>
                                <div style="font-size:12px;color:#9ca3af;margin-top:8px;">
                                    <a href="https://eshopperr.me/order-tracking/${orderId}" style="color:#fbbf24;text-decoration:none;font-weight:600;display:inline-flex;align-items:center;gap:4px;">
                                        Track Order <span style="font-size:10px;">→</span>
                                    </a>
                                </div>
                            </div>
                            <div style="flex:1;min-width:260px;background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:16px;padding:20px;box-shadow:0 4px 12px rgba(251,191,36,0.2);border:2px solid #fbbf24;">
                                <div style="font-size:11px;letter-spacing:1.5px;color:#92400e;text-transform:uppercase;font-weight:700;margin-bottom:8px;">🚚 Estimated Delivery</div>
                                <div style="font-size:17px;font-weight:800;color:#78350f;line-height:1.3;">${deliveryDate}</div>
                                <div style="font-size:12px;color:#92400e;margin-top:8px;font-weight:600;">📍 Delivering to ${shippingAddress?.city || 'your location'}</div>
                            </div>
                        </div>

                        <!-- Payment Method -->
                        <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);padding:18px;border-radius:12px;border-left:4px solid #22c55e;margin-bottom:28px;box-shadow:0 2px 8px rgba(34,197,94,0.1);">
                            <div style="display:flex;align-items:center;gap:12px;">
                                <div style="font-size:28px;">💳</div>
                                <div>
                                    <div style="font-size:12px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.5px;">Payment Method</div>
                                    <div style="font-size:16px;color:#166534;font-weight:700;margin-top:2px;">${paymentMethod || 'Cash on Delivery'}</div>
                                    ${paymentMethod === 'Cash on Delivery' ? '<div style="font-size:11px;color:#15803d;margin-top:4px;">✓ Pay when you receive your order</div>' : ''}
                                </div>
                            </div>
                        </div>

                        <!-- Products Section -->
                        <div style="margin-bottom:28px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                                <h3 style="margin:0;font-size:18px;font-weight:800;color:#111827;letter-spacing:0.5px;">📦 ORDER ITEMS</h3>
                                <div style="font-size:12px;color:#6b7280;font-weight:600;">${safeProducts.length} item${safeProducts.length > 1 ? 's' : ''}</div>
                            </div>
                            <div style="background:#fff;border:2px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                                <table style="width:100%;border-collapse:collapse;">
                                    <tbody>
                                        ${productRows}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Price Breakdown -->
                        <div style="background:linear-gradient(135deg,#f9fafb,#f3f4f6);padding:20px;border-radius:12px;border:2px solid #e5e7eb;margin-bottom:28px;">
                            <div style="margin-bottom:12px;">
                                <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #d1d5db;">
                                    <span style="color:#6b7280;font-size:14px;">Subtotal:</span>
                                    <span style="color:#374151;font-weight:600;font-size:14px;">₹${Number(finalAmount || 0).toLocaleString('en-IN')}</span>
                                </div>
                                <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #d1d5db;">
                                    <span style="color:#6b7280;font-size:14px;">Delivery Charges:</span>
                                    <span style="color:#10b981;font-weight:600;font-size:14px;">FREE 🎁</span>
                                </div>
                                <div style="display:flex;justify-content:space-between;padding:8px 0;">
                                    <span style="color:#6b7280;font-size:14px;">Taxes & Fees:</span>
                                    <span style="color:#374151;font-weight:600;font-size:14px;">Included</span>
                                </div>
                            </div>
                            <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:2px solid #111827;">
                                <span style="font-size:18px;font-weight:800;color:#111827;">TOTAL AMOUNT:</span>
                                <span style="font-size:26px;font-weight:900;background:linear-gradient(135deg,#d4af37,#b8860b);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">₹${Number(finalAmount || 0).toLocaleString('en-IN')}</span>
                            </div>
                        </div>

                        <!-- Shipping Address -->
                        <div style="background:#fff;padding:20px;border-radius:12px;border:2px solid #e5e7eb;margin-bottom:28px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                                <div style="font-size:24px;">📍</div>
                                <h3 style="margin:0;font-size:16px;font-weight:800;color:#111827;text-transform:uppercase;letter-spacing:0.5px;">Delivery Address</h3>
                            </div>
                            <div style="background:#f9fafb;padding:16px;border-radius:8px;border-left:4px solid #d4af37;">
                                <div style="font-weight:700;color:#111827;font-size:15px;margin-bottom:6px;">${shippingAddress?.fullName || 'N/A'}</div>
                                <div style="color:#4b5563;font-size:14px;line-height:1.7;">
                                    ${shippingAddress?.addressline1 || 'N/A'}<br/>
                                    ${shippingAddress?.city || 'N/A'}, ${shippingAddress?.state || 'N/A'} - ${shippingAddress?.pin || 'N/A'}<br/>
                                    ${shippingAddress?.country || 'India'}
                                </div>
                                <div style="margin-top:8px;padding-top:8px;border-top:1px dashed #d1d5db;">
                                    <span style="font-weight:700;color:#111827;font-size:13px;">📱 Phone:</span>
                                    <span style="color:#4b5563;font-size:13px;margin-left:6px;">${shippingAddress?.phone || 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        <!-- CTA Buttons - Premium Design -->
                        <div style="margin-bottom:28px;">
                            <a href="https://eshopperr.me/order-tracking/${orderId}" class="button-mobile" style="display:block;background:linear-gradient(135deg,#111827,#1f2937);color:#fff;padding:18px 32px;border-radius:12px;text-decoration:none;font-weight:700;text-align:center;margin-bottom:12px;box-shadow:0 4px 12px rgba(0,0,0,0.3);font-size:16px;letter-spacing:0.5px;">
                                🔍 TRACK YOUR ORDER
                            </a>
                            <a href="https://eshopperr.me/shop/All" class="button-mobile" style="display:block;background:#fff;color:#111827;padding:18px 32px;border-radius:12px;text-decoration:none;font-weight:700;border:2px solid #111827;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.1);font-size:16px;letter-spacing:0.5px;">
                                🛍️ CONTINUE SHOPPING
                            </a>
                        </div>

                        <!-- Trust & Benefits -->
                        <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);padding:20px;border-radius:12px;border:2px solid #3b82f6;margin-bottom:28px;">
                            <div style="text-align:center;margin-bottom:16px;">
                                <div style="font-size:16px;font-weight:800;color:#1e40af;margin-bottom:12px;">💎 PREMIUM BENEFITS</div>
                            </div>
                            <div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:space-around;">
                                <div style="text-align:center;flex:1;min-width:120px;">
                                    <div style="font-size:28px;margin-bottom:6px;">🔒</div>
                                    <div style="font-size:12px;font-weight:700;color:#1e40af;">Secure<br/>Payment</div>
                                </div>
                                <div style="text-align:center;flex:1;min-width:120px;">
                                    <div style="font-size:28px;margin-bottom:6px;">✓</div>
                                    <div style="font-size:12px;font-weight:700;color:#1e40af;">Quality<br/>Guaranteed</div>
                                </div>
                                <div style="text-align:center;flex:1;min-width:120px;">
                                    <div style="font-size:28px;margin-bottom:6px;">↩️</div>
                                    <div style="font-size:12px;font-weight:700;color:#1e40af;">Easy<br/>Returns</div>
                                </div>
                                <div style="text-align:center;flex:1;min-width:120px;">
                                    <div style="font-size:28px;margin-bottom:6px;">💬</div>
                                    <div style="font-size:12px;font-weight:700;color:#1e40af;">24/7<br/>Support</div>
                                </div>
                            </div>
                        </div>

                        <!-- Customer Care -->
                        <div style="background:linear-gradient(135deg,#fefce8,#fef3c7);padding:24px;border-radius:12px;border:2px solid #fbbf24;margin-bottom:20px;text-align:center;">
                            <div style="font-size:28px;margin-bottom:12px;">🎧</div>
                            <div style="font-size:16px;font-weight:800;color:#78350f;margin-bottom:8px;">Need Assistance?</div>
                            <div style="font-size:13px;color:#92400e;margin-bottom:16px;">Our premium support team is here to help</div>
                            <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;">
                                <a href="mailto:support@eshopperr.me" style="display:inline-flex;align-items:center;gap:6px;background:#fff;color:#78350f;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;border:2px solid #fbbf24;box-shadow:0 2px 6px rgba(251,191,36,0.2);">
                                    📧 Email Us
                                </a>
                                <a href="https://wa.me/918447859784" style="display:inline-flex;align-items:center;gap:6px;background:#25D366;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;box-shadow:0 2px 6px rgba(37,211,102,0.3);">
                                    💬 WhatsApp
                                </a>
                            </div>
                        </div>

                    </div>

                    <!-- Social Footer -->
                    <div style="background:linear-gradient(135deg,#111827,#0f0f0f);padding:32px 24px;text-align:center;">
                        <div style="margin-bottom:20px;">
                            <div style="font-size:14px;color:#d4af37;font-weight:700;margin-bottom:16px;letter-spacing:1px;">FOLLOW US</div>
                            <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;">
                                <a href="https://facebook.com" style="display:inline-block;width:40px;height:40px;background:#1877f2;border-radius:50%;display:flex;align-items:center;justify-content:center;text-decoration:none;color:#fff;font-size:18px;box-shadow:0 2px 8px rgba(24,119,242,0.4);">f</a>
                                <a href="https://instagram.com" style="display:inline-block;width:40px;height:40px;background:linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%);border-radius:50%;display:flex;align-items:center;justify-content:center;text-decoration:none;color:#fff;font-size:18px;box-shadow:0 2px 8px rgba(188,24,136,0.4);">📷</a>
                                <a href="https://twitter.com" style="display:inline-block;width:40px;height:40px;background:#1da1f2;border-radius:50%;display:flex;align-items:center;justify-content:center;text-decoration:none;color:#fff;font-size:18px;box-shadow:0 2px 8px rgba(29,161,242,0.4);">🐦</a>
                            </div>
                        </div>
                        <div style="border-top:1px solid rgba(212,175,55,0.3);padding-top:20px;">
                            <div style="font-size:20px;font-weight:800;background:linear-gradient(135deg,#ffd700,#d4af37);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:8px;">✨ EShoppper</div>
                            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                                © ${new Date().getFullYear()} Eshopper Boutique Luxe. All rights reserved.<br/>
                                <a href="https://eshopperr.me" style="color:#d4af37;text-decoration:none;font-weight:600;">eshopperr.me</a>
                            </p>
                        </div>
                    </div>

                </div>
            </body>
            </html>
        `;

        // 🔴 STRICT BREVO v3 PAYLOAD FORMAT
        const mailPayload = {
            sender: { 
                name: 'Eshopper',
                email: 'support@eshopperr.me'
            },
            to: [{ 
                email: toEmail, 
                name: displayName 
            }],
            subject: `✅ Order Confirmed - ${orderId} | Eshopper Boutique`,
            htmlContent,
            replyTo: { email: 'support@eshopperr.me' }
        };

        // 🔴 ATTACHMENT HANDLING - Validate before adding
        if (invoiceBase64 && typeof invoiceBase64 === 'string' && invoiceBase64.trim().length > 0) {
            try {
                // Validate base64 format (only alphanumeric, +, /, =)
                if (!/^[A-Za-z0-9+/=]+$/.test(invoiceBase64.trim())) {
                    console.warn('⚠️ Invalid base64 format for invoice, skipping attachment');
                } else {
                    mailPayload.attachment = [
                        {
                            content: invoiceBase64.trim(),
                            name: `Invoice-${orderId}.pdf`
                        }
                    ];
                    console.log(`✅ Invoice attachment added (${(invoiceBase64.length / 1024).toFixed(1)}KB)`);
                }
            } catch (attachError) {
                console.warn('⚠️ Failed to process invoice attachment:', attachError.message);
                // Continue without attachment - don't fail the email
            }
        } else {
            console.log('⏭️  No invoice PDF to attach (will send email without attachment)');
        }

        console.log(`📤 Sending confirmation email to ${toEmail}...`);
        const response = await axios.post('https://api.brevo.com/v3/smtp/email', mailPayload, {
            headers: {
                'api-key': BREVO_KEY,
                'content-type': 'application/json',
                'accept': 'application/json'
            },
            timeout: 30000
        });
        
        console.log(`✅ Confirmation email sent successfully (Status: ${response.status}, Message ID: ${response.data.messageId})`);
        return true;

    } catch (error) {
        console.error('❌ Confirmation email failed:', {
            status: error.response?.status,
            message: error.response?.data?.message || error.message,
            data: error.response?.data,
            endpoint: 'brevo.com/v3/smtp/email'
        });
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
                invoiceBase64: invoiceBuffer ? invoiceBuffer.toString('base64') : null
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
                    .slice(0, 4)
                    .map((item, idx) => `${idx + 1}. ${item.name} × ${item.qty} = Rs.${Number(item.total || 0).toLocaleString('en-IN')}`)
                    .join('\n');

                const caption = `Luxury Experience Starts Now! 💎\n\nHello ${user.name || 'Customer'}, we are thrilled to process your boutique order #${orderId}.\n\n🧾 Order Value: Rs.${Number(payable || 0).toLocaleString('en-IN')}\n💳 Payment: ${paymentMethod || 'COD'}\n📦 Items:\n${itemSummary}${cleanProducts.length > 4 ? `\n+ ${cleanProducts.length - 4} more item(s)` : ''}\n\nWhat happens next?\nOur artisans are now hand-preparing your selection for premium delivery.\n\n📍 Track Your Journey: https://eshopperr.me/order-tracking/${orderId}\n🎧 Support: support@eshopperr.me`;

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
            estimatedArrival: order.estimatedArrival || null,
            orderDate: order.orderDate || order.createdAt,
            updatedAt: order.updatedAt || order.createdAt
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

        if (!orderId || !userId) {
            return res.status(400).json({ message: 'orderId and userId are required' });
        }

        const order = await Order.findOne({ orderId, userid: userId }).lean();
        if (!order) return res.status(404).json({ message: 'Order not found' });

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

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Invoice-${order.orderId}.pdf"`);
        return res.send(pdfBuffer);
    } catch (e) {
        console.error('❌ Invoice generation error:', e.message);
        if (process.env.SENTRY_DSN) Sentry.captureException(e);
        return res.status(500).json({ message: 'Failed to generate invoice' });
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