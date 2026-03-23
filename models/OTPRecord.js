const mongoose = require('mongoose');
const otpSchema = new mongoose.Schema({
    email: String,
    otp: String,
    createdAt: { type: Date, expires: '5m', default: Date.now }
});
module.exports = mongoose.models.OTPRecord || mongoose.model('OTPRecord', otpSchema);