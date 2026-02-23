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

// --- 1. DATABASE CONNECTION ---
const MONGODB_URI = "mongodb+srv://theafzalhussain786_db_user_new:Afzal0786@cluster0.kygjjc4.mongodb.net/eshoper?retryWrites=true&w=majority";
mongoose.connect(MONGODB_URI).then(() => console.log("✅ API ENGINE LIVE")).catch(e => console.log("❌ DB Error", e));

cloudinary.config({ cloud_name: 'dtfvoxw1p', api_key: '551368853328319', api_secret: '6WKoU9LzhQf4v5GCjLzK-ZBgnRw' });

const storage = new CloudinaryStorage({ cloudinary: cloudinary, params: { folder: 'eshoper_master', allowedFormats: ['jpg', 'png', 'jpeg'] } });
const upload = multer({ storage: storage }).fields([{ name: 'pic', maxCount: 1 }, { name: 'pic1', maxCount: 1 }, { name: 'pic2', maxCount: 1 }, { name: 'pic3', maxCount: 1 }, { name: 'pic4', maxCount: 1 }]);

const toJSONCustom = { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } };
const opts = { toJSON: toJSONCustom, timestamps: true };

// --- 2. MODELS ---
const User = mongoose.model('User', new mongoose.Schema({ name: String, username: { type: String, unique: true }, email: String, phone: String, password: { type: String, required: true }, addressline1: String, city: String, state: String, pin: String, role: { type: String, default: "User" }, pic: String }, opts));
const Product = mongoose.model('Product', new mongoose.Schema({ name: String, maincategory: String, subcategory: String, brand: String, color: String, size: String, baseprice: Number, discount: Number, finalprice: Number, stock: String, description: String, pic1: String, pic2: String, pic3: String, pic4: String }, opts));
const Maincategory = mongoose.model('Maincategory', new mongoose.Schema({ name: String }, opts));
const Subcategory = mongoose.model('Subcategory', new mongoose.Schema({ name: String }, opts));
const Brand = mongoose.model('Brand', new mongoose.Schema({ name: String }, opts));
const Cart = mongoose.model('Cart', new mongoose.Schema({ userid: String, productid: String, name: String, color: String, size: String, price: Number, qty: Number, total: Number, pic: String }, opts));
const Wishlist = mongoose.model('Wishlist', new mongoose.Schema({ userid: String, productid: String, name: String, color: String, size: String, price: Number, pic: String }, opts));
const Checkout = mongoose.model('Checkout', new mongoose.Schema({ userid: String, paymentmode: String, orderstatus: { type: String, default: "Order Placed" }, paymentstatus: { type: String, default: "Pending" }, totalAmount: Number, shippingAmount: Number, finalAmount: Number, products: Array }, opts));
const Contact = mongoose.model('Contact', new mongoose.Schema({ name: String, email: String, phone: String, subject: String, message: String, status: {type: String, default: "Active"} }, opts));
const Newslatter = mongoose.model('Newslatter', new mongoose.Schema({ email: { type: String, unique: true } }, opts));

// --- 3. EXPLICIT ROUTES (FIXES ALL 404 & 500 ERRORS) ---

app.get('/', (req, res) => res.send("🚀 Eshopper API is Running!"));

// Generic Handler for GET, POST, PUT, DELETE
const setup = (path, Model, useUpload = false) => {
    app.get(path, async (req, res) => res.json(await Model.find().sort({ _id: -1 })));
    
    app.post(path, useUpload ? upload : async (req, res, next) => next(), async (req, res) => {
        try {
            let data = new Model(req.body);
            if (req.files) {
                if (req.files.pic1) data.pic1 = req.files.pic1[0].path;
                if (req.files.pic) data.pic = req.files.pic[0].path;
            }
            await data.save();
            res.status(201).json(data);
        } catch (e) { res.status(400).json(e); }
    });

    app.put(`${path}/:id`, useUpload ? upload : async (req, res, next) => next(), async (req, res) => {
        try {
            let upData = { ...req.body };
            if (req.files) {
                if (req.files.pic1) upData.pic1 = req.files.pic1[0].path;
                if (req.files.pic) upData.pic = req.files.pic[0].path;
            }
            // Password hashing logic for user update
            if (path === '/user' && req.body.password && req.body.password.length < 25) {
                const salt = await bcrypt.genSalt(10);
                upData.password = await bcrypt.hash(req.body.password, salt);
            } else if (path === '/user') { delete upData.password; }

            const d = await Model.findByIdAndUpdate(req.params.id, upData, { new: true });
            res.json(d);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.delete(`${path}/:id`, async (req, res) => {
        await Model.findByIdAndDelete(req.params.id);
        res.json({ result: "Done" });
    });
};

// Initialize All Routes
setup('/maincategory', Maincategory);
setup('/subcategory', Subcategory);
setup('/brand', Brand);
setup('/product', Product, true);
setup('/user', User, true);
setup('/cart', Cart);
setup('/wishlist', Wishlist);
setup('/checkout', Checkout);
setup('/contact', Contact);
setup('/newslatter', Newslatter);

// Login
app.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (user && await bcrypt.compare(req.body.password, user.password)) res.json(user);
        else res.status(401).json({ message: "Invalid Credentials" });
    } catch (e) { res.status(500).json(e); }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 Master Server Live on ${PORT}`));