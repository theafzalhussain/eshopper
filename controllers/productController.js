// Product Controller
// Modularized product CRUD logic


const Product = require('../models/Product');
const Maincategory = require('../models/Maincategory');
const Subcategory = require('../models/Subcategory');
const Brand = require('../models/Brand');
const Coupon = require('../models/Coupon');

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
            // Ensure size is always an array
            if (body.size && !Array.isArray(body.size)) {
                body.size = [body.size];
            }
            body.newArrival = body.newArrival === 'true' || body.newArrival === true;
            body.isSale = body.isSale === 'true' || body.isSale === true;
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
            // Handle images from req.files (like addProduct)
            if (req.files) {
                if (req.files.pic1 && req.files.pic1[0] && req.files.pic1[0].path) req.body.pic1 = req.files.pic1[0].path;
                if (req.files.pic2 && req.files.pic2[0] && req.files.pic2[0].path) req.body.pic2 = req.files.pic2[0].path;
                if (req.files.pic3 && req.files.pic3[0] && req.files.pic3[0].path) req.body.pic3 = req.files.pic3[0].path;
                if (req.files.pic4 && req.files.pic4[0] && req.files.pic4[0].path) req.body.pic4 = req.files.pic4[0].path;
            }
            // Ensure size is always an array
            const updateData = { ...req.body };
            if (updateData.size && !Array.isArray(updateData.size)) {
                updateData.size = [updateData.size];
            }
            updateData.newArrival = updateData.newArrival === 'true' || updateData.newArrival === true;
            updateData.isSale = updateData.isSale === 'true' || updateData.isSale === true;
            // Convert numeric fields
            if (updateData.baseprice) updateData.baseprice = Number(updateData.baseprice);
            if (updateData.discount) updateData.discount = Number(updateData.discount);
            if (updateData.finalprice) updateData.finalprice = Number(updateData.finalprice);

            const productId = req.params.id || req.body.id || req.body._id;
            if (!productId) {
                return res.status(400).json({ error: 'Product ID is required for update' });
            }
            
            const product = await Product.findByIdAndUpdate(productId, { $set: updateData }, { new: true });
            // Emit dashboard update event
            if (typeof req.app.get === 'function') {
                const io = req.app.get('io');
                if (io) io.emit('dashboardUpdate');
            }
            res.json(product);
        } catch (err) {
            res.status(400).json({ error: 'Failed to update product', details: err.message });
        }
    },

    // Get all metadata for chatbot knowledge base
    getChatbotMetadata: async (req, res) => {
        try {
            const [mainCategories, allBrands, activeCoupons, products] = await Promise.all([
                Maincategory.find().lean(),
                Brand.find().lean(),
                Coupon.find({ isActive: true }).lean(),
                Product.find().lean()
            ]);

            const normalizeMoney = (value) => {
                const num = Number(value);
                return Number.isFinite(num) ? num : 0;
            };

            const priceValues = products.map(p => normalizeMoney(p.finalprice || p.baseprice)).filter(v => v > 0);
            const avgPrice = priceValues.length ? Math.round(priceValues.reduce((sum, value) => sum + value, 0) / priceValues.length) : 0;
            const minPrice = priceValues.length ? Math.min(...priceValues) : 0;
            const maxPrice = priceValues.length ? Math.max(...priceValues) : 0;

            // Build category hierarchy with product counts
            const categoryHierarchy = await Promise.all(
                mainCategories.map(async (main) => {
                    const subCategories = await Subcategory.find({ maincategory: main._id }).lean();
                    const productCount = products.filter(p => p.maincategory === main.name).length;
                    
                    return {
                        id: main._id,
                        name: main.name,
                        description: main.description,
                        productCount,
                        subcategories: subCategories.map(sub => ({
                            id: sub._id,
                            name: sub.name,
                            description: sub.description,
                            productCount: products.filter(p => 
                                p.maincategory === main.name && p.subcategory === sub.name
                            ).length
                        }))
                    };
                })
            );

            // Extract brands used in products
            const usedBrands = [...new Set(products.map(p => p.brand).filter(Boolean))].map(brandName => ({
                name: brandName,
                productCount: products.filter(p => p.brand === brandName).length
            }));

            // Get product intelligence
            const productIntelligence = {
                totalProducts: products.length,
                newArrivals: products.filter(p => p.newArrival).length,
                onSale: products.filter(p => p.isSale).length,
                priceRange: {
                    min: minPrice,
                    max: maxPrice,
                    avg: avgPrice
                },
                avgDiscount: (() => {
                    const discounted = products.filter(p => Number(p.discount) > 0);
                    if (!discounted.length) return 0;
                    return Math.round(discounted.reduce((sum, p) => sum + Number(p.discount || 0), 0) / discounted.length);
                })(),
                topDiscounts: products
                    .sort((a, b) => (b.discount || 0) - (a.discount || 0))
                    .slice(0, 5)
                    .map(p => ({ name: p.name, discount: Number(p.discount || 0), price: normalizeMoney(p.finalprice || p.baseprice) }))
            };

            // Format coupons
            const formattedCoupons = activeCoupons.map(c => ({
                code: c.code,
                title: c.title,
                type: c.type,
                value: c.value,
                minCartValue: c.minCartValue,
                maxDiscount: c.maxDiscount,
                description: c.description
            }));

            // Get filter options
            const filterOptions = {
                sizes: [...new Set(products.flatMap(p => p.size || []))].sort(),
                colors: [...new Set(products.map(p => p.color).filter(Boolean))].sort(),
                brands: usedBrands.sort((a, b) => b.productCount - a.productCount),
                categories: [...new Set(products.map(p => p.maincategory).filter(Boolean))].sort(),
                subcategories: [...new Set(products.map(p => p.subcategory).filter(Boolean))].sort()
            };

            res.json({
                success: true,
                categories: categoryHierarchy,
                brands: usedBrands,
                coupons: formattedCoupons,
                productIntelligence,
                filterOptions,
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            res.status(500).json({ 
                success: false,
                error: 'Failed to fetch chatbot metadata', 
                details: err.message 
            });
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