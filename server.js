const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. DB CONNECTION ---
const MONGODB_URI = "mongodb+srv://theafzalhussain786_db_user_new:Afzal0786@cluster0.kygjjc4.mongodb.net/eshoper?retryWrites=true&w=majority";
mongoose.connect(MONGODB_URI).then(() => console.log("✅ Master Engine Live")).catch(e => console.log("❌ DB Error", e));

// --- 2. CONFIGURATIONS ---
cloudinary.config({ cloud_name: 'dtfvoxw1p', api_key: '551368853328319', api_secret: '6WKoU9LzhQf4v5GCjLzK-ZBgnRw' });
const storage = new CloudinaryStorage({ cloudinary, params: { folder: 'eshoper_master', allowedFormats: ['jpg', 'png', 'jpeg'] } });
const upload = multer({ storage }).fields([{ name: 'pic', maxCount: 1 }, { name: 'pic1', maxCount: 1 }]);

// ⚠️ यहाँ अपना 16 अंकों का GMAIL APP PASSWORD डालें
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { 
        user: 'theafzalhussain786@gmail.com', 
        pass: 'aitweldfmsqglvjy' // आपका नया पासवर्ड यहाँ है
    } 
});

const toJSONCustom = { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } };
const opts = { toJSON: toJSONCustom, timestamps: true };

// --- 3. MODELS ---
const OTPRecord = mongoose.model('OTPRecord', new mongoose.Schema({ email: String, otp: String, createdAt: { type: Date, expires: 600, default: Date.now } }));
const User = mongoose.model('User', new mongoose.Schema({ name: String, username: { type: String, unique: true }, email: { type: String, unique: true }, password: { type: String, required: true }, pic: String, otp: String, otpExpires: Date }, opts));

// --- 4. SECURE OTP SENDER ---
app.post('/api/send-otp', async (req, res) => {
    try {
        const { email, type } = req.body;
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const user = await User.findOne({ $or: [{ email }, { username: email }] });

        if (type === 'forget' && !user) return res.status(404).json({ message: "Identity not found" });
        if (type === 'signup' && user) return res.status(400).json({ message: "Email already exists" });

        // ईमेल भेजें
        await transporter.sendMail({
            from: '"Eshopper Security" <theafzalhussain786@gmail.com>',
            to: email,
            subject: '🔐 Your Verification Code',
            html: `<div style="text-align:center; padding:20px; border:1px solid #ddd; border-radius:10px;">
                    <h2 style="color:#17a2b8;">Verification Code</h2>
                    <h1 style="letter-spacing:10px; color:#333;">${otp}</h1>
                    <p>Valid for 10 minutes.</p>
                   </div>`
        });

        if (type === 'forget') {
            user.otp = otp; user.otpExpires = new Date(Date.now() + 10 * 60000); await user.save();
        } else {
            await OTPRecord.findOneAndUpdate({ email }, { otp }, { upsert: true });
        }
        
        res.json({ result: "Done" });
    } catch (e) { 
        console.error("Mail Error:", e);
        res.status(500).json({ error: "Email Service Failed. Check App Password." }); 
    }
});

// --- 5. PASSWORD RESET & SIGNUP ---
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

// Dynamic CRUD...
const handle = (path, Model, useUpload = false) => {
    app.post(path, useUpload ? upload : (req,res,next)=>next(), async (req, res) => {
        try {
            if (path === '/user') {
                const record = await OTPRecord.findOne({ email: req.body.email, otp: req.body.otp });
                if (!record) return res.status(400).json({ message: "Invalid OTP" });
                const salt = await bcrypt.nowGenSalt(10); req.body.password = await bcrypt.hash(req.body.password, salt);
            }
            let d = new Model(req.body); await d.save(); res.status(201).json(d);
        } catch (e) { res.status(400).json(e); }
    });
    app.get(path, async (req, res) => res.json(await Model.find().sort({_id: -1})));
    app.get(`${path}/:id`, async (req, res) => res.json(await Model.findById(req.params.id)));
};

handle('/user', User, true);

app.listen(8000, () => console.log(`🚀 Master Server Live on 8000`));