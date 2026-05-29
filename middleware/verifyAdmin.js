const jwt = require('jsonwebtoken');
const User = require('../models/User');

const isLoopbackAddress = (value = '') => {
  const ip = String(value || '').trim().toLowerCase();
  return [
    '::1',
    '127.0.0.1',
    'localhost',
    '::ffff:127.0.0.1'
  ].includes(ip) || ip.endsWith('127.0.0.1');
};

// Verify admin middleware. Supports JWT (Authorization: Bearer <token>) or legacy x-admin-secret header.
module.exports = async function verifyAdmin(req, res, next) {
  try {
    const adminSecret = process.env.ADMIN_SECRET;
    const jwtSecret = process.env.ADMIN_JWT_SECRET;

    // Try JWT first
    const authHeader = String(req.headers.authorization || req.headers.Authorization || '').trim();
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ') && jwtSecret) {
      const token = authHeader.split(' ')[1];
      try {
        const payload = jwt.verify(token, jwtSecret);
        req.user = payload;
        if (payload && (payload.isAdmin || payload.role === 'admin')) return next();
        return res.status(403).json({ message: 'Admin privileges required' });
      } catch (err) {
        // invalid token -> fallthrough to check x-admin-secret
        console.warn('verifyAdmin: invalid JWT token');
      }
    }

    // Legacy: check x-admin-secret header
    if (adminSecret && req.headers['x-admin-secret'] && req.headers['x-admin-secret'] === adminSecret) {
      return next();
    }

    // If req.user already set by upstream auth middleware, honor admin flag
    if (req.user && (req.user.isAdmin || req.user.role === 'admin')) return next();

    // Fallback for existing logged-in admin sessions in the browser.
    const adminUserId = String(req.headers['x-admin-userid'] || '').trim();
    const adminRoleHeader = String(req.headers['x-admin-role'] || '').trim().toLowerCase();
    if (adminUserId && adminRoleHeader === 'admin') {
      try {
        const adminUser = await User.findById(adminUserId).select('role email').lean();
        if (adminUser && String(adminUser.role || '').toLowerCase() === 'admin') {
          req.user = { sub: String(adminUserId), role: 'admin', isAdmin: true, email: adminUser.email || '' };
          return next();
        }
      } catch (lookupErr) {
        console.warn('verifyAdmin user lookup failed:', lookupErr && lookupErr.message ? lookupErr.message : lookupErr);
      }
    }

    // Allow localhost when no admin secret configured (convenience only)
    const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (!adminSecret && !jwtSecret && (isLoopbackAddress(req.ip) || isLoopbackAddress(req.socket?.remoteAddress) || isLoopbackAddress(forwardedFor))) return next();

    return res.status(403).json({ message: 'Admin authorization required' });
  } catch (err) {
    console.error('verifyAdmin error:', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Authorization check failed' });
  }
};
