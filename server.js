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
mongoose.connect(MONGODB_URI)
    .then(() => console.log("✅ Database Connected Successfully"))
    .catch(e => console.log("❌ DB Error", e));

// --- 2. CLOUDINARY CONFIG (Fixed from your Screenshot) ---
cloudinary.config({ 
    cloud_name: 'dtfvoxw1p', 
    api_key: '551368853328319', // Screenshot se update kiya
    api_secret: '6WKoU9LzhQf4v5GCjLzK-ZBgnRw' // Quotes ke andar string format me dala
});

const storage = new CloudinaryStorage({ 
    cloudinary: cloudinary, 
    params: { folder: 'eshoper_master', allowedFormats: ['jpg', 'png', 'jpeg'] } 
});

const upload = multer({ storage: storage }).fields([
    { name: 'pic', maxCount: 1 }, { name: 'pic1', maxCount: 1 }, 
    { name: 'pic2', maxCount: 1 }, { name: 'pic3', maxCount: 1 }, { name: 'pic4', maxCount: 1 }
]);

const toJSONCustom = { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } };
const schemaOptions = { toJSON: toJSONCustom, timestamps: true };

// --- 3. MODELS ---
const User = mongoose.model('User', new mongoose.Schema({ name: String, username: { type: String, unique: true }, email: String, phone: String, password: { type: String, required: true }, addressline1: String, city: String, state: String, pin: String, role: { type: String, default: "User" }, pic: String }, schemaOptions));
const Product = mongoose.model('Product', new mongoose.Schema({ name: String, maincategory: String, subcategory: String, brand: String, color: String, size: String, baseprice: Number, discount: Number, finalprice: Number, stock: String, description: String, pic1: String, pic2: String, pic3: String, pic4: String }, schemaOptions));
const Maincategory = mongoose.model('Maincategory', new mongoose.Schema({ name: String }, schemaOptions));
const Subcategory = mongoose.model('Subcategory', new mongoose.Schema({ name: String }, schemaOptions));
const Brand = mongoose.model('Brand', new mongoose.Schema({ name: String }, schemaOptions));

// --- 4. EXPLICIT ROUTES ---

app.get('/', (req, res) => res.send("🚀 Eshopper API is Running Successfully!"));

// PRODUCT ROUTES
app.get('/product', async (req, res) => {
    try { res.json(await Product.find().sort({ _id: -1 })); } catch (e) { res.status(500).json(e); }
});

app.post('/product', upload, async (req, res) => {
    try {
        let data = new Product(req.body);
        if (req.files) {
            if (req.files.pic1) data.pic1 = req.files.pic1[0].path;
            if (req.files.pic2) data.pic2 = req.files.pic2[0].path;
        }
        await data.save();
        res.status(201).json(data);
    } catch (e) { res.status(400).json(e); }
});

// USER UPDATE (THE 500 FIX)
app.put('/user/:id', upload, async (req, res) => {
    try {
        let upData = { ...req.body };
        if (req.files && req.files.pic) upData.pic = req.files.pic[0].path;

        // Hash if it's a new password. length < 25 means it's plain text, not a hash yet.
        if (req.body.password && String(req.body.password).trim() !== "" && String(req.body.password).length < 25) {
            const salt = await bcrypt.genSalt(10);
            upData.password = await bcrypt.hash(String(req.body.password), salt);
        } else {
            delete upData.password; 
        }

        const data = await User.findByIdAndUpdate(req.params.id, upData, { new: true });
        res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/user', async (req, res) => res.json(await User.find()));

app.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (user && await bcrypt.compare(req.body.password, user.password)) res.json(user);
        else res.status(401).json({ message: "Invalid Credentials" });
    } catch (e) { res.status(500).json(e); }
});

// CATEGORIES
app.get('/maincategory', async (req, res) => res.json(await Maincategory.find()));
app.get('/subcategory', async (req, res) => res.json(await Subcategory.find()));
app.get('/brand', async (req, res) => res.json(await Brand.find()));

// DELETE HANDLER
app.delete('/:model/:id', async (req, res) => {
    try {
        const { model, id } = req.params;
        if (model === 'product') await Product.findByIdAndDelete(id);
        if (model === 'user') await User.findByIdAndDelete(id);
        if (model === 'maincategory') await Maincategory.findByIdAndDelete(id);
        if (model === 'subcategory') await Subcategory.findByIdAndDelete(id);
        if (model === 'brand') await Brand.findByIdAndDelete(id);
        res.json({ result: "Done" });
    } catch (e) { res.status(400).json(e); }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 Master Server Ready on ${PORT}`));