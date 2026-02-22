const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const bcrypt = require('bcryptjs'); // For Security
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. MongoDB Connection ---
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://theafzalhussain786_db_user_new:Afzal0786@cluster0.kygjjc4.mongodb.net/eshoper?retryWrites=true&w=majority";
mongoose.connect(MONGODB_URI)
    .then(() => console.log("✅ Database Connected: MongoDB Atlas"))
    .catch(err => console.error("❌ Connection Error:", err));

// --- 2. Cloudinary Config ---
cloudinary.config({
    cloud_name: 'dtfvoxw1p',
    api_key: '519639537482594',
    api_secret: process.env.CLOUD_API_SECRET // Ensure this is in Render Env Variables
});

// --- 3. Multi-Image Storage Configuration ---
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'eshoper_master',
        allowedFormats: ['jpg', 'png', 'jpeg'],
    },
});

const upload = multer({ storage: storage }).fields([
    { name: 'pic1', maxCount: 1 }, { name: 'pic2', maxCount: 1 },
    { name: 'pic3', maxCount: 1 }, { name: 'pic4', maxCount: 1 },
    { name: 'pic', maxCount: 1 } // For User Profile Pic
]);

// --- 4. MUI DataGrid Helper (id fix) ---
const toJSONCustom = {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
    }
};

// --- 5. Models ---
const schemaOptions = { toJSON: toJSONCustom };

const Maincategory = mongoose.model('Maincategory', new mongoose.Schema({ name: String }, schemaOptions));
const Subcategory = mongoose.model('Subcategory', new mongoose.Schema({ name: String }, schemaOptions));
const Brand = mongoose.model('Brand', new mongoose.Schema({ name: String }, schemaOptions));
const Newslatter = mongoose.model('Newslatter', new mongoose.Schema({ email: { type: String, unique: true } }, schemaOptions));
const Contact = mongoose.model('Contact', new mongoose.Schema({ name: String, email: String, phone: String, subject: String, message: String, status: { type: String, default: "Active" } }, schemaOptions));

const Product = mongoose.model('Product', new mongoose.Schema({
    name: String, maincategory: String, subcategory: String, brand: String,
    color: String, size: String, baseprice: Number, discount: Number,
    finalprice: Number, stock: String, description: String,
    pic1: String, pic2: String, pic3: String, pic4: String
}, schemaOptions));

const User = mongoose.model('User', new mongoose.Schema({
    name: String, username: { type: String, unique: true }, email: String, 
    phone: String, password: { type: String, required: true }, 
    role: { type: String, default: "User" }, pic: String
}, schemaOptions));

const Checkout = mongoose.model('Checkout', new mongoose.Schema({
    userid: String, paymentmode: String, orderstatus: { type: String, default: "Order Placed" },
    paymentstatus: { type: String, default: "Pending" }, totalAmount: Number, products: Array
}, schemaOptions));

// --- 6. API ROUTES ---

// --- 🎯 LOGIN API (FIXED 404) ---
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(404).send({ result: "Fail", message: "User not found!" });

        // Password Comparison (Plain vs Hash)
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) res.send(user);
        else res.status(401).send({ result: "Fail", message: "Invalid Password!" });
    } catch (e) { res.status(500).send(e); }
});

// --- 📝 SIGNUP API (Encrypted) ---
app.post('/user', upload, async (req, res) => {
    try {
        const data = new User(req.body);
        if (req.files && req.files.pic) data.pic = req.files.pic[0].path;

        // Bcrypt Hashing
        const salt = await bcrypt.getSalt(10);
        data.password = await bcrypt.hash(req.body.password, salt);

        await data.save();
        res.send(data);
    } catch (e) { res.status(400).send(e); }
});

// CRUD Logic for Categories, Brands etc.
const setupRoutes = (path, Model) => {
    app.get(path, async (req, res) => res.send(await Model.find().sort({ _id: -1 })));
    app.delete(`${path}/:id`, async (req, res) => { await Model.findByIdAndDelete(req.params.id); res.send({ result: "Done" }); });
    app.post(path, async (req, res) => {
        try { const d = new Model(req.body); await d.save(); res.send(d); } catch (e) { res.status(400).send(e); }
    });
};

setupRoutes('/maincategory', Maincategory);
setupRoutes('/subcategory', Subcategory);
setupRoutes('/brand', Brand);
setupRoutes('/newslatter', Newslatter);
setupRoutes('/contact', Contact);
setupRoutes('/checkout', Checkout);

// User Get API (Admin view)
app.get('/user', async (req, res) => res.send(await User.find().sort({ _id: -1 })));

// --- Product APIs (Upload Handling) ---
app.get('/product', async (req, res) => res.send(await Product.find().sort({ _id: -1 })));

app.post('/product', upload, async (req, res) => {
    try {
        const data = new Product(req.body);
        if (req.files) {
            if (req.files.pic1) data.pic1 = req.files.pic1[0].path;
            if (req.files.pic2) data.pic2 = req.files.pic2[0].path;
            if (req.files.pic3) data.pic3 = req.files.pic3[0].path;
            if (req.files.pic4) data.pic4 = req.files.pic4[0].path;
        }
        await data.save(); res.send(data);
    } catch (e) { res.status(400).send(e); }
});

app.delete('/product/:id', async (req, res) => { await Product.findByIdAndDelete(req.params.id); res.send({ result: "Done" }); });

// Server Entry Point
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 Final Premium Backend Running on Port ${PORT}`));