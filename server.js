const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

const app = express();

// --- 1. Middleware ---
app.use(cors());
app.use(express.json());

// --- 2. MongoDB Connection ---
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://theafzalhussain786_db_user_new:Afzal0786@cluster0.kygjjc4.mongodb.net/eshoper?retryWrites=true&w=majority";
mongoose.connect(MONGODB_URI)
    .then(() => console.log("✅ Connected to MongoDB Atlas"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

// --- 3. Cloudinary Config ---
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME || 'dtfvoxw1p',
    api_key: process.env.CLOUD_API_KEY || '519639537482594',
    api_secret: process.env.CLOUD_API_SECRET 
});

// --- 4. Multer & Cloudinary Storage (For Multiple Images) ---
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'eshoper_live',
        allowedFormats: ['jpg', 'png', 'jpeg'],
    },
});

const upload = multer({ storage: storage }).fields([
    { name: 'pic1', maxCount: 1 },
    { name: 'pic2', maxCount: 1 },
    { name: 'pic3', maxCount: 1 },
    { name: 'pic4', maxCount: 1 },
    { name: 'pic', maxCount: 1 } // For User Profile
]);

// --- 5. JSON Compatibility Helper ---
const toJSONCustom = {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
    }
};

// --- 6. Mongoose Models ---
const createSchema = (obj) => {
    const schema = new mongoose.Schema(obj);
    schema.set('toJSON', toJSONCustom);
    return schema;
};

const Maincategory = mongoose.model('Maincategory', createSchema({ name: String }));
const Subcategory = mongoose.model('Subcategory', createSchema({ name: String }));
const Brand = mongoose.model('Brand', createSchema({ name: String }));
const Newslatter = mongoose.model('Newslatter', createSchema({ email: { type: String, unique: true } }));
const Contact = mongoose.model('Contact', createSchema({ name: String, email: String, phone: String, subject: String, message: String, status: { type: String, default: "Active" }, time: { type: Date, default: Date.now } }));

const Product = mongoose.model('Product', createSchema({
    name: String, maincategory: String, subcategory: String, brand: String,
    color: String, size: String, baseprice: Number, discount: Number,
    finalprice: Number, stock: String, description: String,
    pic1: String, pic2: String, pic3: String, pic4: String
}));

const User = mongoose.model('User', createSchema({
    name: String, username: { type: String, unique: true }, email: String, phone: String, 
    password: String, addressline1: String, addressline2: String, addressline3: String,
    pin: String, city: String, state: String, pic: String, role: { type: String, default: "User" }
}));

const Cart = mongoose.model('Cart', createSchema({ userid: String, productid: String, name: String, color: String, size: String, price: Number, qty: Number, total: Number, pic: String }));
const Wishlist = mongoose.model('Wishlist', createSchema({ userid: String, productid: String, name: String, color: String, size: String, price: Number, pic: String }));

const Checkout = mongoose.model('Checkout', createSchema({
    userid: String,
    paymentmode: String,
    orderstatus: { type: String, default: "Order Placed" },
    paymentstatus: { type: String, default: "Pending" },
    time: { type: Date, default: Date.now },
    totalAmount: Number,
    shippingAmount: Number,
    finalAmount: Number,
    products: Array 
}));

// --- 7. API ROUTES ---

// Helper for Simple Routes
const setupRoutes = (path, Model) => {
    app.get(path, async (req, res) => { res.send(await Model.find().sort({ _id: -1 })); });
    app.post(path, async (req, res) => {
        try { const d = new Model(req.body); await d.save(); res.send(d); } 
        catch (e) { res.status(400).send(e); }
    });
    app.delete(`${path}/:id`, async (req, res) => { await Model.findByIdAndDelete(req.params.id); res.send({ result: "Done" }); });
    app.put(`${path}/:id`, async (req, res) => {
        try { const d = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.send(d); }
        catch (e) { res.status(400).send(e); }
    });
};

setupRoutes('/maincategory', Maincategory);
setupRoutes('/subcategory', Subcategory);
setupRoutes('/brand', Brand);
setupRoutes('/newslatter', Newslatter);
setupRoutes('/cart', Cart);
setupRoutes('/wishlist', Wishlist);
setupRoutes('/contact', Contact);

// EXPLICIT CHECKOUT ROUTES
app.get('/checkout', async (req, res) => {
    const data = await Checkout.find().sort({ _id: -1 });
    res.send(data);
});

app.post('/checkout', async (req, res) => {
    try {
        const data = new Checkout(req.body);
        await data.save();
        res.status(201).send(data);
    } catch (e) {
        console.error("Checkout POST Error:", e);
        res.status(400).send(e);
    }
});

app.delete('/checkout/:id', async (req, res) => {
    await Checkout.findByIdAndDelete(req.params.id);
    res.send({ result: "Done" });
});

// --- Admin Stats Route (NEW REVENUE LOGIC UPDATED) ---
app.get('/admin/stats', async (req, res) => {
    try {
        const users = await User.countDocuments();
        const products = await Product.countDocuments();
        const contacts = await Contact.countDocuments();
        
        // Revenue calculate karna: Sabhi orders ka total sum
        const checkouts = await Checkout.find();
        const ordersCount = checkouts.length;
        const totalRevenue = checkouts.reduce((sum, order) => sum + (Number(order.finalAmount) || 0), 0);

        res.status(200).send({
            totalUsers: users,
            totalProducts: products,
            totalOrders: ordersCount,
            totalRevenue: totalRevenue,
            totalInquiries: contacts
        });
    } catch (e) {
        res.status(500).send(e);
    }
});

// --- Special Image Routes (User & Product) ---
app.post('/user', upload, async (req, res) => {
    try {
        const data = new User(req.body);
        if (req.files && req.files.pic) data.pic = req.files.pic[0].path;
        await data.save(); res.send(data);
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

app.get('/user', async (req, res) => res.send(await User.find().sort({ _id: -1 })));

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
    } catch (error) { res.status(400).send(error); }
});

app.get('/product', async (req, res) => res.send(await Product.find().sort({ _id: -1 })));

app.delete('/product/:id', async (req, res) => {
    await Product.findByIdAndDelete(req.params.id);
    res.send({ result: "Done" });
});

// --- Forget Password Route ---
app.post('/user/forget-password', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username: username });
        if (user) {
            user.password = password; 
            await user.save();
            res.status(200).send({ result: "Done", message: "Password Updated Successfully" });
        } else {
            res.status(404).send({ result: "Fail", message: "Invalid Username" });
        }
    } catch (e) {
        res.status(500).send(e);
    }
});

// --- 8. Server Start ---
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`🚀 Final Server Live on Port ${PORT}`);
});