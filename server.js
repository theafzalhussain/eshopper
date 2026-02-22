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
mongoose.connect(MONGODB_URI)
    .then(() => console.log("✅ DB Connected: Atlas Secured"))
    .catch(err => console.log("❌ DB Connection Error:", err));

cloudinary.config({ 
    cloud_name: 'dtfvoxw1p', 
    api_key: '519639537482594', 
    api_secret: process.env.CLOUD_API_SECRET // Ensure this is set in Render
});

const storage = new CloudinaryStorage({ 
    cloudinary: cloudinary, 
    params: { 
        folder: 'eshoper_master', 
        allowedFormats: ['jpg', 'png', 'jpeg'] 
    } 
});

const upload = multer({ storage: storage }).fields([
    { name: 'pic', maxCount: 1 }, 
    { name: 'pic1', maxCount: 1 }, 
    { name: 'pic2', maxCount: 1 }, 
    { name: 'pic3', maxCount: 1 }, 
    { name: 'pic4', maxCount: 1 }
]);

// --- 2. JSON CONVERSION HELPER ---
const toJSONCustom = { 
    virtuals: true, 
    versionKey: false, 
    transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } 
};
const opts = { toJSON: toJSONCustom };

// --- 3. MODELS ---
const UserSchema = new mongoose.Schema({ 
    name: String, 
    username: { type: String, unique: true }, 
    email: String,
    phone: String,
    password: { type: String, required: true }, 
    addressline1: { type: String, default: "" },
    addressline2: { type: String, default: "" },
    addressline3: { type: String, default: "" },
    pin: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    role: { type: String, default: "User" }, 
    pic: String 
}, opts);

const User = mongoose.model('User', UserSchema);

// Rest of models...
const Maincategory = mongoose.model('Maincategory', new mongoose.Schema({ name: String }, opts));
const Subcategory = mongoose.model('Subcategory', new mongoose.Schema({ name: String }, opts));
const Brand = mongoose.model('Brand', new mongoose.Schema({ name: String }, opts));
const Newslatter = mongoose.model('Newslatter', new mongoose.Schema({ email: { type: String, unique: true } }, opts));
const Contact = mongoose.model('Contact', new mongoose.Schema({ name: String, email: String, phone: String, subject: String, message: String, status: { type: String, default: "Active" } }, opts));
const Cart = mongoose.model('Cart', new mongoose.Schema({ userid: String, productid: String, name: String, color: String, size: String, price: Number, qty: Number, total: Number, pic: String }, opts));
const Wishlist = mongoose.model('Wishlist', new mongoose.Schema({ userid: String, productid: String, name: String, color: String, size: String, price: Number, pic: String }, opts));
const Checkout = mongoose.model('Checkout', new mongoose.Schema({ userid: String, paymentmode: String, orderstatus: String, paymentstatus: String, totalAmount: Number, products: Array }, opts));
const Product = mongoose.model('Product', new mongoose.Schema({ name: String, maincategory: String, subcategory: String, brand: String, color: String, size: String, baseprice: Number, discount: Number, finalprice: Number, stock: String, description: String, pic1: String, pic2: String, pic3: String, pic4: String }, opts));

// --- 4. SECURE AUTH ROUTES ---
app.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (!user) return res.status(404).send({ message: "Invalid Credentials" });
        const match = await bcrypt.compare(req.body.password, user.password);
        if (match) res.send(user); else res.status(401).send({ message: "Invalid Credentials" });
    } catch (e) { res.status(500).send(e); }
});

// --- 5. EXPLICIT PRODUCT ROUTES ---
app.get('/product', async (req, res) => res.send(await Product.find().sort({ _id: -1 })));
app.post('/product', upload, async (req, res) => {
    try {
        const d = new Product(req.body);
        if (req.files) {
            if (req.files.pic1) d.pic1 = req.files.pic1[0].path;
            if (req.files.pic2) d.pic2 = req.files.pic2[0].path;
            if (req.files.pic3) d.pic3 = req.files.pic3[0].path;
            if (req.files.pic4) d.pic4 = req.files.pic4[0].path;
        }
        await d.save(); res.send(d);
    } catch (e) { res.status(400).send(e); }
});
app.put('/product/:id', upload, async (req, res) => {
    try {
        let upData = { ...req.body };
        if (req.files) {
            if (req.files.pic1) upData.pic1 = req.files.pic1[0].path;
            if (req.files.pic2) upData.pic2 = req.files.pic2[0].path;
            if (req.files.pic3) upData.pic3 = req.files.pic3[0].path;
            if (req.files.pic4) upData.pic4 = req.files.pic4[0].path;
        }
        const data = await Product.findByIdAndUpdate(req.params.id, upData, { new: true });
        res.send(data);
    } catch (e) { res.status(400).send(e); }
});

// --- 6. USER SPECIAL ROUTES (Encryption + Image) ---
app.get('/user', async (req, res) => res.send(await User.find().sort({ _id: -1 })));
app.post('/user', upload, async (req, res) => {
    try {
        const data = new User(req.body);
        if (req.files && req.files.pic) data.pic = req.files.pic[0].path;
        const salt = await bcrypt.genSalt(10);
        data.password = await bcrypt.hash(req.body.password, salt);
        await data.save(); res.send(data);
    } catch (e) { res.status(400).send(e); }
});

// 🔥 THE MISSING LINK: User PUT Route for Profile Updates
app.put('/user/:id', upload, async (req, res) => {
    try {
        let updateData = { ...req.body };
        // Check for new Profile Picture
        if (req.files && req.files.pic) {
            updateData.pic = req.files.pic[0].path;
        }
        // Logic for Password change (optional)
        if (updateData.password && updateData.password.length < 20) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(updateData.password, salt);
        }
        const data = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.send(data);
    } catch (e) { res.status(400).send(e); }
});

// --- 7. UNIVERSAL ROUTE HANDLER (For Simple Logic) ---
const setupRoutes = (path, Model) => {
    app.get(path, async (req, res) => res.send(await Model.find().sort({ _id: -1 })));
    app.post(path, async (req, res) => { try { const d = new Model(req.body); await d.save(); res.send(d); } catch (e) { res.status(400).send(e); } });
    app.delete(`${path}/:id`, async (req, res) => { await Model.findByIdAndDelete(req.params.id); res.send({ result: "Done" }); });
    app.put(`${path}/:id`, async (req, res) => { const d = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.send(d); });
};

setupRoutes('/maincategory', Maincategory);
setupRoutes('/subcategory', Subcategory);
setupRoutes('/brand', Brand);
setupRoutes('/newslatter', Newslatter);
setupRoutes('/contact', Contact);
setupRoutes('/cart', Cart);
setupRoutes('/wishlist', Wishlist);
setupRoutes('/checkout', Checkout);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 Master Backend Live on Port ${PORT}`));