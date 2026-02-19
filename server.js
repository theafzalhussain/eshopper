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

// --- 3. Cloudinary Storage Setup for Multiple Images ---
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'eshoper_uploads',
        allowedFormats: ['jpg', 'png', 'jpeg'],
    },
});

const upload = multer({ storage: storage }).fields([
    { name: 'pic1', maxCount: 1 },
    { name: 'pic2', maxCount: 1 },
    { name: 'pic3', maxCount: 1 },
    { name: 'pic4', maxCount: 1 },
    { name: 'pic', maxCount: 1 } // Profile pic ke liye
]);

// --- 4. Helper for JSON-SERVER Compatibility (id vs _id fix) ---
const toJSONCustom = {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
    }
};

// --- 5. Mongoose Models ---
const createModel = (name, schemaObj) => {
    const schema = new mongoose.Schema(schemaObj);
    schema.set('toJSON', toJSONCustom);
    return mongoose.model(name, schema);
};

const Maincategory = createModel('Maincategory', { name: String });
const Subcategory = createModel('Subcategory', { name: String });
const Brand = createModel('Brand', { name: String });
const Newslatter = createModel('Newslatter', { email: { type: String, unique: true } });
const Contact = createModel('Contact', { name: String, email: String, phone: String, subject: String, message: String, status: { type: String, default: "Active" }, time: { type: Date, default: Date.now } });

const Product = createModel('Product', {
    name: String, maincategory: String, subcategory: String, brand: String,
    color: String, size: String, baseprice: Number, discount: Number,
    finalprice: Number, stock: String, description: String,
    pic1: String, pic2: String, pic3: String, pic4: String
});

const User = createModel('User', {
    name: String, username: { type: String, unique: true }, email: String, phone: String, 
    password: String, addressline1: String, addressline2: String, addressline3: String,
    pin: String, city: String, state: String, pic: String, role: { type: String, default: "User" }
});

const Cart = createModel('Cart', { userid: String, productid: String, name: String, color: String, size: String, price: Number, qty: Number, total: Number, pic: String });
const Wishlist = createModel('Wishlist', { userid: String, productid: String, name: String, color: String, size: String, price: Number, pic: String });

// --- 6. API ROUTES ---

// Generic Routes for Simple CRUD
const setupSimpleRoutes = (path, Model) => {
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
        await Model.findByIdAndDelete(req.params.id);
        res.send({ result: "Done" });
    });
    app.put(`${path}/:id`, async (req, res) => {
        const data = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.send(data);
    });
};

setupSimpleRoutes('/maincategory', Maincategory);
setupSimpleRoutes('/subcategory', Subcategory);
setupSimpleRoutes('/brand', Brand);
setupSimpleRoutes('/newslatter', Newslatter);
setupSimpleRoutes('/cart', Cart);
setupSimpleRoutes('/wishlist', Wishlist);
setupSimpleRoutes('/contact', Contact);

// User Routes (With Profile Pic Upload)
app.get('/user', async (req, res) => {
    res.send(await User.find().sort({ _id: -1 }));
});

app.post('/user', upload, async (req, res) => {
    try {
        const data = new User(req.body);
        if (req.files && req.files.pic) data.pic = req.files.pic[0].path;
        await data.save();
        res.send(data);
    } catch (e) { res.status(400).send(e); }
});

app.put('/user/:id', upload, async (req, res) => {
    try {
        let updateData = { ...req.body };
        if (req.files && req.files.pic) updateData.pic = req.files.pic[0].path;
        const data = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.send(data);
    } catch (e) { res.status(400).send(e); }
});

// Product Routes (With 4 Pics Upload)
app.get('/product', async (req, res) => {
    res.send(await Product.find().sort({ _id: -1 }));
});

app.post('/product', upload, async (req, res) => {
    try {
        const data = new Product(req.body);
        if (req.files) {
            if (req.files.pic1) data.pic1 = req.files.pic1[0].path;
            if (req.files.pic2) data.pic2 = req.files.pic2[0].path;
            if (req.files.pic3) data.pic3 = req.files.pic3[0].path;
            if (req.files.pic4) data.pic4 = req.files.pic4[0].path;
        }
        await data.save();
        res.send(data);
    } catch (error) { res.status(400).send(error); }
});

app.delete('/product/:id', async (req, res) => {
    await Product.findByIdAndDelete(req.params.id);
    res.send({ result: "Done" });
});

// --- 7. Server Start ---
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 Server started on http://localhost:${PORT}`));