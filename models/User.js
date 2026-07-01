const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    username: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
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
        addressline2: String, // Added
        landmark: String,     // Added
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
    isManualMembership: { type: Boolean, default: false },
    totalOrders: { type: Number, default: 0 },
    otp: { type: String },
    otpExpires: { type: Date },
    passwordHistory: [{
        hash: { type: String },
        createdAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});

// Indexes for common queries and admin filters
// Note: `unique: true` above already creates indexes for email and username.
// Keep composite and range indexes that help queries and admin filters.
userSchema.index({ membershipType: 1, totalOrders: -1 });
userSchema.index({ createdAt: -1 });

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
    
    // Only auto-update if not manually overridden by admin!
    if (!user.isManualMembership) {
        user.membershipType = this.calculateMembershipType(ordersCount);
    }
    
    await user.save();
    return user;
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);