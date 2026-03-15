const mongoose = require('mongoose');

const otpRecordSchema = new mongoose.Schema({
    email: { type: String, required: true },
    otp: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 600 }, // 10 min expiry
});

module.exports = mongoose.model('OTPRecord', otpRecordSchema);