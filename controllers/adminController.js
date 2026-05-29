// Admin Controller
// Modularized admin panel logic with caching and size analytics

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getCacheValue, setCacheValue } = require('../utils/cache');

const CACHE_TTL = Number(process.env.DASHBOARD_CACHE_TTL_MS || 15000);
let _cachedDashboard = null;
let _cachedAt = 0;
const dashboardCache = new Map();

const getNumericQuantity = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const toCleanText = (value) => (typeof value === 'string' ? value.trim() : '');

const extractProductId = (productLine = {}) => {
    const raw = productLine?.productid || productLine?.productId || productLine?.product?._id || productLine?.product;
    if (!raw) return '';
    if (typeof raw === 'object') {
        if (raw._id) return String(raw._id);
        if (raw.id) return String(raw.id);
        return '';
    }
    return String(raw);
};

const buildCatalogAnalytics = ({ orders = [], products = [] } = {}) => {
    const productIndex = new Map((products || []).map((item) => [String(item._id), item]));
    const categoryTotals = new Map();
    const topProductMap = new Map();
    const sizeTotals = new Map();
    const availableSizeCounts = new Map();

    // Count available sizes from product catalog
    (products || []).forEach((p) => {
        const sizes = Array.isArray(p.size) ? p.size : (p.size ? [String(p.size)] : []);
        sizes.forEach((s) => {
            const key = String(s || '').trim();
            if (!key) return;
            availableSizeCounts.set(key, (availableSizeCounts.get(key) || 0) + 1);
        });
    });

    (orders || []).forEach((order) => {
        const lines = Array.isArray(order?.products) ? order.products : [];
        lines.forEach((line) => {
            if (!line || typeof line !== 'object') return;

            const qty = getNumericQuantity(line.qty ?? line.quantity ?? line.count);
            const productId = extractProductId(line);
            const productDoc = productId ? productIndex.get(productId) : null;

            const name = toCleanText(line.name) || toCleanText(productDoc?.name) || 'Product';
            const maincategory =
                toCleanText(line.maincategory) ||
                toCleanText(productDoc?.maincategory) ||
                'Uncategorized';
            const brand = toCleanText(line.brand) || toCleanText(productDoc?.brand) || '';
            const pic1 =
                toCleanText(line.pic1) ||
                toCleanText(line.pic) ||
                toCleanText(productDoc?.pic1) ||
                '';

            const linePrice = Number(line.finalprice ?? line.price ?? productDoc?.finalprice ?? productDoc?.baseprice ?? 0);
            const finalprice = Number.isFinite(linePrice) ? linePrice : 0;

            const topKey = productId || name.toLowerCase();
            const previous = topProductMap.get(topKey) || {
                _id: productId || topKey,
                name,
                pic1,
                maincategory,
                brand,
                finalprice,
                totalSold: 0
            };

            previous.totalSold += qty;
            if (!previous.pic1 && pic1) previous.pic1 = pic1;
            if ((!previous.maincategory || previous.maincategory === 'Uncategorized') && maincategory) previous.maincategory = maincategory;
            if (!previous.brand && brand) previous.brand = brand;
            if ((!previous.finalprice || previous.finalprice <= 0) && finalprice > 0) previous.finalprice = finalprice;

            topProductMap.set(topKey, previous);
            categoryTotals.set(maincategory, (categoryTotals.get(maincategory) || 0) + qty);

            // Size extraction and counting (support array, string, or product-level sizes)
            const rawSize = line.size ?? line.sizes ?? line.sizeType ?? '';
            const sizesToCount = [];
            if (Array.isArray(rawSize)) {
                rawSize.forEach(rs => { if (rs) sizesToCount.push(String(rs)); });
            } else if (typeof rawSize === 'string' && rawSize.trim()) {
                rawSize.split(',').map(s => s.trim()).filter(Boolean).forEach(s => sizesToCount.push(s));
            } else if (productDoc && Array.isArray(productDoc.size) && productDoc.size.length) {
                sizesToCount.push(String(productDoc.size[0]));
            }

            if (!sizesToCount.length) {
                sizeTotals.set('Unknown', (sizeTotals.get('Unknown') || 0) + qty);
            } else {
                sizesToCount.forEach((sz) => {
                    const key = String(sz || '').trim() || 'Unknown';
                    sizeTotals.set(key, (sizeTotals.get(key) || 0) + qty);
                });
            }
        });
    });

    const topProducts = Array.from(topProductMap.values())
        .sort((a, b) => b.totalSold - a.totalSold)
        .slice(0, 5);

    const salesByCategory = Array.from(categoryTotals.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    const salesBySize = Array.from(sizeTotals.entries())
        .map(([size, value]) => ({ size, value }))
        .sort((a, b) => b.value - a.value);

    const availableSizes = Array.from(availableSizeCounts.entries())
        .map(([size, count]) => ({ size, count }))
        .sort((a, b) => b.count - a.count);

    return { topProducts, salesByCategory, salesBySize, availableSizes };
};

const buildDashboardPayload = async (forceRefresh = false) => {
    try {
        const cacheKey = 'dashboard:payload:v1';
        if (!forceRefresh) {
            if (_cachedDashboard && (Date.now() - _cachedAt) < CACHE_TTL) {
                return _cachedDashboard;
            }

            const cachedEntry = dashboardCache.get(cacheKey);
            if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
                return cachedEntry.value;
            }

            const redisEntry = await getCacheValue(cacheKey);
            if (redisEntry) {
                _cachedDashboard = redisEntry;
                _cachedAt = Date.now();
                return redisEntry;
            }
        }

        const Order = require('../models/Order');
        const User = require('../models/User');
        const Product = require('../models/Product');
        const Contact = require('../models/Contact');

        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        const previousWindowStart = new Date(todayStart);
        previousWindowStart.setDate(previousWindowStart.getDate() - 1);

        // Exclude cancelled orders from revenue calculations
        const revenueMatchNotCancelled = { $match: { orderStatus: { $ne: 'Cancelled' } } };

        const [currentRevenueAgg, previousRevenueAgg, newOrders, previousOrders, newCustomers, previousCustomers, catalogProducts, totalOrders, ordersForCatalog, recentContacts, contactCount, orderStatusAgg, paymentStatusAgg] = await Promise.all([
            Order.aggregate([revenueMatchNotCancelled, { $group: { _id: null, total: { $sum: '$finalAmount' } } }]),
            Order.aggregate([
                { $match: { createdAt: { $gte: yesterdayStart, $lt: todayStart }, orderStatus: { $ne: 'Cancelled' } } },
                { $group: { _id: null, total: { $sum: '$finalAmount' } } }
            ]),
            Order.countDocuments({ createdAt: { $gte: todayStart } }),
            Order.countDocuments({ createdAt: { $gte: previousWindowStart, $lt: todayStart } }),
            User.countDocuments({ createdAt: { $gte: todayStart } }),
            User.countDocuments({ createdAt: { $gte: previousWindowStart, $lt: todayStart } }),
            Product.find({}, 'name stock maincategory brand finalprice baseprice pic1 size').lean(),
            Order.countDocuments(),
            Order.find({}, 'products').lean(),
            Contact.find().sort({ createdAt: -1 }).limit(5).lean(),
            Contact.countDocuments(),
            Order.aggregate([{ $group: { _id: { $ifNull: ['$orderStatus', 'Unknown'] }, count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
            Order.aggregate([{ $group: { _id: { $ifNull: ['$paymentStatus', 'Unknown'] }, count: { $sum: 1 } } }, { $sort: { count: -1 } }])
        ]);

        const toStockNumber = (value) => {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : Number.NaN;
        };

        const isInStock = (value) => {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) return parsed > 0;
            const raw = String(value || '').trim().toLowerCase();
            if (!raw) return false;
            if (raw.includes('out of stock') || raw === 'out') return false;
            if (raw.includes('in stock')) return true;
            return false;
        };

        const activeProducts = (catalogProducts || []).filter((item) => isInStock(item.stock)).length;

        const months = Array.from({ length: 12 }, (_, index) => {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
            return { year: monthDate.getFullYear(), month: monthDate.getMonth() };
        });

        const monthlyRevenue = await Order.aggregate([
            { $match: { createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) }, orderStatus: { $ne: 'Cancelled' } } },
            {
                $group: {
                    _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                    revenue: { $sum: '$finalAmount' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        const { salesByCategory, topProducts, salesBySize, availableSizes } = buildCatalogAnalytics({
            orders: ordersForCatalog,
            products: catalogProducts
        });

        const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5).lean();
        const recentUsers = await User.find().sort({ createdAt: -1 }).limit(3).lean();

        const lowStockCandidates = (catalogProducts || [])
            .map((item) => ({ ...item, stockNum: toStockNumber(item.stock) }))
            .filter((item) => Number.isFinite(item.stockNum) && item.stockNum > 0 && item.stockNum <= 10)
            .sort((a, b) => a.stockNum - b.stockNum);
        const lowStock = lowStockCandidates.slice(0, 3);

        const orderStatusBreakdown = orderStatusAgg.map((item) => ({ name: String(item._id || 'Unknown'), value: Number(item.count || 0) }));
        const paymentStatusBreakdown = paymentStatusAgg.map((item) => ({ name: String(item._id || 'Unknown'), value: Number(item.count || 0) }));

        const previousMetrics = {
            totalRevenue: previousRevenueAgg[0]?.total || 0,
            newOrders: previousOrders,
            newCustomers: previousCustomers,
            activeProducts,
            totalOrders: Math.max(totalOrders - newOrders, 0)
        };

        const metrics = {
            totalRevenue: currentRevenueAgg[0]?.total || 0,
            newOrders,
            newCustomers,
            activeProducts,
            totalOrders
        };

        const payload = {
            metrics,
            previousMetrics,
            monthlyData: months.map(({ year, month }, index) => {
                const found = monthlyRevenue.find((item) => item._id.year === year && item._id.month === month + 1);
                const revenue = found ? found.revenue : 0;
                const target = Math.round((monthlyRevenue[0]?.revenue || 100000) * Math.pow(1.1, index));
                return { month: `${year}-${String(month + 1).padStart(2, '0')}`, revenue, target };
            }),
            salesByCategory,
            topProducts,
            salesBySize,
            availableSizes,
            lowStockCount: lowStockCandidates.length,
            activeSessions: recentUsers.length,
            activity: {
                recentOrders,
                recentUsers,
                lowStock,
                recentContacts
            },
            recentContacts,
            contactCount,
            orderStatusBreakdown,
            paymentStatusBreakdown,
            todos: [
                { id: 1, text: 'Review new orders', done: false },
                { id: 2, text: 'Check low inventory products', done: false },
                { id: 3, text: 'Respond to customer queries', done: false }
            ],
            counts: {
                users: await User.countDocuments(),
                products: await Product.countDocuments(),
                orders: await Order.countDocuments()
            },
            mongoStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
        };

        _cachedDashboard = payload;
        _cachedAt = Date.now();
        dashboardCache.set(cacheKey, { value: payload, expiresAt: Date.now() + Math.max(1000, CACHE_TTL) });
        await setCacheValue(cacheKey, payload, Math.max(1, Math.floor(CACHE_TTL / 1000)));

        return payload;
    } catch (err) {
        console.error('buildDashboardPayload error:', err && err.message ? err.message : err);
        throw err;
    }
};

// Admin login using user credentials. Returns JWT if admin.
const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
        const User = require('../models/User');
        const user = await User.findOne({ email: String(email).trim().toLowerCase() }).lean();
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: 'Invalid credentials' });

        // Determine admin eligibility
        const adminEmailsRaw = String(process.env.ADMIN_EMAILS || '');
        const adminEmails = adminEmailsRaw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        const isAdmin = adminEmails.includes((user.email || '').toLowerCase()) || user.isAdmin || user.role === 'admin';
        if (!isAdmin) return res.status(403).json({ message: 'Not an admin user' });

        const jwtSecret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
        if (!jwtSecret) return res.status(500).json({ message: 'Server JWT secret not configured' });

        const token = jwt.sign({ sub: String(user._id), email: user.email, isAdmin: true, name: user.name }, jwtSecret, { expiresIn: process.env.ADMIN_JWT_EXPIRES || '12h' });
        res.json({ token, expiresIn: process.env.ADMIN_JWT_EXPIRES || '12h' });
    } catch (err) {
        console.error('adminLogin error:', err && err.message ? err.message : err);
        res.status(500).json({ message: 'Login failed' });
    }
};

const lightweightHealth = async () => {
    try {
        const User = require('../models/User');
        const Product = require('../models/Product');
        const Order = require('../models/Order');
        const [users, products, orders] = await Promise.all([
            User.countDocuments(),
            Product.countDocuments(),
            Order.countDocuments()
        ]);
        return { counts: { users, products, orders }, mongoStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' };
    } catch (err) {
        return { counts: { users: 0, products: 0, orders: 0 }, mongoStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' };
    }
};

module.exports = {
    login: adminLogin,
    getDashboard: async (req, res) => {
        try {
            const payload = await buildDashboardPayload();
            res.json(payload);
        } catch (err) {
            console.error('Admin dashboard error:', err && err.message ? err.message : err);
            res.status(500).json({ message: 'Failed to fetch dashboard data' });
        }
    },
    getDashboardAnalytics: async (req, res) => {
        try {
            const payload = await buildDashboardPayload();
            res.json(payload);
        } catch (err) {
            console.error('Admin dashboard analytics error:', err && err.message ? err.message : err);
            res.status(500).json({ message: 'Failed to fetch dashboard analytics' });
        }
    },
    testConnection: async (req, res) => {
        try {
            const health = await lightweightHealth();
            res.json({ success: true, counts: health.counts, mongoStatus: health.mongoStatus });
        } catch (err) {
            console.error('Admin test connection error:', err && err.message ? err.message : err);
            res.status(500).json({ success: false, message: 'Database test failed' });
        }
    },
    getUsers: async (req, res) => {
        try {
            const User = require('../models/User');
            const { enrichUsersWithOrderStats } = require('../utils/userOrderStats');
            const users = await User.find().sort({ createdAt: -1 }).lean();
            const enrichedUsers = await enrichUsersWithOrderStats(users);
            res.json({ users: enrichedUsers });
        } catch (err) {
            console.error('Admin getUsers error:', err && err.message ? err.message : err);
            res.status(500).json({ message: 'Failed to fetch users' });
        }
    },
    getActivities: async (req, res) => {
        try {
            const Activity = require('../models/Activity');
            const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 1000);
            const searchText = String(req.query.q || '').trim();
            const actionFilter = String(req.query.action || '').trim();
            const userIdFilter = String(req.query.userId || '').trim();
            const userEmailFilter = String(req.query.userEmail || '').trim();

            const query = {};
            if (actionFilter) query.action = new RegExp(actionFilter, 'i');
            if (userIdFilter) query.userId = userIdFilter;
            if (userEmailFilter) query.userEmail = new RegExp(userEmailFilter, 'i');
            if (searchText) {
                query.$or = [
                    { action: new RegExp(searchText, 'i') },
                    { userEmail: new RegExp(searchText, 'i') },
                    { 'meta.orderId': new RegExp(searchText, 'i') }
                ];
            }

            const activities = await Activity.find(query).sort({ createdAt: -1 }).limit(limit).lean();
            res.json({ activities });
        } catch (err) {
            console.error('Admin getActivities error:', err && err.message ? err.message : err);
            res.status(500).json({ message: 'Failed to fetch activities' });
        }
    },
    getOrders: async (req, res) => {
        try {
            const Order = require('../models/Order');
            const orders = await Order.find().sort({ createdAt: -1 });
            res.json({ orders });
        } catch (err) {
            console.error('Admin getOrders error:', err && err.message ? err.message : err);
            res.status(500).json({ message: 'Failed to fetch orders' });
        }
    }
};
