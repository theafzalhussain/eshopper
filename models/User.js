const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String },
    phone: { type: String },
    addressline1: { type: String },
    addressline2: { type: String },
    landmark: { type: String },
    deliveryNotes: { type: String },
    city: { type: String },
    state: { type: String },
    pin: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    pic: { type: String },
    addresses: [{
        type: { type: String, default: 'Home' },
        fullName: String,
        phone: String,
        addressline1: String,
        city: String,
        state: String,
        pin: String,
        latitude: Number,
        longitude: Number,
        country: { type: String, default: 'India' }
    }],
    settings: {
        notifications: {
            orderUpdates: { type: Boolean, default: true },
            deliveryUpdates: { type: Boolean, default: true },
            promotionalEmails: { type: Boolean, default: true },
            priceAlerts: { type: Boolean, default: false },
            wishlistAlerts: { type: Boolean, default: true },
            smsAlerts: { type: Boolean, default: false },
        },
        privacy: {
            profileVisibility: { type: String, default: 'Private' },
            personalizedRecommendations: { type: Boolean, default: true },
        },
        security: {
            twoFactorEnabled: { type: Boolean, default: false },
            loginAlerts: { type: Boolean, default: true },
        },
        communication: {
            newsletter: { type: Boolean, default: true },
            whatsappUpdates: { type: Boolean, default: false },
            pushNotifications: { type: Boolean, default: true },
        },
    },
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