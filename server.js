const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. DATABASE CONNECTION ---
const MONGODB_URI = "mongodb+srv://theafzalhussain786_db_user_new:Afzal0786@cluster0.kygjjc4.mongodb.net/eshoper?retryWrites=true&w=majority";
mongoose.connect(MONGODB_URI).then(() => console.log("✅ Master Engine Live")).catch(e => console.log("❌ DB Error", e));

// --- 2. NODEMAILER (ZAROORI: Gmail App Password use karein) ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { 
        user: 'theafzalhussain786@gmail.com', 
        pass: '6WKoU9LzhQf4v5GCjLzK-ZBgnRw' // 16-digit code
    }
});

const toJSONCustom = { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } };
const opts = { toJSON: toJSONCustom, timestamps: true };

// --- 3. MODELS ---
const User = mongoose.model('User', new mongoose.Schema({ name: String, username: { type: String, unique: true }, email: { type: String, unique: true }, phone: String, password: { type: String, required: true }, role: { type: String, default: "User" }, pic: String, otp: String, otpExpires: Date }, opts));
const Product = mongoose.model('Product', new mongoose.Schema({ name: String, maincategory: String, subcategory: String, brand: String, color: String, size: String, baseprice: Number, discount: Number, finalprice: Number, stock: String, description: String, pic1: String, pic2: String, pic3: String, pic4: String }, opts));

// --- 4. OTP ENGINE (Fixed for Signup & Forget) ---
app.post('/api/send-otp', async (req, res) => {
    try {
        const { email, type } = req.body;
        
        // Check if user exists for Signup (Should NOT exist) or Forget (Should exist)
        const userExists = await User.findOne({ $or: [{ email }, { username: email }] });
        
        if (type === 'signup' && userExists) return res.status(400).json({ message: "This identity already exists in our master records." });
        if (type === 'forget' && !userExists) return res.status(404).json({ message: "Account not found." });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Temporary save OTP (If user doesn't exist yet, we only need to send mail)
        if (userExists) {
            userExists.otp = otp;
            userExists.otpExpires = new Date(Date.now() + 5 * 60000);
            await userExists.save();
        }

        await transporter.sendMail({
            from: '"Eshopper Security" <theafzalhussain786@gmail.com>',
            to: email,
            subject: '🔐 Your Verification Code',
            html: `<h3>Your Eshopper OTP is: <b style="color:#17a2b8; font-size:24px;">${otp}</b></h3>`
        });

        res.json({ result: "Done", otp }); // Note: In production, remove 'otp' from response
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- 5. AUTH & CRUD ---
app.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (user && await bcrypt.compare(req.body.password, user.password)) res.json(user);
        else res.status(401).json({ message: "Invalid Credentials" });
    } catch (e) { res.status(500).json(e); }
});

app.post('/user', async (req, res) => {
    try {
        let d = new User(req.body);
        const salt = await bcrypt.genSalt(10);
        d.password = await bcrypt.hash(d.password, salt);
        await d.save();
        res.status(201).json(d);
    } catch (e) { res.status(400).json(e); }
});

// Generic Handler for remaining modules
const handle = (path, Model) => {
    app.get(path, async (req, res) => res.json(await Model.find().sort({_id:-1})));
    app.delete(`${path}/:id`, async (req, res) => { await Model.findByIdAndDelete(req.params.id); res.json({result:"Done"}); });
};
handle('/product', Product);

const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Master Server on ${PORT}`));