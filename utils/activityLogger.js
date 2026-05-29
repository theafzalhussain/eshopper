const Activity = require('../models/Activity');

async function logActivity(req, { action, meta = {}, userId, userEmail } = {}) {
    if (!action) return null;

    try {
        const activity = await Activity.create({
            userId,
            userEmail,
            action,
            meta,
            ip: req?.ip || req?.headers?.['x-forwarded-for'] || '',
            userAgent: req?.headers?.['user-agent'] || ''
        });

        const io = req?.app?.get?.('io');
        if (io) {
            io.emit('activityLogged', {
                _id: String(activity._id),
                userId: activity.userId || null,
                userEmail: activity.userEmail || '',
                action: activity.action,
                meta: activity.meta || {},
                createdAt: activity.createdAt
            });
        }

        return activity;
    } catch (error) {
        console.warn('Activity log error:', error?.message || error);
        return null;
    }
}

module.exports = { logActivity };
