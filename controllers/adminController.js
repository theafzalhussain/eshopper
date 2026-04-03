// Admin Controller
// Modularized admin panel logic

const mongoose = require('mongoose');

const getNumericQuantity = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const buildTopProducts = async (Order) => {
    const results = await Order.aggregate([
        { $unwind: '$products' },
        {
            $group: {
                _id: {
                    productId: { $ifNull: ['$products.productid', '$products.name'] },
                    name: { $ifNull: ['$products.name', 'Product'] },
                    pic1: { $ifNull: ['$products.pic1', ''] },
                    maincategory: { $ifNull: ['$products.maincategory', ''] },
                    brand: { $ifNull: ['$products.brand', ''] },
                    finalprice: { $ifNull: ['$products.finalprice', '$products.price'] }
                },
                totalSold: {
                    $sum: {
                        $ifNull: [
                            '$products.qty',
                            { $ifNull: ['$products.quantity', 1] }
                        ]
                    }
                }
            }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 5 }
    ]);

    return results.map((item) => ({
        _id: item._id.productId,
        name: item._id.name,
        pic1: item._id.pic1,
        maincategory: item._id.maincategory,
        brand: item._id.brand,
        finalprice: item._id.finalprice,
        totalSold: item.totalSold
    }));
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

    const [currentRevenueAgg, previousRevenueAgg, newOrders, previousOrders, newCustomers, previousCustomers, stockProducts, totalOrders] = await Promise.all([
        Order.aggregate([{ $group: { _id: null, total: { $sum: '$finalAmount' } } }]),
        Order.aggregate([
            { $match: { createdAt: { $gte: yesterdayStart, $lt: todayStart } } },
            { $group: { _id: null, total: { $sum: '$finalAmount' } } }
        ]),
        Order.countDocuments({ createdAt: { $gte: todayStart } }),
        Order.countDocuments({ createdAt: { $gte: previousWindowStart, $lt: todayStart } }),
        User.countDocuments({ createdAt: { $gte: todayStart } }),
        User.countDocuments({ createdAt: { $gte: previousWindowStart, $lt: todayStart } }),
        Product.find({}, 'name stock').lean(),
        Order.countDocuments()
    ]);

    const toStockNumber = (value) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const activeProducts = (stockProducts || []).filter((item) => toStockNumber(item.stock) > 0).length;

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

    const salesByCategory = await Order.aggregate([
        { $unwind: '$products' },
        {
            $group: {
                _id: { $ifNull: ['$products.maincategory', 'Uncategorized'] },
                value: {
                    $sum: {
                        $ifNull: [
                            '$products.qty',
                            { $ifNull: ['$products.quantity', 1] }
                        ]
                    }
                }
            }
        },
        { $sort: { value: -1 } }
    ]);

    const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5).lean();
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(3).lean();
    const lowStockCandidates = (stockProducts || [])
        .map((item) => ({ ...item, stockNum: toStockNumber(item.stock) }))
        .filter((item) => item.stockNum > 0 && item.stockNum <= 10)
        .sort((a, b) => a.stockNum - b.stockNum);
    const lowStock = lowStockCandidates.slice(0, 3);
    const topProducts = await buildTopProducts(Order);

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
        salesByCategory: salesByCategory.map((item) => ({
            name: item._id || 'Uncategorized',
            value: item.value || 0
        })),
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