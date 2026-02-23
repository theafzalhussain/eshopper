const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const bcrypt = require('bcryptjs'); 
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. DATABASE CONNECTION ---
const MONGODB_URI = "mongodb+srv://theafzalhussain786_db_user_new:Afzal0786@cluster0.kygjjc4.mongodb.net/eshoper?retryWrites=true&w=majority";
mongoose.connect(MONGODB_URI).then(() => console.log("✅ Master Engine Live")).catch(e => console.log("❌ DB Error", e));

// --- 2. CLOUDINARY & NODEMAILER CONFIG ---
cloudinary.config({ cloud_name: 'dtfvoxw1p', api_key: '551368853328319', api_secret: '6WKoU9LzhQf4v5GCjLzK-ZBgnRw' });
const storage = new CloudinaryStorage({ cloudinary: cloudinary, params: { folder: 'eshoper_master', allowedFormats: ['jpg', 'png', 'jpeg'] } });
const upload = multer({ storage: storage }).fields([{ name: 'pic', maxCount: 1 }, { name: 'pic1', maxCount: 1 }, { name: 'pic2', maxCount: 1 }, { name: 'pic3', maxCount: 1 }, { name: 'pic4', maxCount: 1 }]);

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'theafzalhussain786@gmail.com', pass: '6WKoU9LzhQf4v5GCjLzK-ZBgnRw' } // Apna App Password hi rakhein
});

const toJSONCustom = { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } };
const opts = { toJSON: toJSONCustom, timestamps: true };

// --- 3. ALL MODELS ---
const User = mongoose.model('User', new mongoose.Schema({ name: String, username: { type: String, unique: true }, email: { type: String, unique: true }, phone: String, password: { type: String, required: true }, role: { type: String, default: "User" }, pic: String, otp: String, otpExpires: Date }, opts));
const Product = mongoose.model('Product', new mongoose.Schema({ name: String, maincategory: String, subcategory: String, brand: String, color: String, size: String, baseprice: Number, discount: Number, finalprice: Number, stock: String, description: String, pic1: String, pic2: String, pic3: String, pic4: String }, opts));
const Maincategory = mongoose.model('Maincategory', new mongoose.Schema({ name: String }, opts));
const Subcategory = mongoose.model('Subcategory', new mongoose.Schema({ name: String }, opts));
const Brand = mongoose.model('Brand', new mongoose.Schema({ name: String }, opts));
const Cart = mongoose.model('Cart', new mongoose.Schema({ userid: String, productid: String, name: String, color: String, size: String, price: Number, qty: Number, total: Number, pic: String }, opts));
const Wishlist = mongoose.model('Wishlist', new mongoose.Schema({ userid: String, productid: String, name: String, color: String, size: String, price: Number, pic: String }, opts));
const Checkout = mongoose.model('Checkout', new mongoose.Schema({ userid: String, paymentmode: String, orderstatus: { type: String, default: "Order Placed" }, paymentstatus: { type: String, default: "Pending" }, totalAmount: Number, shippingAmount: Number, finalAmount: Number, products: Array }, opts));
const Contact = mongoose.model('Contact', new mongoose.Schema({ name: String, email: String, phone: String, subject: String, message: String, status: {type: String, default: "Active"} }, opts));
const Newslatter = mongoose.model('Newslatter', new mongoose.Schema({ email: { type: String, unique: true } }, opts));

// --- 4. EXPLICIT ROUTES ENGINE ---

app.get('/', (req, res) => res.send("🚀 Eshopper API Operational!"));

// AUTH & OTP LOGIC
app.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (user && await bcrypt.compare(req.body.password, user.password)) res.json(user);
        else res.status(401).json({ message: "Invalid Credentials" });
    } catch (e) { res.status(500).json(e); }
});

app.post('/api/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ $or: [{ email: email }, { username: email }] });
        if (!user) return res.status(404).json({ message: "User not found" });
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp; user.otpExpires = new Date(Date.now() + 10 * 60000); await user.save();
        await transporter.sendMail({ from: 'Eshopper', to: user.email, subject: '🔐 OTP Verification', html: `<h2>Code: ${otp}</h2>` });
        res.json({ result: "Done", otp });
    } catch (e) { res.status(500).json(e); }
});

app.post('/api/reset-password', async (req, res) => {
    try {
        const { username, password, otp } = req.body;
        const user = await User.findOne({ username });
        if (user && user.otp === otp && user.otpExpires > Date.now()) {
            const salt = await bcrypt.genSalt(10); user.password = await bcrypt.hash(password, salt);
            user.otp = undefined; await user.save(); res.json({ result: "Done" });
        } else res.status(400).send("Invalid OTP");
    } catch (e) { res.status(500).json(e); }
});

// USER CRUD
app.get('/user', async (req, res) => res.json(await User.find().sort({_id:-1})));
app.post('/user', upload, async (req, res) => {
    try {
        let d = new User(req.body); if (req.files && req.files.pic) d.pic = req.files.pic[0].path;
        const salt = await bcrypt.genSalt(10); d.password = await bcrypt.hash(d.password, salt);
        await d.save(); res.status(201).json(d);
    } catch (e) { res.status(400).json(e); }
});
app.put('/user/:id', upload, async (req, res) => {
    try {
        let upData = { ...req.body }; if (req.files && req.files.pic) upData.pic = req.files.pic[0].path;
        if (req.body.password && req.body.password.length < 25) { const salt = await bcrypt.genSalt(10); upData.password = await bcrypt.hash(upData.password, salt); }
        else { delete upData.password; }
        const d = await User.findByIdAndUpdate(req.params.id, upData, { new: true }); res.json(d);
    } catch (e) { res.status(500).json(e); }
});

// PRODUCT CRUD
app.get('/product', async (req, res) => res.json(await Product.find().sort({_id:-1})));
app.post('/product', upload, async (req, res) => {
    try {
        let d = new Product(req.body); if (req.files && req.files.pic1) d.pic1 = req.files.pic1[0].path;
        await d.save(); res.status(201).json(d);
    } catch (e) { res.status(400).json(e); }
});
app.put('/product/:id', upload, async (req, res) => {
    try {
        let upData = { ...req.body }; if (req.files && req.files.pic1) upData.pic1 = req.files.pic1[0].path;
        const d = await Product.findByIdAndUpdate(req.params.id, upData, { new: true }); res.json(d);
    } catch (e) { res.status(500).json(e); }
});

// REMAINING MODULES (Fixed all 404s)
const generateRoutes = (path, Model) => {
    app.get(path, async (req, res) => res.json(await Model.find().sort({_id:-1})));
    app.post(path, async (req, res) => { try { const d = new Model(req.body); await d.save(); res.status(201).json(d); } catch (e) { res.status(400).json(e); } });
    app.put(`${path}/:id`, async (req, res) => { const d = await Model.findByIdAndUpdate(req.params.id, req.body, {new:true}); res.json(d); });
    app.delete(`${path}/:id`, async (req, res) => { await Model.findByIdAndDelete(req.params.id); res.json({result: "Done"}); });
};

generateRoutes('/maincategory', Maincategory);
generateRoutes('/subcategory', Subcategory);
generateRoutes('/brand', Brand);
generateRoutes('/cart', Cart);
generateRoutes('/wishlist', Wishlist);
generateRoutes('/checkout', Checkout);
generateRoutes('/contact', Contact);
generateRoutes('/newslatter', Newslatter);

// DELETE Special for User/Product
app.delete('/user/:id', async (req, res) => { await User.findByIdAndDelete(req.params.id); res.json({result: "Done"}); });
app.delete('/product/:id', async (req, res) => { await Product.findByIdAndDelete(req.params.id); res.json({result: "Done"}); });

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 Master Server Live on ${PORT}`));