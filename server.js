
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary'); // Check this line
const multer = require('multer');
require('dotenv').config();

// ... baaki poora code wahi rahega jo maine pichle message mein diya tha

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
    api_secret: process.env.CLOUD_API_SECRET // Ye .env file se aayega
});

// --- 3. Cloudinary Storage Setup for Multer ---
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'eshoper_uploads',
        allowedFormats: ['jpg', 'png', 'jpeg'],
    },
});
const upload = multer({ storage: storage });

// --- 4. Helper to make MongoDB behave like JSON-SERVER ---
const toJSONCustom = {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
    }
};

// --- 5. Mongoose Schemas & Models ---
const ProductSchema = new mongoose.Schema({
    name: String, maincategory: String, subcategory: String, brand: String,
    color: String, size: String, baseprice: Number, discount: Number,
    finalprice: Number, stock: String, description: String, image: String
});
ProductSchema.set('toJSON', toJSONCustom);
const Product = mongoose.model('Product', ProductSchema);

const NewslatterSchema = new mongoose.Schema({ email: { type: String, unique: true } });
NewslatterSchema.set('toJSON', toJSONCustom);
const Newslatter = mongoose.model('Newslatter', NewslatterSchema);

const CatSchema = new mongoose.Schema({ name: String });
CatSchema.set('toJSON', toJSONCustom);
const Maincategory = mongoose.model('Maincategory', CatSchema);
const Subcategory = mongoose.model('Subcategory', CatSchema);
const Brand = mongoose.model('Brand', CatSchema);

// --- 6. API ROUTES ---

const createSimpleRoute = (path, Model) => {
    app.get(path, async (req, res) => {
        const data = await Model.find().sort({ _id: -1 });
        res.send(data);
    });
    app.post(path, async (req, res) => {
        try {
            const data = new Model(req.body);
            await data.save();
            res.send(data);
        } catch (e) { res.status(400).send(e); }
    });
    app.delete(`${path}/:id`, async (req, res) => {
        try {
            await Model.findByIdAndDelete(req.params.id);
            res.send({ result: "Done" });
        } catch (e) { res.status(400).send(e); }
    });
};

createSimpleRoute('/maincategory', Maincategory);
createSimpleRoute('/subcategory', Subcategory);
createSimpleRoute('/brand', Brand);

// Product Routes
app.get('/product', async (req, res) => {
    const data = await Product.find().sort({ _id: -1 });
    res.send(data);
});

app.post('/product', upload.single('image'), async (req, res) => {
    try {
        const data = new Product(req.body);
        if (req.file) data.image = req.file.path;
        await data.save();
        res.send(data);
    } catch (error) { res.status(400).send(error); }
});

app.delete('/product/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.send({ result: "Done" });
    } catch (e) { res.status(400).send(e); }
});

// Newsletter Routes
app.get('/newslatter', async (req, res) => {
    const data = await Newslatter.find().sort({ _id: -1 });
    res.send(data);
});

app.post('/newslatter', async (req, res) => {
    try {
        const data = new Newslatter(req.body);
        await data.save();
        res.send(data);
    } catch (error) { res.status(400).send(error); }
});

// --- 7. Server Start ---
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`🚀 Server started on http://localhost:${PORT}`);
});