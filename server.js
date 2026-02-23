const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- DATABASE ---
const MONGODB_URI = "mongodb+srv://theafzalhussain786_db_user_new:Afzal0786@cluster0.kygjjc4.mongodb.net/eshoper?retryWrites=true&w=majority";
mongoose.connect(MONGODB_URI).then(() => console.log("✅ API Engine Live")).catch(e => console.log("❌ DB Error", e));

// --- NODEMAILER CONFIG ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'theafzalhussain786@gmail.com', // Aapka email
        pass: 'APNA_16_DIGIT_APP_PASSWORD_YAHAN_DALEIN' // Gmail App Password
    }
});

const toJSONCustom = { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } };
const opts = { toJSON: toJSONCustom, timestamps: true };

// --- USER MODEL (Updated with OTP) ---
const User = mongoose.model('User', new mongoose.Schema({ 
    name: String, username: { type: String, unique: true }, email: { type: String, unique: true }, 
    phone: String, password: { type: String, required: true }, 
    pic: String, role: { type: String, default: "User" },
    otp: String, otpExpires: Date
}, opts));

// --- OTP ROUTES ---

// 1. Send OTP for Signup/Forget Password
app.post('/api/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
        const expiry = new Date(Date.now() + 10 * 60000); // 10 mins valid

        // Check if user exists (For Forget Password) or it's a new signup
        let user = await User.findOne({ email });
        
        if (user) {
            user.otp = otp;
            user.otpExpires = expiry;
            await user.save();
        } else {
            // Temporary data stored in memory or handled via frontend for Signup
            // For simplicity, we just send the mail
        }

        const mailOptions = {
            from: 'Eshopper <theafzalhussain786@gmail.com>',
            to: email,
            subject: '🔐 Your Eshopper Verification Code',
            html: `<div style="font-family: Arial; padding: 20px; border: 1px solid #eee;">
                    <h2>Welcome to Eshopper</h2>
                    <p>Your OTP for verification is:</p>
                    <h1 style="color: #17a2b8; letter-spacing: 5px;">${otp}</h1>
                    <p>This code is valid for 10 minutes.</p>
                   </div>`
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ result: "Done", otp: otp }); // Send OTP back to frontend (In production, don't send OTP in response)
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. Verified Signup (Create User after OTP)
app.post('/user', async (req, res) => {
    try {
        let data = new User(req.body);
        const salt = await bcrypt.genSalt(10);
        data.password = await bcrypt.hash(data.password, salt);
        await data.save();
        res.status(201).json(data);
    } catch (e) { res.status(400).json({ error: "User creation failed" }); }
});

// 3. Reset Password with OTP
app.post('/api/reset-password', async (req, res) => {
    try {
        const { username, password, otp } = req.body;
        const user = await User.findOne({ username });
        
        if (user && user.otp === otp && user.otpExpires > Date.now()) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
            user.otp = undefined; // Clear OTP
            await user.save();
            res.json({ result: "Done" });
        } else {
            res.status(400).json({ message: "Invalid or Expired OTP" });
        }
    } catch (e) { res.status(500).json(e); }
});

// Generic Login (Bcrypt compatible)
app.post('/login', async (req, res) => {
    const user = await User.findOne({ username: req.body.username });
    if (user && await bcrypt.compare(req.body.password, user.password)) res.json(user);
    else res.status(401).json({ message: "Invalid Credentials" });
});

const PORT = 8000;
app.listen(PORT, () => console.log(`🚀 OTP Engine Live on ${PORT}`));