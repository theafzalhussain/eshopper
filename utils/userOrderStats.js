const mongoose = require('mongoose');
const Order = require('../models/Order');
const Checkout = require('../models/Checkout');

const calculateMembershipType = (totalOrders = 0) => {
    const orders = Number(totalOrders || 0);
    if (orders >= 10) return 'Elite';
    if (orders >= 5) return 'Gold';
    return 'Silver';
};

const toStringId = (value) => {
    if (!value) return '';
    if (typeof value === 'object') {
        return String(value._id || value.id || '');
    }
    return String(value);
};

const buildUserOrderStats = async (users = []) => {
    const userList = Array.isArray(users) ? users : [];
    const userIds = [...new Set(userList.map((user) => toStringId(user?._id || user?.id || user)).filter(Boolean))];

    if (!userIds.length) return new Map();

    const checkoutObjectIds = userIds
        .filter((userId) => mongoose.Types.ObjectId.isValid(userId))
        .map((userId) => new mongoose.Types.ObjectId(userId));

    const [orderAgg, checkoutAgg] = await Promise.all([
        Order.aggregate([
            { $match: { userid: { $in: userIds } } },
            { $group: { _id: '$userid', count: { $sum: 1 } } }
        ]),
        checkoutObjectIds.length
            ? Checkout.aggregate([
                { $match: { user: { $in: checkoutObjectIds } } },
                { $group: { _id: '$user', count: { $sum: 1 } } }
            ])
            : Promise.resolve([])
    ]);

    const stats = new Map();

    orderAgg.forEach((item) => {
        const userId = toStringId(item._id);
        if (!userId) return;
        const current = stats.get(userId) || { orderCount: 0, checkoutCount: 0, totalOrders: 0, membershipType: 'Silver' };
        current.orderCount = Number(item.count || 0);
        current.totalOrders = Math.max(current.totalOrders, current.orderCount, current.checkoutCount);
        current.membershipType = calculateMembershipType(current.totalOrders);
        stats.set(userId, current);
    });

    checkoutAgg.forEach((item) => {
        const userId = toStringId(item._id);
        if (!userId) return;
        const current = stats.get(userId) || { orderCount: 0, checkoutCount: 0, totalOrders: 0, membershipType: 'Silver' };
        current.checkoutCount = Number(item.count || 0);
        current.totalOrders = Math.max(current.totalOrders, current.orderCount, current.checkoutCount);
        current.membershipType = calculateMembershipType(current.totalOrders);
        stats.set(userId, current);
    });

    return stats;
};

const enrichUsersWithOrderStats = async (users = []) => {
    const userList = Array.isArray(users) ? users : [];
    const stats = await buildUserOrderStats(userList);

    return userList.map((user) => {
        const plainUser = typeof user?.toJSON === 'function' ? user.toJSON() : (typeof user?.toObject === 'function' ? user.toObject() : { ...user });
        const userId = toStringId(plainUser._id || plainUser.id);
        const currentStats = stats.get(userId) || { orderCount: 0, checkoutCount: 0, totalOrders: 0 };
        const totalOrders = Math.max(currentStats.orderCount, currentStats.checkoutCount, currentStats.totalOrders);
        const autoMembershipType = calculateMembershipType(totalOrders);
        
        // If an admin manually set a membership, respect it! Otherwise use the calculated one.
        const membershipType = plainUser.isManualMembership ? plainUser.membershipType : autoMembershipType;

        return {
            ...plainUser,
            id: plainUser.id || plainUser._id,
            totalOrders,
            membershipType,
            orderCount: currentStats.orderCount,
            checkoutCount: currentStats.checkoutCount
        };
    });
};

module.exports = {
    calculateMembershipType,
    buildUserOrderStats,
    enrichUsersWithOrderStats
};