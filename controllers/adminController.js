// Admin Controller
// Modularized admin panel logic

const mongoose = require('mongoose');

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
        });
    });

    const topProducts = Array.from(topProductMap.values())
        .sort((a, b) => b.totalSold - a.totalSold)
        .slice(0, 5);

    const salesByCategory = Array.from(categoryTotals.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    return { topProducts, salesByCategory };
};

const buildDashboardPayload = async () => {
    const Order = require('../models/Order');
    const User = require('../models/User');
    const Product = require('../models/Product');

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const previousWindowStart = new Date(todayStart);
    previousWindowStart.setDate(previousWindowStart.getDate() - 1);

    const [currentRevenueAgg, previousRevenueAgg, newOrders, previousOrders, newCustomers, previousCustomers, catalogProducts, totalOrders, ordersForCatalog] = await Promise.all([
        Order.aggregate([{ $group: { _id: null, total: { $sum: '$finalAmount' } } }]),
        Order.aggregate([
            { $match: { createdAt: { $gte: yesterdayStart, $lt: todayStart } } },
            { $group: { _id: null, total: { $sum: '$finalAmount' } } }
        ]),
        Order.countDocuments({ createdAt: { $gte: todayStart } }),
        Order.countDocuments({ createdAt: { $gte: previousWindowStart, $lt: todayStart } }),
        User.countDocuments({ createdAt: { $gte: todayStart } }),
        User.countDocuments({ createdAt: { $gte: previousWindowStart, $lt: todayStart } }),
        Product.find({}, 'name stock maincategory brand finalprice baseprice pic1').lean(),
        Order.countDocuments(),
        Order.find({}, 'products').lean()
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
        { $match: { createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) } } },
        {
            $group: {
                _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                revenue: { $sum: '$finalAmount' }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const { salesByCategory, topProducts } = buildCatalogAnalytics({
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

    return {
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
        lowStockCount: lowStockCandidates.length,
        activeSessions: recentUsers.length,
        activity: {
            recentOrders,
            recentUsers,
            lowStock
        },
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
};

module.exports = {
    // Admin login
    login: (req, res) => {
        res.json({ message: 'Admin login endpoint' });
    },
    // Admin dashboard - unified metrics, charts, activity, todos
    getDashboard: async (req, res) => {
        try {
            const payload = await buildDashboardPayload();
            res.json(payload);
        } catch (err) {
            console.error('Admin dashboard error:', err.message);
            res.status(500).json({ message: 'Failed to fetch dashboard data' });
        }
    },
    // Admin dashboard analytics alias for premium UI consumers
    getDashboardAnalytics: async (req, res) => {
        try {
            const payload = await buildDashboardPayload();
            res.json(payload);
        } catch (err) {
            console.error('Admin dashboard analytics error:', err.message);
            res.status(500).json({ message: 'Failed to fetch dashboard analytics' });
        }
    },
    // Admin connectivity test endpoint
    testConnection: async (req, res) => {
        try {
            const payload = await buildDashboardPayload();
            res.json({
                success: true,
                counts: payload.counts,
                mongoStatus: payload.mongoStatus
            });
        } catch (err) {
            console.error('Admin test connection error:', err.message);
            res.status(500).json({ success: false, message: 'Database test failed' });
        }
    },
    // Admin user management
    getUsers: async (req, res) => {
        try {
            const User = require('../models/User');
            const users = await User.find().sort({ createdAt: -1 });
            res.json({ users });
        } catch (err) {
            console.error('Admin getUsers error:', err.message);
            res.status(500).json({ message: 'Failed to fetch users' });
        }
    },
    // Admin order management
    getOrders: async (req, res) => {
        try {
            const Order = require('../models/Order');
            const orders = await Order.find().sort({ createdAt: -1 });
            res.json({ orders });
        } catch (err) {
            console.error('Admin getOrders error:', err.message);
            res.status(500).json({ message: 'Failed to fetch orders' });
        }
    }
};