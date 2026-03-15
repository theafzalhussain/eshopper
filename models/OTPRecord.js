const mongoose = require('mongoose');
const otpSchema = new mongoose.Schema({
    email: String,
    otp: String,
    createdAt: { type: Date, expires: '5m', default: Date.now }
});
module.exports = mongoose.model('OTPRecord', otpSchema);