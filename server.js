const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const bcrypt = require('bcryptjs'); // For Password Protection
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- MongoDB ---
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://theafzalhussain786_db_user_new:Afzal0786@cluster0.kygjjc4.mongodb.net/eshoper?retryWrites=true&w=majority";
mongoose.connect(MONGODB_URI).then(() => console.log("✅ DB Atlas Connected")).catch(e => console.log(e));

// --- Cloudinary ---
cloudinary.config({ cloud_name: 'dtfvoxw1p', api_key: '519639537482594', api_secret: process.env.CLOUD_API_SECRET });
const storage = new CloudinaryStorage({ cloudinary: cloudinary, params: { folder: 'eshoper_user', allowedFormats: ['jpg', 'png', 'jpeg'] } });
const upload = multer({ storage: storage }).fields([{ name: 'pic', maxCount: 1 }]);

// --- JSON Mapping Helper ---
const toJSONCustom = { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } };

// --- User Schema ---
const UserSchema = new mongoose.Schema({
    name: String, username: { type: String, unique: true }, email: String, 
    phone: String, password: { type: String, required: true }, role: { type: String, default: "User" }, pic: String
});
UserSchema.set('toJSON', toJSONCustom);
const User = mongoose.model('User', UserSchema);

// --- 🎯 NEW: LOGIN ROUTE (Pure Logic) ---
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(404).send({ result: "Fail", message: "User not found!" });

        // Password matching (Plain vs Hash)
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) res.send(user);
        else res.status(401).send({ result: "Fail", message: "Invalid Password!" });
    } catch (e) { res.status(500).send(e); }
});

// --- 📝 NEW: SECURE SIGNUP (Encrypting Password) ---
app.post('/user', upload, async (req, res) => {
    try {
        const data = new User(req.body);
        if (req.files && req.files.pic) data.pic = req.files.pic[0].path;

        // Encryption process
        const salt = await bcrypt.genSalt(10);
        data.password = await bcrypt.hash(req.body.password, salt);

        await data.save();
        res.send(data);
    } catch (e) { res.status(400).send(e); }
});

// Admin management stats & routes (generic for all)
app.get('/user', async (req, res) => res.send(await User.find().sort({ _id: -1 })));
app.put('/user/:id', upload, async (req, res) => {
    try {
        let upData = { ...req.body };
        if (req.files && req.files.pic) upData.pic = req.files.pic[0].path;
        if (req.body.password) {
            const salt = await bcrypt.genSalt(10);
            upData.password = await bcrypt.hash(req.body.password, salt);
        }
        const user = await User.findByIdAndUpdate(req.params.id, upData, { new: true });
        res.send(user);
    } catch (e) { res.status(400).send(e); }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 Secure Server Live on ${PORT}`));