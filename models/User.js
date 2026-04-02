const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String },
    phone: { type: String },
    membershipType: { type: String, default: 'Silver' },
    totalOrders: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

userSchema.statics.calculateMembershipType = function(totalOrders = 0) {
    const orders = Number(totalOrders || 0);
    if (orders >= 10) return 'Elite';
    if (orders >= 5) return 'Gold';
    return 'Silver';
};

userSchema.statics.syncMembershipForUser = async function(userId, totalOrders = null) {
    const user = await this.findById(userId);
    if (!user) return null;

    const ordersCount = totalOrders === null ? Number(user.totalOrders || 0) : Number(totalOrders || 0);
    user.totalOrders = ordersCount;
    user.membershipType = this.calculateMembershipType(ordersCount);
    await user.save();
    return user;
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);