const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const SibApiV3Sdk = require('@getbrevo/brevo');
require('dotenv').config();

const app = express();

const allowedOrigins = [
    'https://eshopperr.me',
    'https://eshopperr.vercel.app',
    process.env.FRONTEND_URL || 'https://eshopperr.me',
    process.env.REACT_APP_FRONTEND_URL || 'https://eshopperr.me'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow if no origin (like mobile apps or server requests)
        if (!origin) {
            return callback(null, true);
        }
        
        // Allow localhost (any port) for development
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
        }
        
        // Allow production URLs
        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }
        
        callback(new Error('CORS identity blocked'));
    },
    credentials: true
}));

app.use(express.json());

// 🔧 ENHANCED MONGODB CONNECTION SETUP
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("❌ CRITICAL: Missing MONGODB_URI or MONGO_URI in environment variables");
    console.error("   Please set MONGODB_URI in your Railway/Render environment");
    process.exit(1);
}

console.log("🔍 Attempting MongoDB connection...");

// 🔧 CLOUDINARY CONFIGURATION SETUP
// Railway uses CLOUD_* naming convention
const CLOUDINARY_CLOUD_NAME = process.env.CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUD_API_KEY || process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUD_API_SECRET || process.env.CLOUDINARY_API_SECRET;

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

const storage = new CloudinaryStorage({ cloudinary: cloudinary, params: { folder: 'eshoper_master', allowedFormats: ['jpg', 'png', 'jpeg'] } });
const upload = multer({ storage }).fields([
    { name: 'pic', maxCount: 1 }, { name: 'pic1', maxCount: 1 }, 
    { name: 'pic2', maxCount: 1 }, { name: 'pic3', maxCount: 1 }, 
    { name: 'pic4', maxCount: 1 }
]);

// Configure Brevo SDK
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
let brevoConfigured = false;

const configureBrevo = () => {
    if (!brevoConfigured && process.env.BREVO_API_KEY) {
        apiInstance.setApiKey(SibApiV3Sdk.ApiClient.instance.authentications['api-key'], process.env.BREVO_API_KEY.trim());
        brevoConfigured = true;
    }
};

const sendMail = (to, otp) => {
    return new Promise((resolve, reject) => {
        const BREVO_KEY = process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.trim() : null;
        
        if (!BREVO_KEY) {
            return reject(new Error("❌ Brevo API Key Missing in Environment"));
        }

        configureBrevo();

        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
        sendSmtpEmail.subject = "🔐 Security Verification - Eshopper";
        sendSmtpEmail.htmlContent = `
            <div style="font-family:Arial;padding:20px;text-align:center;background:#f9f9f9;border-radius:10px;">
                <h2 style="color:#333;">Verification Code</h2>
                <h1 style="letter-spacing:10px;color:#17a2b8;background:#fff;padding:15px;display:inline-block;border-radius:5px;font-weight:bold;">${otp}</h1>
                <p style="color:#666;font-size:14px;">This code is valid for 10 minutes only.</p>
                <p style="color:#999;font-size:12px;">If you didn't request this, please ignore this email.</p>
            </div>
        `;
        sendSmtpEmail.sender = { name: "Eshopper", email: "theafzalhussain786@gmail.com" };
        sendSmtpEmail.to = [{ email: to }];
        sendSmtpEmail.replyTo = { email: "support@eshopper.com" };

        apiInstance.sendTransacEmail(sendSmtpEmail)
            .then(() => {
                console.log("✅ OTP Email Sent Successfully to:", to);
                resolve(true);
            })
            .catch((error) => {
                console.error("❌ Brevo Email Error:", error.response?.body || error.message);
                reject(new Error(`Failed to send OTP: ${error.message}`));
            });
    });
};

const toJSONCustom = { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } };
const opts = { toJSON: toJSONCustom, timestamps: true };

const OTPRecord = mongoose.model('OTPRecord', new mongoose.Schema({ email: String, otp: String, createdAt: { type: Date, expires: 600, default: Date.now } }));
const User = mongoose.model('User', new mongoose.Schema({ name: String, username: { type: String, unique: true }, email: { type: String, unique: true }, phone: String, password: { type: String, required: true }, role: { type: String, default: "User" }, pic: String, addressline1: String, city: String, state: String, pin: String, otp: String, otpExpires: Date }, opts));
const Product = mongoose.model('Product', new mongoose.Schema({ name: String, maincategory: String, subcategory: String, brand: String, color: String, size: String, baseprice: Number, discount: Number, finalprice: Number, stock: String, description: String, pic1: String, pic2: String, pic3: String, pic4: String }, opts));
const Maincategory = mongoose.model('Maincategory', new mongoose.Schema({ name: String }, opts));
const Subcategory = mongoose.model('Subcategory', new mongoose.Schema({ name: String }, opts));
const Brand = mongoose.model('Brand', new mongoose.Schema({ name: String }, opts));
const Cart = mongoose.model('Cart', new mongoose.Schema({ userid: String, productid: String, name: String, color: String, size: String, price: Number, qty: Number, total: Number, pic: String }, opts));
const Wishlist = mongoose.model('Wishlist', new mongoose.Schema({ userid: String, productid: String, name: String, color: String, size: String, price: Number, pic: String }, opts));
const Checkout = mongoose.model('Checkout', new mongoose.Schema({ userid: String, paymentmode: String, orderstatus: { type: String, default: "Order Placed" }, paymentstatus: { type: String, default: "Pending" }, totalAmount: Number, shippingAmount: Number, finalAmount: Number, products: Array }, opts));
const Contact = mongoose.model('Contact', new mongoose.Schema({ name: String, email: String, phone: String, subject: String, message: String, status: {type: String, default: "Active"} }, opts));
const Newslatter = mongoose.model('Newslatter', new mongoose.Schema({ email: { type: String, unique: true } }, opts));

app.post('/api/send-otp', async (req, res) => {
    try {
        const { email, type } = req.body;
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const user = await User.findOne({ $or: [{ email }, { username: email }] });

        if (type === 'forget' && !user) return res.status(404).json({ message: "User not found" });
        if (type === 'signup' && user) return res.status(400).json({ message: "Email already registered" });

        if (user) {
            user.otp = otp; user.otpExpires = new Date(Date.now() + 10 * 60000); await user.save();
        } else {
            await OTPRecord.findOneAndUpdate({ email }, { otp }, { upsert: true });
        }

        await sendMail(email, otp);
        res.json({ result: "Done", message: "OTP sent successfully" });
    } catch (e) { 
        console.error("❌ Email Error:", e.message);
        res.status(500).json({ error: "Failed to send OTP. Please try again.", details: e.message }); 
    }
});

app.post('/api/reset-password', async (req, res) => {
    try {
        const { username, password, otp } = req.body;
        const user = await User.findOne({ $or: [{ email: username }, { username: username }] });
        if (user && user.otp === otp && user.otpExpires > Date.now()) {
            const salt = await bcrypt.genSalt(10); user.password = await bcrypt.hash(password, salt);
            user.otp = undefined; await user.save(); res.json({ result: "Done" });
        } else res.status(400).send("Invalid OTP");
    } catch (e) { res.status(500).json(e); }
});

app.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (user && await bcrypt.compare(req.body.password, user.password)) res.json(user);
        else res.status(401).json({ message: "Invalid Credentials" });
    } catch (e) { res.status(500).json(e); }
});

const handle = (path, Model, useUpload = false) => {
    app.get(path, async (req, res) => res.json(await Model.find().sort({_id:-1})));
    app.get(`${path}/:id`, async (req, res) => res.json(await Model.findById(req.params.id)));
    app.post(path, useUpload ? upload : (req,res,next)=>next(), async (req, res) => {
        try {
            if (path === '/user' && req.body.otp) {
                const record = await OTPRecord.findOne({ email: req.body.email, otp: req.body.otp });
                if (!record) return res.status(400).json({ message: "Invalid OTP" });
                await OTPRecord.deleteOne({ email: req.body.email });
            }
            if (path === '/user') { const salt = await bcrypt.genSalt(10); req.body.password = await bcrypt.hash(req.body.password, salt); }
            let d = new Model(req.body);
            if (req.files) {
                if (req.files.pic) d.pic = req.files.pic[0].path;
                if (req.files.pic1) d.pic1 = req.files.pic1[0].path;
                if (req.files.pic2) d.pic2 = req.files.pic2[0].path;
                if (req.files.pic3) d.pic3 = req.files.pic3[0].path;
                if (req.files.pic4) d.pic4 = req.files.pic4[0].path;
            }
            await d.save(); res.status(201).json(d);
        } catch (e) { res.status(400).json(e); }
    });
    app.put(`${path}/:id`, useUpload ? upload : (req,res,next)=>next(), async (req, res) => {
        try {
            let upData = { ...req.body };
            if (req.files) { if (req.files.pic) upData.pic = req.files.pic[0].path; if (req.files.pic1) upData.pic1 = req.files.pic1[0].path; }
            if (path === '/user' && req.body.password && String(req.body.password).length < 25) {
                const salt = await bcrypt.genSalt(10); upData.password = await bcrypt.hash(upData.password, salt);
            } else if (path === '/user') { delete upData.password; }
            const d = await Model.findByIdAndUpdate(req.params.id, upData, { new: true }); res.json(d);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
    app.delete(`${path}/:id`, async (req, res) => { await Model.findByIdAndDelete(req.params.id); res.json({ result: "Done" }); });
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

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await mongoose.connect(MONGO_URI, {
            autoIndex: true,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            retryWrites: true,
            w: 'majority'
        });
        
        console.log("✅ MongoDB connected successfully");
        console.log(`📊 Database: ${mongoose.connection.name}`);
        console.log(`🔗 State: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Master Server Live on ${PORT}`);
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
    console.warn('⚠️  Mongoose disconnected from MongoDB');
});

startServer();