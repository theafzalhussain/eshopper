const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs'); 
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. DB CONNECTION ---
const MONGODB_URI = "mongodb+srv://theafzalhussain786_db_user_new:Afzal0786@cluster0.kygjjc4.mongodb.net/eshoper?retryWrites=true&w=majority";
mongoose.connect(MONGODB_URI).then(() => console.log("✅ Master Engine Live")).catch(e => console.log("❌ DB Error", e));

// --- 2. NODEMAILER CONFIG ---
// Zaroori: 'pass' me apna 16-digit App Password hi dalein
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'theafzalhussain786@gmail.com', 
        pass: '6WKoU9LzhQf4v5GCjLzK-ZBgnRw' // Isse check karein, ye App Password hona chahiye
    }
});

const toJSONCustom = { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } };
const opts = { toJSON: toJSONCustom, timestamps: true };

// --- 3. USER MODEL ---
const User = mongoose.model('User', new mongoose.Schema({ 
    name: String, username: { type: String, unique: true }, email: { type: String, unique: true }, 
    password: { type: String, required: true }, otp: String, otpExpires: Date 
}, opts));

// --- 4. OTP ROUTES (Manually defined to stop 404) ---

app.post('/api/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ $or: [{ email: email }, { username: email }] });
        
        if (!user) return res.status(404).json({ message: "Identity not found" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpires = new Date(Date.now() + 10 * 60000); // 10 Min Valid
        await user.save();

        await transporter.sendMail({
            from: 'Eshopper Support <theafzalhussain786@gmail.com>',
            to: user.email,
            subject: '🔐 Your Verification Code',
            html: `<h3>Your Eshopper OTP is: <b style="color:#17a2b8">${otp}</b></h3>`
        });

        res.json({ result: "Done", otp: otp }); // Dummy logic: For dev, returning OTP in res
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/reset-password', async (req, res) => {
    try {
        const { username, password, otp } = req.body;
        const user = await User.findOne({ $or: [{ email: username }, { username: username }] });

        if (user && user.otp === otp && user.otpExpires > Date.now()) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
            user.otp = undefined;
            await user.save();
            res.json({ result: "Done" });
        } else {
            res.status(400).json({ message: "Invalid or Expired OTP" });
        }
    } catch (e) { res.status(500).json(e); }
});

app.get('/', (req, res) => res.send("🚀 API is Running!"));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 Server on ${PORT}`));