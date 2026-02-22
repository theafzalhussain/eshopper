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
mongoose.connect(MONGODB_URI).then(() => console.log("✅ DB Connected")).catch(e => console.log(e));

cloudinary.config({ cloud_name: 'dtfvoxw1p', api_key: '519639537482594', api_secret: process.env.CLOUD_API_SECRET });

const storage = new CloudinaryStorage({ cloudinary: cloudinary, params: { folder: 'eshoper_master', allowedFormats: ['jpg', 'png', 'jpeg'] } });
const upload = multer({ storage: storage }).fields([{ name: 'pic', maxCount: 1 }]);

const toJSONCustom = { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } };
const opts = { toJSON: toJSONCustom };

// --- 2. USER MODEL ---
const User = mongoose.model('User', new mongoose.Schema({ 
    name: String, username: { type: String, unique: true }, email: String, phone: String, 
    password: { type: String, required: true }, addressline1: String, city: String, 
    state: String, pin: String, role: { type: String, default: "User" }, pic: String 
}, opts));

// --- 3. OTHER MODELS (Minimal list for brevity) ---
const Product = mongoose.model('Product', new mongoose.Schema({ name: String, maincategory: String, subcategory: String, brand: String, color: String, size: String, baseprice: Number, discount: Number, finalprice: Number, stock: String, description: String, pic1: String, pic2: String, pic3: String, pic4: String }, opts));
const Checkout = mongoose.model('Checkout', new mongoose.Schema({ userid: String, paymentmode: String, orderstatus: String, paymentstatus: String, totalAmount: Number, products: Array }, opts));
// ... baaki models (Maincategory, etc.) waise hi rehne dein

// --- 4. AUTH ROUTES ---
app.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (!user) return res.status(404).json({ message: "User not found" });
        const match = await bcrypt.compare(req.body.password, user.password);
        if (match) res.json(user); else res.status(401).json({ message: "Invalid Password" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 5. USER ROUTES (Fixed 404 & 500) ---
app.get('/user', async (req, res) => {
    try {
        const data = await User.find().sort({ _id: -1 });
        res.send(data);
    } catch (e) { res.status(500).send(e); }
});

app.post('/user', upload, async (req, res) => {
    try {
        const data = new User(req.body);
        if (req.files && req.files.pic) data.pic = req.files.pic[0].path;
        const salt = await bcrypt.genSalt(10);
        data.password = await bcrypt.hash(req.body.password, salt);
        await data.save(); res.send(data);
    } catch (e) { res.status(400).send(e); }
});

// 🔥 User Update API with safety
app.put('/user/:id', upload, async (req, res) => {
    try {
        const userId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).send({message:"Invalid ID"});

        let upData = { ...req.body };
        if (req.files && req.files.pic) upData.pic = req.files.pic[0].path;
        
        // Agar password update nahi kar rahe toh use hashing se bachayein
        if (req.body.password && req.body.password.length < 20) {
            const salt = await bcrypt.genSalt(10);
            upData.password = await bcrypt.hash(req.body.password, salt);
        } else {
            delete upData.password; 
        }

        const data = await User.findByIdAndUpdate(userId, upData, { new: true });
        res.send(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 6. UNIVERSAL ROUTE HELPER ---
const setupRoutes = (path, Model) => {
    app.get(path, async (req, res) => res.send(await Model.find().sort({ _id: -1 })));
    app.post(path, async (req, res) => { try { const d = new Model(req.body); await d.save(); res.send(d); } catch (e) { res.status(400).json(e); } });
    app.delete(`${path}/:id`, async (req, res) => { await Model.findByIdAndDelete(req.params.id); res.send({ result: "Done" }); });
};

setupRoutes('/product', Product);
setupRoutes('/checkout', Checkout);
// ... setup baaki routes (brand, maincategory, etc.)

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 Master Server on Port ${PORT}`));