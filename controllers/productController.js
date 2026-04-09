// Product Controller
// Modularized product CRUD logic


const Product = require('../models/Product');

module.exports = {
    // Get all products
    getAllProducts: async (req, res) => {
        try {
            const products = await Product.find().sort({ createdAt: -1 });
            res.json(products);
        } catch (err) {
            res.status(500).json({ error: 'Failed to fetch products' });
        }
    },

    // Add product
    addProduct: async (req, res) => {
        try {
            // Multer fields: req.files.pic1, req.files.pic2, ...
            const body = { ...req.body };
            // Cloudinary returns file info in req.files
            if (req.files) {
                if (req.files.pic1 && req.files.pic1[0] && req.files.pic1[0].path) body.pic1 = req.files.pic1[0].path;
                if (req.files.pic2 && req.files.pic2[0] && req.files.pic2[0].path) body.pic2 = req.files.pic2[0].path;
                if (req.files.pic3 && req.files.pic3[0] && req.files.pic3[0].path) body.pic3 = req.files.pic3[0].path;
                if (req.files.pic4 && req.files.pic4[0] && req.files.pic4[0].path) body.pic4 = req.files.pic4[0].path;
            }
            // Convert numeric fields
            if (body.baseprice) body.baseprice = Number(body.baseprice);
            if (body.discount) body.discount = Number(body.discount);
            if (body.finalprice) body.finalprice = Number(body.finalprice);

            const product = new Product(body);
            await product.save();
            // Emit dashboard update event
            if (typeof req.app.get === 'function') {
                const io = req.app.get('io');
                if (io) io.emit('dashboardUpdate');
            }
            res.status(201).json(product);
        } catch (err) {
            res.status(400).json({ error: 'Failed to add product', details: err.message });
        }
    },

    // Update product
    updateProduct: async (req, res) => {
        try {
            const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
            // Emit dashboard update event
            if (typeof req.app.get === 'function') {
                const io = req.app.get('io');
                if (io) io.emit('dashboardUpdate');
            }
            res.json(product);
        } catch (err) {
            res.status(400).json({ error: 'Failed to update product' });
        }
    },

    // Delete product
    deleteProduct: async (req, res) => {
        try {
            await Product.findByIdAndDelete(req.params.id);
            // Emit dashboard update event
            if (typeof req.app.get === 'function') {
                const io = req.app.get('io');
                if (io) io.emit('dashboardUpdate');
            }
            res.json({ message: 'Product deleted' });
        } catch (err) {
            res.status(400).json({ error: 'Failed to delete product' });
        }
    }
};