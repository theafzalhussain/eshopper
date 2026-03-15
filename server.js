// ========================================================
// 1. ENVIRONMENT & MONITORING (Must be at the TOP)
// ========================================================
require('dotenv').config();
const Sentry = require("@sentry/node");

if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'production',
        tracesSampleRate: 1.0,
    });
    // Express handlers will be added to the app below
    console.log('✅ Sentry Security Guard: Active');
}

// ========================================================
// 2. FIREBASE ADMIN SDK (Secured with Environment Variable)
// ========================================================
const admin = require('firebase-admin');
try {
    const rawJson = process.env.FIREBASE_CONFIG_JSON;
    if (rawJson && !admin.apps.length) {
        // Fix for Railway multiline JSON string issues
        const fbCreds = JSON.parse(rawJson.trim().replace(/\\n/g, '\n'));
        admin.initializeApp({ credential: admin.credential.cert(fbCreds) });
        console.log(`✅ Firebase Auth: Active for ${fbCreds.project_id}`);
    } else if (!admin.apps.length) {
        admin.initializeApp({ credential: admin.credential.cert(require('./firebase-admin.json')) });
    }
} catch (e) { 
    console.warn('⚠️ Firebase Admin disabled:', e.message); 
}

// ========================================================
// 3. CORE FRAMEWORK IMPORTS
// ========================================================
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

const app = express();
const httpServer = http.createServer(app);

// ========================================================
// SENTRY EXPRESS MIDDLEWARE (Request & Error Handlers)
// ========================================================
if (process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.requestHandler());
}

// ========================================================
// 4. SECURITY & NETWORKING CONFIG
// ========================================================
app.set('trust proxy', 1); // Crucial for Cloudflare/Railway Rate Limits
app.use(express.json());
app.use(helmet({ contentSecurityPolicy: false }));

// BULLETPROOF PRODUCTION CORS
app.use(cors({
    origin: ["https://eshopperr.me", "https://www.eshopperr.me", "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"]
}));
app.options('*', cors()); // Correctly handle preflight for all routes

// REAL-TIME UPDATES ENGINE (Socket.io)
const io = new Server(httpServer, {
    cors: { origin: "*", credentials: true }
});

io.on('connection', (socket) => {
    socket.on('join-order-room', (userId) => { 
        socket.join(`user:${userId}`);
        console.log(`📡 Client tracking established for: ${userId}`);
    });
});

// ========================================================
// 5. EXTERNAL SERVICES CONFIG (Media & Email)
// ========================================================
cloudinary.config({ 
    cloud_name: process.env.CLOUD_NAME, 
    api_key: process.env.CLOUD_API_KEY, 
    api_secret: process.env.CLOUD_API_SECRET 
});
const storage = new CloudinaryStorage({ cloudinary, params: { folder: 'eshoper_master', allowedFormats: ['jpg', 'png', 'jpeg'] } });
const upload = multer({ storage });

// 📧 RELIABLE REST API EMAIL SENDER (Brevo)
const sendMail = async (to, otp) => {
    try {
        const BREVO_KEY = process.env.BREVO_API_KEY?.trim();
        if (!BREVO_KEY) throw new Error("Missing Brevo Key");
        
        const emailData = {
            sender: { name: "eShopper Boutique", email: "support@eshopperr.me" },
            to: [{ email: to }],
            subject: `🔒 Your Access Code: ${otp}`,
            htmlContent: `
                <div style="font-family:sans-serif; text-align:center; padding:40px; background:#f4f4f4;">
                    <div style="background:white; padding:30px; border-radius:20px; box-shadow:0 4px 20px rgba(0,0,0,0.05);">
                        <h1 style="color:#D4AF37; margin:0; letter-spacing:3px;">eSHOPPER</h1>
                        <p style="color:#666;">Premium Boutique Security</p>
                        <div style="font-size:32px; font-weight:bold; letter-spacing:10px; border:2px dashed #D4AF37; padding:15px; margin:25px 0;">${otp}</div>
                        <p style="color:#999; font-size:12px;">Valid for 10 minutes only.</p>
                    </div>
                </div>`
        };

        const res = await axios.post('https://api.brevo.com/v3/smtp/email', emailData, { 
            headers: { 'api-key': BREVO_KEY, 'Content-Type': 'application/json' } 
        });
        console.log(`✉️ Professional Mail Dispatched: ID ${res.data.messageId}`);
        return true;
    } catch (e) { 
        console.error("❌ Email System Delayed:", e.message); 
        return false; 
    }
};

// 📲 REAL-TIME WHATSAPP SENDER (Evolution API)
const sendWA = async (phone, msg) => {
    try {
        const fullNo = phone.startsWith('91') ? phone : `91${phone}`;
        await axios.post(`${process.env.EVOLUTION_API_URL}/message/sendText/eshopper_bot`, 
        { number: fullNo, text: msg },
        { headers: { 'apikey': process.env.WHATSAPP_TOKEN?.trim() }});
        console.log(`📱 WhatsApp Alert Sent: ${fullNo}`);
    } catch (e) { console.warn("⚠️ WhatsApp delivery skipped."); }
};

// ========================================================
// 6. DATABASE MODELS
// ========================================================
const dbSchemaX = { timestamps: true, toJSON: { virtuals: true, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } } };

const User = mongoose.model('User', new mongoose.Schema({ 
    uid: { type: String, unique: true }, 
    email: { type: String, unique: true }, 
    name: String, 
    phone: String, 
    pic: String, 
    provider: String, 
    otp: String 
}, dbSchemaX));

const Product = mongoose.model('Product', new mongoose.Schema({ 
    name: String, 
    baseprice: Number, 
    finalprice: Number, 
    pic1: String, 
    maincategory: String 
}, dbSchemaX));

const Order = mongoose.model('Order', new mongoose.Schema({ 
    orderId: String, 
    userid: String, 
    orderStatus: { type: String, default: 'Ordered' }, 
    totalAmount: Number, 
    shippingAddress: Object, 
    products: Array 
}, dbSchemaX));

const Maincategory = mongoose.model('Maincategory', new mongoose.Schema({ name: String }, dbSchemaX));
const Subcategory = mongoose.model('Subcategory', new mongoose.Schema({ name: String }, dbSchemaX));
const Brand = mongoose.model('Brand', new mongoose.Schema({ name: String }, dbSchemaX));

// ========================================================
// 7. API ROUTES & AUTOMATIONS
// ========================================================

// Sync Auth between Client (Firebase) and Backend (MongoDB)
app.post('/api/auth-sync', async (req, res) => {
    try {
        const { idToken, uid, email, name, pic, provider } = req.body;
        await admin.auth().verifyIdToken(idToken); // Securely verify Identity
        let user = await User.findOneAndUpdate({ uid }, { name, email, pic, provider }, { upsert: true, new: true });
        res.json(user);
    } catch (e) { res.status(401).json({ error: "Unauthorized Login Attempt" }); }
});

// AI Fashion Assistant Route
app.post('/api/chat', async (req, res) => {
    try {
        const { prompt } = req.body;
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());
        const products = await Product.find({}, 'name').limit(15);
        const invSummary = products.map(p => p.name).join(", ");
        
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: `You are Luxe Stylist AI for 'eShopper Boutique'. Stock: ${invSummary}. Brief, professional replies only.`
        });
        
        const result = await model.generateContent(prompt);
        res.json({ text: result.response.text() });
    } catch (e) { res.json({ text: "AI is re-stocking gowns. Be back shortly!" }); }
});

// Generic Handle Helper (as per project history)
const handleRoute = (path, Model, allowUpload = false) => {
    app.get(path, async (req, res) => res.json(await Model.find().sort({_id: -1}))); 
    if (allowUpload) {
        // Accept single file named 'pic' (common for user/product)
        app.post(path, upload.single('pic'), async (req, res) => {
            try {
                const doc = new Model(req.body);
                if (req.file) { doc.pic = req.file.path; }
                await doc.save(); res.status(201).json(doc);
            } catch (e) { res.status(400).json(e); }
        });
    } else {
        app.post(path, async (req, res) => {
            try {
                const doc = new Model(req.body);
                await doc.save(); res.status(201).json(doc);
            } catch (e) { res.status(400).json(e); }
        });
    }
    app.delete(`${path}/:id`, async (req, res) => { await Model.findByIdAndDelete(req.params.id); res.json({ result: "Done" }); });
};

// Registered Endpoints
handleRoute('/user', User, true);
handleRoute('/product', Product, true);
handleRoute('/maincategory', Maincategory);
handleRoute('/subcategory', Subcategory);
handleRoute('/brand', Brand);

// Special Order Update Trigger (WhatsApp + Email + Sockets)
app.patch('/api/update-order-status/:id', async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findByIdAndUpdate(req.params.id, { orderStatus: status }, { new: true });
        const user = await User.findOne({ uid: order.userid });
        
        // Instant Feedback
        io.to(`user:${order.userid}`).emit('statusUpdate', { orderId: order.orderId, status });
        
        // Multi-Channel Notifications
        if (user) {
            await sendWA(user.phone, `eShopper Status Update: Your Order #${order.orderId} is now ${status}! Check details at eshopperr.me/orders`);
            // Custom subjects/logic for emails can go here
        }
        res.json({ success: true, status: order.orderStatus });
    } catch (err) { res.status(500).json({ error: "Automation failed" }); }
});

// ========================================================
// 8. FINAL SYSTEM BOOT
// ========================================================

// Sentry error handler should be after all routes
if (process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.errorHandler());
}

// Simple logging at start
app.use((req, res, next) => { console.log(`🌍 Request: ${req.method} ${req.path}`); next(); });

const MONGO_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 5000;

async function bootstrap() {
    try {
        await mongoose.connect(MONGO_URI, { dbName: 'eshoper' }); // Fixed 'eshoper' spelling ✅
        console.log("💎 System Core Initialized & Connected to Atlas Premium.");
        httpServer.listen(PORT, '0.0.0.0', () => {
            console.log(`\n************************************`);
            console.log(`🚀 API LIVE: https://api.eshopperr.me`);
            console.log(`🛒 APP: https://eshopperr.me`);
            console.log(`************************************\n`);
        });
    } catch (e) { console.error("❌ BOOTSTRAP FAILURE:", e.message); process.exit(1); }
}

bootstrap();