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

/* This collection had no indexes at all, yet the admin activity feed queries it
   with .sort({ createdAt: -1 }).limit(n) — a collection scan plus an in-memory
   sort that grows with every logged action, and POST /api/activity-log appends
   to it without authentication. */
ActivitySchema.index({ createdAt: -1 });
ActivitySchema.index({ userId: 1, createdAt: -1 });
ActivitySchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', ActivitySchema);
