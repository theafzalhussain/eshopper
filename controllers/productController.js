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
            const product = new Product(req.body);
            await product.save();
            // Emit dashboard update event
            if (typeof req.app.get === 'function') {
                const io = req.app.get('io');
                if (io) io.emit('dashboardUpdate');
            }
            res.status(201).json(product);
        } catch (err) {
            res.status(400).json({ error: 'Failed to add product' });
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