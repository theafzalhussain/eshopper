const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. MongoDB Connection ---
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://theafzalhussain786_db_user_new:Afzal0786@cluster0.kygjjc4.mongodb.net/eshoper?retryWrites=true&w=majority";
mongoose.connect(MONGODB_URI)
    .then(() => console.log("✅ MongoDB Atlas Connected"))
    .catch(err => console.error("❌ DB Connection Error:", err));

// --- 2. Cloudinary Config ---
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME || 'dtfvoxw1p',
    api_key: process.env.CLOUD_API_KEY || '519639537482594',
    api_secret: process.env.CLOUD_API_SECRET 
});

// --- 3. Cloudinary Storage for Multiple Images ---
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'eshoper_products',
        allowedFormats: ['jpg', 'png', 'jpeg'],
    },
});

// 4 Images handle karne ke liye fields setup
const upload = multer({ storage: storage }).fields([
    { name: 'pic1', maxCount: 1 },
    { name: 'pic2', maxCount: 1 },
    { name: 'pic3', maxCount: 1 },
    { name: 'pic4', maxCount: 1 }
]);

// --- 4. Helper for JSON-SERVER format ---
const toJSONCustom = {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
    }
};

// --- 5. Models ---
const ProductSchema = new mongoose.Schema({
    name: String, maincategory: String, subcategory: String, brand: String,
    color: String, size: String, baseprice: Number, discount: Number,
    finalprice: Number, stock: String, description: String,
    pic1: String, pic2: String, pic3: String, pic4: String // 4 pics support
});
ProductSchema.set('toJSON', toJSONCustom);
const Product = mongoose.model('Product', ProductSchema);

const Newslatter = mongoose.model('Newslatter', new mongoose.Schema({ email: { type: String, unique: true } }));
const Maincategory = mongoose.model('Maincategory', new mongoose.Schema({ name: String }));
const Subcategory = mongoose.model('Subcategory', new mongoose.Schema({ name: String }));
const Brand = mongoose.model('Brand', new mongoose.Schema({ name: String }));

// --- 6. ROUTES ---

// Simple CRUD for Categories & Brands
const createRoutes = (path, Model) => {
    app.get(path, async (req, res) => {
        const data = await Model.find().sort({ _id: -1 });
        res.send(data.map(item => ({...item._doc, id: item._id})));
    });
    app.post(path, async (req, res) => {
        try {
            const data = new Model(req.body);
            await data.save();
            res.send({...data._doc, id: data._id});
        } catch (e) { res.status(400).send(e); }
    });
    app.delete(`${path}/:id`, async (req, res) => {
        await Model.findByIdAndDelete(req.params.id);
        res.send({ result: "Done" });
    });
};

createRoutes('/maincategory', Maincategory);
createRoutes('/subcategory', Subcategory);
createRoutes('/brand', Brand);
createRoutes('/newslatter', Newslatter);

// --- Product Routes (Multiple Images) ---
app.get('/product', async (req, res) => {
    const data = await Product.find().sort({ _id: -1 });
    res.send(data.map(item => ({...item._doc, id: item._id})));
});

app.post('/product', upload, async (req, res) => {
    try {
        const data = new Product(req.body);
        // req.files mein saari images aayengi
        if (req.files) {
            if (req.files.pic1) data.pic1 = req.files.pic1[0].path;
            if (req.files.pic2) data.pic2 = req.files.pic2[0].path;
            if (req.files.pic3) data.pic3 = req.files.pic3[0].path;
            if (req.files.pic4) data.pic4 = req.files.pic4[0].path;
        }
        await data.save();
        res.send({...data._doc, id: data._id});
    } catch (error) { 
        console.log(error);
        res.status(400).send(error); 
    }
});

app.delete('/product/:id', async (req, res) => {
    await Product.findByIdAndDelete(req.params.id);
    res.send({ result: "Done" });
});

// --- 7. Server Start ---
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 Backend Live on Port ${PORT}`));