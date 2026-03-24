// Admin Controller
// Modularized admin panel logic

module.exports = {
    // Admin login
    login: (req, res) => {
        res.json({ message: 'Admin login endpoint' });
    },
    // Admin dashboard - unified metrics, charts, activity, todos
    getDashboard: async (req, res) => {
        try {
            const Order = require('../models/Order');
            const User = require('../models/User');
            const Product = require('../models/Product');

            // Metrics
            const [totalRevenue, newOrders, newCustomers, activeProducts] = await Promise.all([
                Order.aggregate([
                    { $group: { _id: null, total: { $sum: "$finalAmount" } } }
                ]),
                Order.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) } }),
                User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) } }),
                Product.countDocuments({ stock: { $ne: '0' } })
            ]);

            // Monthly revenue for last 12 months
            const now = new Date();
            const months = Array.from({length: 12}, (_, i) => {
                const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
                return { year: d.getFullYear(), month: d.getMonth() };
            });
            const monthlyRevenue = await Order.aggregate([
                { $match: { createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) } } },
                { $group: {
                    _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
                    revenue: { $sum: "$finalAmount" }
                } },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]);
            // Target: 10% growth per month (example)
            let base = monthlyRevenue.length ? monthlyRevenue[0].revenue : 100000;
            const monthlyData = months.map(({year, month}, i) => {
                const found = monthlyRevenue.find(m => m._id.year === year && m._id.month === month+1);
                const revenue = found ? found.revenue : 0;
                const target = Math.round(base * Math.pow(1.1, i));
                return { month: `${year}-${String(month+1).padStart(2,'0')}`, revenue, target };
            });

            // Sales by category (pie chart)
            const salesByCategory = await Order.aggregate([
                { $unwind: "$products" },
                { $group: { _id: "$products.maincategory", value: { $sum: "$products.qty" } } },
                { $sort: { value: -1 } }
            ]);

            // Recent activity feed (last 10 orders, new users, low inventory)
            const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5).lean();
            const recentUsers = await User.find().sort({ createdAt: -1 }).limit(3).lean();
            const lowStock = await Product.find({ stock: { $lte: '5', $ne: '0' } }).sort({ stock: 1 }).limit(3).lean();

            // To-Do list (for demo, static; can be made dynamic)
            const todos = [
                { id: 1, text: "Review today's new orders", done: false },
                { id: 2, text: "Check low inventory products", done: false },
                { id: 3, text: "Respond to customer queries", done: false }
            ];

            res.json({
                metrics: {
                    totalRevenue: totalRevenue[0]?.total || 0,
                    newOrders,
                    newCustomers,
                    activeProducts
                },
                monthlyData,
                salesByCategory,
                activity: {
                    recentOrders,
                    recentUsers,
                    lowStock
                },
                todos
            });
        } catch (err) {
            console.error('Admin dashboard error:', err.message);
            res.status(500).json({ message: 'Failed to fetch dashboard data' });
        }
    },
    // Admin user management
    getUsers: (req, res) => {
        res.json({ message: 'Admin user management endpoint' });
    },
    // Admin order management
    getOrders: (req, res) => {
        res.json({ message: 'Admin order management endpoint' });
    }
};