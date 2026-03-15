// 📦 1. CORE ENVIRONMENT & MONITORING
require('dotenv').config();
const Sentry = require("@sentry/node");

if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'production',
        tracesSampleRate: 1.0,
    });
    console.log('✅ Sentry active on production environment');
}

// 🔐 2. FIREBASE ADMIN SDK (Advanced JSON Handler)
const admin = require('firebase-admin');
try {
    const rawJson = process.env.FIREBASE_CONFIG_JSON;
    if (rawJson && !admin.apps.length) {
        const credentials = JSON.parse(rawJson.trim().replace(/\\n/g, '\n'));
        admin.initializeApp({ credential: admin.credential.cert(credentials) });
        console.log(`✅ Firebase Admin initialized: ${credentials.project_id}`);
    } else if (!admin.apps.length) {
        admin.initializeApp({ credential: admin.credential.cert(require('./firebase-admin.json')) });
        console.log('📂 Firebase: Loaded from local JSON file');
    }
} catch (e) { 
    console.warn('⚠️  Firebase Admin initialization skipped/failed:', e.message); 
}

// 🚀 3. FRAMEWORKS & INFRASTRUCTURE
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
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const app = express();
const httpServer = http.createServer(app);

// 🔒 4. NETWORK & SECURITY LAYERS
app.set('trust proxy', 1); // 🚨 Critical for Cloudflare & Rate-limiters
app.use(express.json());
app.use(helmet({ contentSecurityPolicy: false }));

// 🌐 BULLETPROOF PRODUCTION CORS (Solves 'unauthorized-domain' issues)
const corsOptions = {
    origin: ["https://eshopperr.me", "https://www.eshopperr.me", "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"]
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ⚡ REAL-TIME UPDATES (Socket.io for Tracking)
const io = new Server(httpServer, {
    cors: { origin: ["https://eshopperr.me", "http://localhost:3000"], credentials: true }
});

io.on('connection', (socket) => {
    socket.on('join-room', (userId) => {
        socket.join(`user:${userId}`);
        console.log(`📡 User joined tracking room: user:${userId}`);
    });
});

// 📸 5. MEDIA OPTIMIZATION (Cloudinary)
cloudinary.config({ 
    cloud_name: process.env.CLOUD_NAME, 
    api_key: process.env.CLOUD_API_KEY, 
    api_secret: process.env.CLOUD_API_SECRET 
});
const storage = new CloudinaryStorage({ 
    cloudinary: cloudinary, 
    params: { folder: 'eshoper_master', allowedFormats: ['jpg', 'png', 'jpeg'] } 
});
const upload = multer({ storage });

// 📄 6. PDF INVOICE ENGINE (Puppeteer on Railway)
const generateInvoice = async (order) => {
    try {
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            executablePath: '/usr/bin/google-chrome' // Linked to NIXPACKS_PKGS=chromium
        });
        const page = await browser.newPage();
        const html = `<html><body style="font-family:serif;"><h1>Tax Invoice: ${order.orderId}</h1><p>Amt: ₹${order.finalAmount}</p></body></html>`;
        await page.setContent(html);
        const pdf = await page.pdf({ format: 'A4' });
        await browser.close();
        return pdf.toString('base64');
    } catch (e) { console.error("❌ PDF Fail:", e.message); return null; }
};

// 📧 7. MULTI-NOTIFIER SYSTEM (WhatsApp + Email REST API)
const notifyUser = async ({ to, type, data }) => {
    const BREVO_KEY = process.env.BREVO_API_KEY?.trim();
    const EVO_URL = process.env.EVOLUTION_API_URL?.trim();
    const EVO_KEY = process.env.EVOLUTION_API_KEY?.trim();
    
    // --- 📩 Email Alert ---
    const emailPayload = {
        sender: { name: "Eshopper Boutique", email: "support@eshopperr.me" },
        to: [{ email: to }],
        subject: data.subject || "Order Status Update",
        htmlContent: data.html
    };
    if (data.pdf) emailPayload.attachment = [{ content: data.pdf, name: `Invoice-${data.id}.pdf` }];

    try {
        await axios.post('https://api.brevo.com/v3/smtp/email', emailPayload, { headers: { 'api-key': BREVO_KEY } });
        console.log(`✉️ Email dispatched to: ${to}`);
    } catch (e) { console.error("⚠️ Email Skip:", e.message); }

    // --- 📲 WhatsApp Alert (if number available) ---
    if (data.phone) {
        const phoneNo = data.phone.startsWith('91') ? data.phone : `91${data.phone}`;
        try {
            await axios.post(`${EVO_URL}/message/sendText/eshopper_bot`, {
                number: phoneNo, text: data.msg 
            }, { headers: { 'apikey': EVO_KEY } });
            console.log(`📱 WhatsApp BEEP to: ${phoneNo}`);
        } catch (e) { console.error("⚠️ WhatsApp Skip:", e.message); }
    }
};

// 🔧 8. MONGOOSE SCHEMA & LOGIC
const jsonX = { virtuals: true, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } };
const userSchema = new mongoose.Schema({ uid: String, name: String, email: {type: String, unique: true}, phone: String, provider: String }, { timestamps: true, toJSON: jsonX });
const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', new mongoose.Schema({ name: String, baseprice: Number, pic1: String, subcategory: String }, { toJSON: jsonX }));
const Order = mongoose.model('Order', new mongoose.Schema({ orderId: String, userid: String, orderStatus: {type: String, default: 'Ordered'}, finalAmount: Number }, { timestamps: true, toJSON: jsonX }));

// 📝 9. CORE API ROUTES
// Auth Sync (Firebase Link)
app.post('/api/auth-sync', async (req, res) => {
    try {
        const { idToken, uid, email, name, pic, provider } = req.body;
        await admin.auth().verifyIdToken(idToken); // Security verification
        let user = await User.findOneAndUpdate({ uid }, { name, email, pic, provider }, { upsert: true, new: true });
        res.json(user);
    } catch (e) { res.status(401).json({ error: "Invalid identity" }); }
});

// AI Fashion Assistant (Live Inventory Search)
app.post('/api/chat', async (req, res) => {
    try {
        const { prompt } = req.body;
        const products = await Product.find({}, 'name baseprice').limit(15);
        const inventory = products.map(p => `${p.name}`).join(", ");
        
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: `You are 'Luxe Bot' of eShopper Boutique. Stock includes: ${inventory}. Be stylish & polite.` 
        });
        
        const result = await model.generateContent(prompt);
        res.json({ text: result.response.text() });
    } catch (e) { res.json({ text: "Our stylist is adjusting gowns. Try in a sec!" }); }
});

// Products & Generic Models
app.get('/product', async (req, res) => res.json(await Product.find().sort({ _id: -1 })));

// 🛠️ Order Status & Real-time Trigger
app.post('/api/update-order-status', async (req, res) => {
    try {
        const { id, status } = req.body;
        const order = await Order.findByIdAndUpdate(id, { orderStatus: status }, { new: true });
        
        // Instant WebSocket emit
        io.to(`user:${order.userid}`).emit('statusUpdate', { status });

        // Instant Notification (Luxe Automation)
        const user = await User.findOne({ uid: order.userid });
        const pdfBase64 = (status === 'Delivered') ? await generateInvoice(order) : null;
        
        await notifyUser({
            to: user.email,
            data: { 
                id: order.orderId, 
                subject: `Luxe Update: ${status}`, 
                html: `<h1>Order Status: ${status}</h1>`, 
                msg: `Hello! Your order #${order.orderId} is now ${status}. Tracking: eshopperr.me/orders`,
                phone: user.phone,
                pdf: pdfBase64
            }
        });

        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Update failed" }); }
});

// 🔴 GLOBAL SENTRY & ERROR HANDLER (Production Safeguard)

app.use((err, req, res, next) => {
    console.error(`💥 Runtime Incident: ${req.method} ${req.path} -> ${err.message}`);
    res.status(500).json({ success: false, message: "Our boutique concierge is fixing this shortly." });
});

// 🏁 10. REFUEL AND LAUNCH
const MONGO_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 5000;

async function bootstrap() {
    try {
        await mongoose.connect(MONGO_URI, { dbName: 'eshoper' });
        console.log("💎 eShopper Master Logic: CONNECTED");
        httpServer.listen(PORT, '0.0.0.0', () => console.log(`🚀 Production live: https://api.eshopperr.me`));
    } catch (e) { 
        console.error("💀 Bootstrap failed:", e.message); 
        process.exit(1);
    }
}

bootstrap();