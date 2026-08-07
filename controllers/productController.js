// Product Controller
// Modularized product CRUD logic


const Product = require('../models/Product');
const Maincategory = require('../models/Maincategory');
const Subcategory = require('../models/Subcategory');
const Brand = require('../models/Brand');
const Coupon = require('../models/Coupon');
const { clearCache } = require('../utils/cache');
const { clearQueryCache } = require('../utils/mongooseQueryCache');

const PRODUCT_CACHE_PATTERNS = ['__express__/product*', '__express__/api/products*', '__express__/api/product*', '__express__/api/search*'];

const escapeRegex = (value = '') => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const invalidateProductCaches = async () => {
    try {
        await Promise.allSettled([
            ...PRODUCT_CACHE_PATTERNS.map(pattern => clearCache(pattern)),
            Promise.resolve(clearQueryCache('product'))
        ]);
    } catch (err) {
        console.warn('⚠️ invalidateProductCaches error:', err && err.message);
    }
};

const buildProductMatch = (query = {}) => {
    const match = {};
    const maincategory = String(query.maincategory || query.category || '').trim();
    const subcategory = String(query.subcategory || '').trim();
    const brand = String(query.brand || '').trim();
    const size = String(query.size || '').trim();
    const search = String(query.search || '').trim();
    const tag = String(query.tag || '').trim().toLowerCase();
    const min = Number(query.min || 0);
    const max = Number(query.max || Number.MAX_SAFE_INTEGER);
    const rating = Number(query.rating || 0);
    const discount = Number(query.discount || 0);

    if (maincategory && maincategory !== 'All') match.maincategory = new RegExp(`^${escapeRegex(maincategory)}$`, 'i');
    if (subcategory && subcategory !== 'All') match.subcategory = new RegExp(`^${escapeRegex(subcategory)}$`, 'i');
    if (brand && brand !== 'All') match.brand = new RegExp(`^${escapeRegex(brand)}$`, 'i');
    if (size && size !== 'All') match.size = size.toUpperCase() === '2XL'
        ? { $in: ['2XL', 'XXL'] }
        : { $in: [size.toUpperCase()] };
    if (Number.isFinite(min) && min > 0) match.finalprice = { ...(match.finalprice || {}), $gte: min };
    if (Number.isFinite(max) && max < Number.MAX_SAFE_INTEGER) match.finalprice = { ...(match.finalprice || {}), $lte: max };
    if (search) {
        const searchRegex = new RegExp(escapeRegex(search), 'i');
        match.$or = [
            { name: searchRegex },
            { brand: searchRegex },
            { description: searchRegex },
            { maincategory: searchRegex },
            { subcategory: searchRegex }
        ];
    }
    if (tag === 'new arrivals') match.newArrival = true;
    if (tag === 'sale') match.isSale = true;
    if (tag === 'trending') match.discount = { $gte: Math.max(20, discount || 20) };
    if (tag === 'bestsellers') {
        match.$or = [
            ...(match.$or || []),
            { reviews: { $gte: 5 } },
            { rating: { $gte: 4.2 } }
        ];
    }
    if (Number.isFinite(rating) && rating > 0) match.rating = { $gte: rating };
    if (Number.isFinite(discount) && discount > 0) match.discount = { $gte: discount };

    return match;
};

const buildFacetPipeline = (query = {}) => {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 24)));
    const skip = (page - 1) * limit;
    const sortKey = String(query.sort || 'newest').toLowerCase();

    const sortMap = {
        low: { finalprice: 1, createdAt: -1 },
        high: { finalprice: -1, createdAt: -1 },
        rating: { rating: -1, reviews: -1, createdAt: -1 },
        popular: { reviews: -1, rating: -1, createdAt: -1 },
        discount: { discount: -1, createdAt: -1 },
        newest: { createdAt: -1 },
        default: { createdAt: -1 }
    };

    return [
        { $match: buildProductMatch(query) },
        { $sort: sortMap[sortKey] || sortMap.default },
        {
            $facet: {
                items: [
                    { $skip: skip },
                    { $limit: limit },
                    {
                        $project: {
                            name: 1,
                            maincategory: 1,
                            subcategory: 1,
                            brand: 1,
                            color: 1,
                            size: 1,
                            baseprice: 1,
                            discount: 1,
                            finalprice: 1,
                            stock: 1,
                            description: 1,
                            newArrival: 1,
                            isSale: 1,
                            pic1: 1,
                            pic2: 1,
                            pic3: 1,
                            pic4: 1,
                            rating: 1,
                            reviews: 1,
                            createdAt: 1
                        }
                    }
                ],
                total: [{ $count: 'count' }],
                brands: [{ $group: { _id: '$brand', count: { $sum: 1 } } }, { $sort: { count: -1 } }],
                categories: [{ $group: { _id: '$maincategory', count: { $sum: 1 } } }, { $sort: { count: -1 } }],
                subcategories: [{ $group: { _id: '$subcategory', count: { $sum: 1 } } }, { $sort: { count: -1 } }],
                priceRange: [{ $group: { _id: null, min: { $min: '$finalprice' }, max: { $max: '$finalprice' } } }]
            }
        },
        {
            $project: {
                items: 1,
                total: { $ifNull: [{ $first: '$total.count' }, 0] },
                facets: {
                    brands: '$brands',
                    categories: '$categories',
                    subcategories: '$subcategories',
                    priceRange: { $first: '$priceRange' }
                }
            }
        }
    ];
};

module.exports = {
    // Get single product by ID
    getProductById: async (req, res) => {
        try {
            const product = await Product.findById(req.params.id).lean();
            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }
            res.json(product);
        } catch (err) {
            // Invalid ObjectId format
            if (err.name === 'CastError') {
                return res.status(404).json({ error: 'Product not found' });
            }
            res.status(500).json({ error: 'Failed to fetch product' });
        }
    },

    // Get all products (listing view — lean projection for speed)
    getAllProducts: async (req, res) => {
        try {
            const page = Math.max(1, Number(req.query.page || 1));
            const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
            const skip = (page - 1) * limit;

            /* Run the page fetch and the count together instead of serially —
               halves the time-to-first-byte on this hot endpoint. */
            const [products, total] = await Promise.all([
                Product.find({})
                    .select('name maincategory subcategory brand color size baseprice discount finalprice stock pic1 rating reviews newArrival isSale createdAt')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Product.estimatedDocumentCount()
            ]);

            res.json({ products, total, page, limit, hasMore: skip + products.length < total });
        } catch (err) {
            res.status(500).json({ error: 'Failed to fetch products' });
        }
    },

    // High-velocity product search with one round-trip facet pagination
    searchProducts: async (req, res) => {
        try {
            const pipeline = buildFacetPipeline(req.query || {});
            const [result = {}] = await Product.aggregate(pipeline).allowDiskUse(true);

            const items = Array.isArray(result.items) ? result.items : [];
            const total = Number(result.total || 0);
            const facets = result.facets || {};

            res.json({
                success: true,
                items,
                total,
                page: Math.max(1, Number(req.query.page || 1)),
                limit: Math.min(100, Math.max(1, Number(req.query.limit || 24))),
                facets,
                hasMore: total > ((Math.max(1, Number(req.query.page || 1)) - 1) * Math.min(100, Math.max(1, Number(req.query.limit || 24))) + items.length)
            });
        } catch (err) {
            res.status(500).json({ success: false, error: 'Failed to search products', details: err.message });
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
            await invalidateProductCaches();
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
            await invalidateProductCaches();
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
            await invalidateProductCaches();
            res.json({ message: 'Product deleted' });
        } catch (err) {
            res.status(400).json({ error: 'Failed to delete product' });
        }
    }
};