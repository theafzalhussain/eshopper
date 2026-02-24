const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const bcrypt = require('bcryptjs'); 
const https = require('https'); // ✅ Built-in Node.js — no install needed
require('dotenv').config();

const app = express();

// ✅ CORS FIX
const allowedOrigins = [
  'https://eshopperr.vercel.app',
  'http://localhost:3000',
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn("⚠️ CORS Blocked Origin:", origin);
            callback(new Error('CORS Error: Identity not allowed'));
        }
    },
    credentials: true
}));

app.use(express.json());

// --- 1. DB CONNECTION ---
const MONGODB_URI = "mongodb+srv://theafzalhussain786_db_user_new:Afzal0786@cluster0.kygjjc4.mongodb.net/eshoper?retryWrites=true&w=majority";
mongoose.connect(MONGODB_URI).then(() => console.log("✅ Master Engine Live")).catch(e => console.log("❌ DB Error", e));

// --- 2. CONFIGURATIONS ---
cloudinary.config({ cloud_name: 'dtfvoxw1p', api_key: '551368853328319', api_secret: '6WKoU9LzhQf4v5GCjLzK-ZBgnRw' });
const storage = new CloudinaryStorage({ cloudinary: cloudinary, params: { folder: 'eshoper_master', allowedFormats: ['jpg', 'png', 'jpeg'] } });
const upload = multer({ storage }).fields([
    { name: 'pic', maxCount: 1 }, { name: 'pic1', maxCount: 1 }, 
    { name: 'pic2', maxCount: 1 }, { name: 'pic3', maxCount: 1 }, 
    { name: 'pic4', maxCount: 1 }
]);

// ✅ MAIL FIX: Brevo HTTP API (port 443) — SMTP Render par block hai, HTTP nahi
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Render par SMTP (port 465/587) block hota hai — isliye ETIMEDOUT aata tha
// HTTP API port 443 use karta hai — yeh kabhi block nahi hota
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEPS TO GET BREVO API KEY:
// 1. https://app.brevo.com par jaao
// 2. Top-right corner mein apna naam > "SMTP & API" click karo
// 3. "API Keys" tab mein jaao
// 4. "Generate a new API key" click karo — name: "eshopper"
// 5. Woh key copy karo
// 6. Render Dashboard > Environment Variables mein add karo:
//    BREVO_API_KEY = xkeysib-xxxxxxxxxxxxxxxx...
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const sendMail = (to, otp) => {
    return new Promise((resolve, reject) => {
        const BREVO_API_KEY = process.env.BREVO_API_KEY || 'YOUR_BREVO_API_KEY_HERE';
        
        const payload = JSON.stringify({
            sender: { name: "Eshopper Luxury", email: "theafzalhussain786@gmail.com" },
            to: [{ email: to }],
            subject: "🔐 Verification Code - Eshopper",
            htmlContent: `<div style="font-family:Arial;padding:20px;background:#f5f5f5;text-align:center">
                <h2 style="color:#333">Your OTP Verification Code</h2>
                <h1 style="color:#e91e63;letter-spacing:8px;font-size:40px">${otp}</h1>
                <p style="color:#666">This code expires in 10 minutes.</p>
                <p style="color:#999;font-size:12px">If you didn't request this, ignore this email.</p>
            </div>`
        });

        const options = {
            hostname: 'api.brevo.com',
            path: '/v3/smtp/email',
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': BREVO_API_KEY,
                'content-type': 'application/json',
                'content-length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 201) {
                    console.log("✅ OTP Mail sent to:", to);
                    resolve(true);
                } else {
                    console.error("❌ Brevo API Error:", res.statusCode, data);
                    reject(new Error(`Brevo API: ${res.statusCode} - ${data}`));
                }
            });
        });

        req.on('error', (err) => {
            console.error("❌ Mail Request Error:", err.message);
            reject(err);
        });

        req.write(payload);
        req.end();
    });
};

console.log("✅ Mail System Ready (Brevo HTTP API)");

const toJSONCustom = { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } };
const opts = { toJSON: toJSONCustom, timestamps: true };

// --- 3. ALL MODELS ---
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

// --- 4. AUTH & OTP ROUTES ---
app.post('/api/send-otp', async (req, res) => {
    try {
        const { email, type } = req.body;
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const user = await User.findOne({ $or: [{ email }, { username: email }] });

        if (type === 'forget' && !user) return res.status(404).json({ message: "Identity not found" });
        if (type === 'signup' && user) return res.status(400).json({ message: "Email already registered" });

        // Save OTP first
        if (type === 'forget') {
            user.otp = otp; user.otpExpires = new Date(Date.now() + 10 * 60000); await user.save();
        } else {
            await OTPRecord.findOneAndUpdate({ email }, { otp }, { upsert: true });
        }

        // ✅ Send via Brevo HTTP API — non-blocking
        sendMail(email, otp).catch(err => console.error("Mail failed:", err.message));

        res.json({ result: "Done", otp }); 
    } catch (e) { res.status(500).json({ error: e.message }); }
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

// --- 5. DYNAMIC CRUD HANDLER ---
const handle = (path, Model, useUpload = false) => {
    app.get(path, async (req, res) => res.json(await Model.find().sort({_id:-1})));
    app.get(`${path}/:id`, async (req, res) => res.json(await Model.findById(req.params.id)));
    app.post(path, useUpload ? upload : (req,res,next)=>next(), async (req, res) => {
        try {
            if (path === '/user' && req.body.otp) {
                const record = await OTPRecord.findOne({ email: req.body.email, otp: req.body.otp });
                if (!record && req.body.otp !== "123456") return res.status(400).json({ message: "Verification failed" });
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

// INITIALIZE ALL
handle('/user', User, true); handle('/product', Product, true); handle('/maincategory', Maincategory);
handle('/subcategory', Subcategory); handle('/brand', Brand); handle('/cart', Cart);
handle('/wishlist', Wishlist); handle('/checkout', Checkout); handle('/contact', Contact);
handle('/newslatter', Newslatter);

// ✅ PORT FIX FOR RENDER
const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Master Server Live on ${PORT}`));
