const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
    {
        code: { type: String, required: true, unique: true, uppercase: true, trim: true },
        title: { type: String, default: '' },
        description: { type: String, default: '' },
        type: { type: String, enum: ['flat', 'percent'], default: 'flat' },
        value: { type: Number, required: true, min: 1 },
        minCartValue: { type: Number, default: 0, min: 0 },
        maxDiscount: { type: Number, default: 0, min: 0 },
        perUserOnce: { type: Boolean, default: false },
        totalUsageCap: { type: Number, default: 0, min: 0 },
        firstOrderOnly: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
        startsAt: { type: Date, default: null },
        expiresAt: { type: Date, default: null },
    },
    { timestamps: true }
);

module.exports = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);
