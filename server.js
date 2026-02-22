const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const bcrypt = require('bcryptjs'); 
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. DB & CLOUDINARY ---
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://theafzalhussain786_db_user_new:Afzal0786@cluster0.kygjjc4.mongodb.net/eshoper?retryWrites=true&w=majority";
mongoose.connect(MONGODB_URI).then(() => console.log("✅ DB Atlas Active")).catch(e => console.log(e));

cloudinary.config({ cloud_name: 'dtfvoxw1p', api_key: '519639537482594', api_secret: process.env.CLOUD_API_SECRET });

const storage = new CloudinaryStorage({ cloudinary: cloudinary, params: { folder: 'eshoper_premium', allowedFormats: ['jpg', 'png', 'jpeg'] } });
const upload = multer({ storage: storage }).fields([{ name: 'pic', maxCount: 1 }, { name: 'pic1', maxCount: 1 }, { name: 'pic2', maxCount: 1 }, { name: 'pic3', maxCount: 1 }, { name: 'pic4', maxCount: 1 }]);

// --- 2. HELPERS & MODELS ---
const toJSONCustom = { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } };
const schemaOpts = { toJSON: toJSONCustom };

const User = mongoose.model('User', new mongoose.Schema({ name: String, username: { type: String, unique: true }, email: String, phone: String, password: { type: String, required: true }, role: { type: String, default: "User" }, pic: String }, schemaOpts));
const Cart = mongoose.model('Cart', new mongoose.Schema({ userid: String, productid: String, name: String, color: String, size: String, price: Number, qty: Number, total: Number, pic: String }, schemaOpts));
const Wishlist = mongoose.model('Wishlist', new mongoose.Schema({ userid: String, productid: String, name: String, color: String, size: String, price: Number, pic: String }, schemaOpts));

// --- 3. ROUTES ---

// 🎯 SECURE LOGIN
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(404).send({ message: "User not found!" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) res.send(user);
        else res.status(401).send({ message: "Invalid Password!" });
    } catch (e) { res.status(500).send(e); }
});

// 📝 SECURE SIGNUP (Hashed Password)
app.post('/user', upload, async (req, res) => {
    try {
        const existing = await User.findOne({ username: req.body.username });
        if (existing) return res.status(400).send({ message: "Username already taken" });

        const data = new User(req.body);
        if (req.files && req.files.pic) data.pic = req.files.pic[0].path;

        const salt = await bcrypt.genSalt(10);
        data.password = await bcrypt.hash(req.body.password, salt);

        await data.save();
        res.send(data);
    } catch (e) { res.status(400).send(e); }
});

// CART, WISHLIST GENERIC ROUTES (To stop 404)
const crud = (path, Model) => {
    app.get(path, async (req, res) => res.send(await Model.find().sort({ _id: -1 })));
    app.post(path, async (req, res) => { try { const d = new Model(req.body); await d.save(); res.send(d); } catch (e) { res.status(400).send(e); } });
    app.delete(`${path}/:id`, async (req, res) => { await Model.findByIdAndDelete(req.params.id); res.send({ result: "Done" }); });
    app.put(`${path}/:id`, async (req, res) => { const d = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.send(d); });
};
crud('/cart', Cart);
crud('/wishlist', Wishlist);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 Ready on ${PORT}`));