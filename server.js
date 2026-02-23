const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const bcrypt = require('bcryptjs'); 
require('dotenv').config();

const app = express();

// --- 1. MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- 2. DB CONNECTION ---
const MONGODB_URI = "mongodb+srv://theafzalhussain786_db_user_new:Afzal0786@cluster0.kygjjc4.mongodb.net/eshoper?retryWrites=true&w=majority";
mongoose.connect(MONGODB_URI).then(() => console.log("✅ Database Connected")).catch(e => console.log("❌ DB Error", e));

// --- 3. CLOUDINARY CONFIG ---
cloudinary.config({ cloud_name: 'dtfvoxw1p', api_key: '551368853328319', api_secret: '6WKoU9LzhQf4v5GCjLzK-ZBgnRw' });
const storage = new CloudinaryStorage({ cloudinary: cloudinary, params: { folder: 'eshoper_master', allowedFormats: ['jpg', 'png', 'jpeg'] } });
const upload = multer({ storage: storage }).fields([{ name: 'pic', maxCount: 1 }, { name: 'pic1', maxCount: 1 }, { name: 'pic2', maxCount: 1 }, { name: 'pic3', maxCount: 1 }, { name: 'pic4', maxCount: 1 }]);

const toJSONCustom = { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } };
const opts = { toJSON: toJSONCustom, timestamps: true };

// --- 4. MODELS ---
const User = mongoose.model('User', new mongoose.Schema({ name: String, username: { type: String, unique: true }, email: { type: String, unique: true }, phone: String, password: { type: String, required: true }, addressline1: String, city: String, state: String, pin: String, role: { type: String, default: "User" }, pic: String, otp: String, otpExpires: Date }, opts));
const Product = mongoose.model('Product', new mongoose.Schema({ name: String, maincategory: String, subcategory: String, brand: String, color: String, size: String, baseprice: Number, discount: Number, finalprice: Number, stock: String, description: String, pic1: String, pic2: String, pic3: String, pic4: String }, opts));
const Cart = mongoose.model('Cart', new mongoose.Schema({ userid: String, productid: String, name: String, color: String, size: String, price: Number, qty: Number, total: Number, pic: String }, opts));
const Wishlist = mongoose.model('Wishlist', new mongoose.Schema({ userid: String, productid: String, name: String, color: String, size: String, price: Number, pic: String }, opts));
const Checkout = mongoose.model('Checkout', new mongoose.Schema({ userid: String, paymentmode: String, orderstatus: { type: String, default: "Order Placed" }, paymentstatus: { type: String, default: "Pending" }, totalAmount: Number, shippingAmount: Number, finalAmount: Number, products: Array }, opts));
const Contact = mongoose.model('Contact', new mongoose.Schema({ name: String, email: String, phone: String, subject: String, message: String, status: {type: String, default: "Active"} }, opts));
const Newslatter = mongoose.model('Newslatter', new mongoose.Schema({ email: { type: String, unique: true } }, opts));
const Maincategory = mongoose.model('Maincategory', new mongoose.Schema({ name: String }, opts));
const Subcategory = mongoose.model('Subcategory', new mongoose.Schema({ name: String }, opts));
const Brand = mongoose.model('Brand', new mongoose.Schema({ name: String }, opts));

// --- 5. EXPLICIT ROUTES (No Helpers, No 404s) ---

app.get('/', (req, res) => res.send("🚀 Eshopper API Live!"));

// PRODUCT ROUTES
app.get('/product', async (req, res) => res.json(await Product.find().sort({ _id: -1 })));
app.post('/product', upload, async (req, res) => { try { const d = new Product(req.body); if (req.files && req.files.pic1) d.pic1 = req.files.pic1[0].path; await d.save(); res.json(d); } catch (e) { res.status(400).json(e); } });
app.put('/product/:id', upload, async (req, res) => { try { let upData = { ...req.body }; if (req.files && req.files.pic1) upData.pic1 = req.files.pic1[0].path; const d = await Product.findByIdAndUpdate(req.params.id, upData, { new: true }); res.json(d); } catch (e) { res.status(500).json(e); } });
app.delete('/product/:id', async (req, res) => { await Product.findByIdAndDelete(req.params.id); res.json({ result: "Done" }); });

// USER ROUTES
app.get('/user', async (req, res) => res.json(await User.find().sort({ _id: -1 })));
app.post('/user', upload, async (req, res) => { try { let d = new User(req.body); if (req.files && req.files.pic) d.pic = req.files.pic[0].path; const salt = await bcrypt.genSalt(10); d.password = await bcrypt.hash(d.password, salt); await d.save(); res.json(d); } catch (e) { res.status(400).json(e); } });
app.put('/user/:id', upload, async (req, res) => { try { let upData = { ...req.body }; if (req.files && req.files.pic) upData.pic = req.files.pic[0].path; if (req.body.password && req.body.password.length < 25) { const salt = await bcrypt.genSalt(10); upData.password = await bcrypt.hash(req.body.password, salt); } else { delete upData.password; } const d = await User.findByIdAndUpdate(req.params.id, upData, { new: true }); res.json(d); } catch (e) { res.status(500).json(e); } });

// CART ROUTES
app.get('/cart', async (req, res) => res.json(await Cart.find()));
app.post('/cart', async (req, res) => { const d = new Cart(req.body); await d.save(); res.json(d); });
app.delete('/cart/:id', async (req, res) => { await Cart.findByIdAndDelete(req.params.id); res.json({ result: "Done" }); });

// WISHLIST ROUTES
app.get('/wishlist', async (req, res) => res.json(await Wishlist.find()));
app.post('/wishlist', async (req, res) => { const d = new Wishlist(req.body); await d.save(); res.json(d); });
app.delete('/wishlist/:id', async (req, res) => { await Wishlist.findByIdAndDelete(req.params.id); res.json({ result: "Done" }); });

// CHECKOUT & OTHERS
app.get('/checkout', async (req, res) => res.json(await Checkout.find().sort({_id:-1})));
app.post('/checkout', async (req, res) => { const d = new Checkout(req.body); await d.save(); res.json(d); });
app.get('/newslatter', async (req, res) => res.json(await Newslatter.find()));
app.post('/newslatter', async (req, res) => { try{const d = new Newslatter(req.body); await d.save(); res.json(d);}catch(e){res.status(400).json(e)} });
app.get('/contact', async (req, res) => res.json(await Contact.find()));
app.post('/contact', async (req, res) => { const d = new Contact(req.body); await d.save(); res.json(d); });

// CATEGORY SIMPLE ROUTES
app.get('/maincategory', async (req, res) => res.json(await Maincategory.find()));
app.get('/subcategory', async (req, res) => res.json(await Subcategory.find()));
app.get('/brand', async (req, res) => res.json(await Brand.find()));

// LOGIN
app.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (user && await bcrypt.compare(req.body.password, user.password)) res.json(user);
        else res.status(401).json({ message: "Invalid Credentials" });
    } catch (e) { res.status(500).json(e); }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 Explicit Engine Live on ${PORT}`));