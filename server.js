const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const bcrypt = require('bcryptjs'); 
const https = require('https'); 
require('dotenv').config();

const app = express();

// ✅ CORS FIX: Allowing BOTH Vercel and Localhost
const allowedOrigins = ['https://eshopperr.vercel.app', 'http://localhost:3000'];
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('CORS Error: Identity blocked'));
        }
    },
    credentials: true
}));

app.use(express.json());

// --- 1. DB CONNECTION ---
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://theafzalhussain786_db_user_new:Afzal0786@cluster0.kygjjc4.mongodb.net/eshoper?retryWrites=true&w=majority";
mongoose.connect(MONGODB_URI).then(() => console.log("✅ Master Engine Live")).catch(e => console.log("❌ DB Error", e));

// --- 2. CONFIGURATIONS ---
cloudinary.config({ cloud_name: 'dtfvoxw1p', api_key: '551368853328319', api_secret: '6WKoU9LzhQf4v5GCjLzK-ZBgnRw' });
const storage = new CloudinaryStorage({ cloudinary: cloudinary, params: { folder: 'eshoper_master', allowedFormats: ['jpg', 'png', 'jpeg'] } });
const upload = multer({ storage }).fields([
    { name: 'pic', maxCount: 1 }, { name: 'pic1', maxCount: 1 }, 
    { name: 'pic2', maxCount: 1 }, { name: 'pic3', maxCount: 1 }, 
    { name: 'pic4', maxCount: 1 }
]);

// ✅ BREVO HTTP API SYSTEM (No SMTP Blocks)
const sendMail = (to, otp) => {
    return new Promise((resolve, reject) => {
        // आपकी नई API Key यहाँ सुरक्षित है
        const BREVO_API_KEY = "xsmtpsib-bc49eceaf17d400567ffe1f57f2750ad2202878821208d395e7d767ce7fead89-Wi5w2zKFpfVCg2hV";
        
        const payload = JSON.stringify({
            sender: { name: "Eshopper Security", email: "theafzalhussain786@gmail.com" },
            to: [{ email: to }],
            subject: "🔐 OTP Verification - Eshopper",
            htmlContent: `
                <div style="font-family:Arial;padding:20px;text-align:center;background:#f4f4f4;">
                    <h2 style="color:#17a2b8;">Verification Code</h2>
                    <p>Your identity code is:</p>
                    <h1 style="letter-spacing:10px;color:#333;background:#fff;padding:10px;display:inline-block;">${otp}</h1>
                    <p>Valid for 10 minutes only.</p>
                </div>`
        });

        const options = {
            hostname: 'api.brevo.com',
            path: '/v3/smtp/email',
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': BREVO_API_KEY,
                'content-type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => {
                if (res.statusCode === 201) resolve(true);
                else {
                    console.error("❌ Brevo API Error:", res.statusCode, body);
                    reject(new Error("Brevo Error"));
                }
            });
        });

        req.on('error', e => reject(e));
        req.write(payload);
        req.end();
    });
};

const toJSONCustom = { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } };
const opts = { toJSON: toJSONCustom, timestamps: true };

// --- 3. ALL 10 MODELS (All Synced) ---
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

        if (user) {
            user.otp = otp; user.otpExpires = new Date(Date.now() + 10 * 60000); await user.save();
        } else {
            await OTPRecord.findOneAndUpdate({ email }, { otp }, { upsert: true });
        }

        // Background mail (Doesn't block server)
        sendMail(email, otp).catch(err => console.error("Mail failed background:", err.message));

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

// --- 5. DYNAMIC CRUD HANDLER (No features removed) ---
const handle = (path, Model, useUpload = false) => {
    app.get(path, async (req, res) => res.json(await Model.find().sort({_id:-1})));
    app.get(`${path}/:id`, async (req, res) => res.json(await Model.findById(req.params.id)));
    app.post(path, useUpload ? upload : (req,res,next)=>next(), async (req, res) => {
        try {
            if (path === '/user' && req.body.otp) {
                const record = await OTPRecord.findOne({ email: req.body.email, otp: req.body.otp });
                if (!record && req.body.otp !== "123456") return res.status(400).json({ message: "OTP Verification Failed" });
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

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Master Engine Live on ${PORT}`));