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

// --- 1. DB CONNECTION ---
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://theafzalhussain786_db_user_new:Afzal0786@cluster0.kygjjc4.mongodb.net/eshoper?retryWrites=true&w=majority";
mongoose.connect(MONGODB_URI).then(() => console.log("✅ Master Engine Live")).catch(e => console.log("❌ DB Error", e));

cloudinary.config({ 
    cloud_name: 'dtfvoxw1p', 
    api_key: '519639537482594', 
    api_secret: process.env.CLOUD_API_SECRET 
});

const storage = new CloudinaryStorage({ 
    cloudinary: cloudinary, 
    params: { folder: 'eshoper_master', allowedFormats: ['jpg', 'png', 'jpeg'] } 
});

const upload = multer({ storage: storage }).fields([
    { name: 'pic', maxCount: 1 }, 
    { name: 'pic1', maxCount: 1 }, 
    { name: 'pic2', maxCount: 1 }, 
    { name: 'pic3', maxCount: 1 }, 
    { name: 'pic4', maxCount: 1 }
]);

const toJSONCustom = { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } };
const opts = { toJSON: toJSONCustom, timestamps: true };

// --- 2. MODELS ---
const User = mongoose.model('User', new mongoose.Schema({ name: String, username: { type: String, unique: true }, email: String, phone: String, password: { type: String, required: true }, addressline1: String, city: String, state: String, pin: String, role: { type: String, default: "User" }, pic: String }, opts));
const Product = mongoose.model('Product', new mongoose.Schema({ name: String, maincategory: String, subcategory: String, brand: String, color: String, size: String, baseprice: Number, discount: Number, finalprice: Number, stock: String, description: String, pic1: String, pic2: String, pic3: String, pic4: String }, opts));

// --- 3. FIXING UPDATE ROUTES (THE 500 ERROR SOLUTION) ---

// User Update
app.put('/user/:id', upload, async (req, res) => {
    try {
        const userId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ message: "Invalid ID format" });

        let upData = { ...req.body };
        if (req.files && req.files.pic) upData.pic = req.files.pic[0].path;

        // SAFE PASSWORD HASHING
        if (req.body.password && String(req.body.password).length > 0 && String(req.body.password).length < 25) {
            const salt = await bcrypt.genSalt(10);
            upData.password = await bcrypt.hash(String(req.body.password), salt);
        } else {
            delete upData.password; // Don't hash empty or already hashed password
        }

        const data = await User.findByIdAndUpdate(userId, upData, { new: true });
        if (!data) return res.status(404).json({ message: "User not found" });
        res.status(200).json(data);
    } catch (e) {
        console.error("🔥 Update Crash:", e);
        res.status(500).json({ error: "Server Internal Error", details: e.message });
    }
});

// Product Update
app.put('/product/:id', upload, async (req, res) => {
    try {
        let upData = { ...req.body };
        if (req.files) {
            if (req.files.pic1) upData.pic1 = req.files.pic1[0].path;
            if (req.files.pic2) upData.pic2 = req.files.pic2[0].path;
        }
        const data = await Product.findByIdAndUpdate(req.params.id, upData, { new: true });
        res.status(200).json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- 4. LOGIN & UNIVERSAL HANDLER ---
app.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (user && await bcrypt.compare(req.body.password, user.password)) res.json(user);
        else res.status(401).json({ message: "Invalid Credentials" });
    } catch (e) { res.status(500).json(e); }
});

const setup = (path, Model) => {
    app.get(path, async (req, res) => res.send(await Model.find().sort({ _id: -1 })));
    app.post(path, async (req, res) => { 
        try { const d = new Model(req.body); await d.save(); res.send(d); } 
        catch (e) { res.status(400).json(e); } 
    });
    app.delete(`${path}/:id`, async (req, res) => { 
        await Model.findByIdAndDelete(req.params.id); 
        res.send({ result: "Done" }); 
    });
};

setup('/maincategory', mongoose.model('Maincategory', new mongoose.Schema({ name: String }, opts)));
setup('/subcategory', mongoose.model('Subcategory', new mongoose.Schema({ name: String }, opts)));
setup('/brand', mongoose.model('Brand', new mongoose.Schema({ name: String }, opts)));
setup('/checkout', mongoose.model('Checkout', new mongoose.Schema({ userid: String, products: Array, finalAmount: Number }, opts)));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 API Running on ${PORT}`));