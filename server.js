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

// --- 2. NODEMAILER CONFIG ---
// Zaroori: 'pass' mein apna 16-digit Google App Password hi dalein
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'theafzalhussain786@gmail.com',
        pass: '6WKoU9LzhQf4v5GCjLzK-ZBgnRw' 
    }
});

const toJSONCustom = { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } };
const opts = { toJSON: toJSONCustom, timestamps: true };

// --- 3. MODELS ---
const User = mongoose.model('User', new mongoose.Schema({ 
    name: String, username: { type: String, unique: true }, email: { type: String, unique: true }, 
    phone: String, password: { type: String, required: true }, 
    pic: String, role: { type: String, default: "User" },
    otp: String, otpExpires: Date
}, opts));

// --- 4. OTP & AUTH ROUTES (Explicitly defined to stop 404) ---

app.get('/', (req, res) => res.send("🚀 Eshopper API is Online!"));

// OTP Sender logic
app.post('/api/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        // Temporary store or update user with OTP
        await User.findOneAndUpdate({ email: email }, { otp, otpExpires: new Date(Date.now() + 10 * 60000) }, { upsert: false });

        await transporter.sendMail({
            from: '"Eshopper Security" <theafzalhussain786@gmail.com>',
            to: email,
            subject: '🔐 Your Verification Code',
            html: `<div style="font-family:Arial; text-align:center; padding:20px; border:1px solid #eee;">
                    <h2 style="color:#17a2b8;">Account Security</h2>
                    <p>Your 6-digit OTP is:</p>
                    <h1 style="letter-spacing:10px;">${otp}</h1>
                    <p>This code will expire in 10 minutes.</p>
                   </div>`
        });
        res.json({ result: "Done", otp }); // For testing we send OTP in response
    } catch (e) {
        console.error("🔥 Server Error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// Create User after OTP
app.post('/user', async (req, res) => {
    try {
        let d = new User(req.body);
        const salt = await bcrypt.genSalt(10);
        d.password = await bcrypt.hash(d.password, salt);
        await d.save();
        res.status(201).json(d);
    } catch (e) { res.status(400).json({ error: "User exists or DB error" }); }
});

// Login Logic
app.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (user && await bcrypt.compare(req.body.password, user.password)) res.json(user);
        else res.status(401).json({ message: "Invalid Credentials" });
    } catch (e) { res.status(500).json(e); }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Final Server Live on ${PORT}`));