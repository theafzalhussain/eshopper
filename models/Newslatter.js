const mongoose = require('mongoose');

const newslatterSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    subscribedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Newslatter || mongoose.model('Newslatter', newslatterSchema);