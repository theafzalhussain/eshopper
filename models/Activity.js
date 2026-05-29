const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    userEmail: { type: String, required: false },
    action: { type: String, required: true },
    meta: { type: mongoose.Schema.Types.Mixed, required: false },
    ip: { type: String, required: false },
    userAgent: { type: String, required: false },
    createdAt: { type: Date, default: Date.now }
}, { collection: 'activities' });

module.exports = mongoose.model('Activity', ActivitySchema);
