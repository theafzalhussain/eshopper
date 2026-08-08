const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

/* ════════════════════════════════════════════════════════════════════
   SOCKET IDENTITY

   The handshake used to be taken at face value: whatever `auth.userId`
   a client sent became its room. Sending the literal string
   'admin-dashboard' was therefore enough for anyone to join the admin
   room and receive every order payload (delivery OTPs, rider phone,
   coordinates).

   Identity is now derived on the server:
     1. a signed admin JWT (same secret as the verifyAdmin middleware), or
     2. a role lookup for a real user id that exists in the database.
   Anything else connects as a guest: no rooms, no payloads.
════════════════════════════════════════════════════════════════════ */

const ROLE_CACHE_TTL_MS = 60_000;
const ROLE_CACHE_MAX = 5000;
const roleCache = new Map(); // id -> { exists, isAdmin, at }

function isObjectId(value) {
    const v = String(value || '');
    return /^[0-9a-fA-F]{24}$/.test(v) && mongoose.Types.ObjectId.isValid(v);
}

function cacheGet(id) {
    const hit = roleCache.get(id);
    if (!hit) return null;
    if (Date.now() - hit.at > ROLE_CACHE_TTL_MS) {
        roleCache.delete(id);
        return null;
    }
    return hit;
}

function cacheSet(id, value) {
    if (roleCache.size >= ROLE_CACHE_MAX) roleCache.clear();
    roleCache.set(id, { ...value, at: Date.now() });
}

/** Drop a cached role, e.g. after an admin promotes/demotes someone. */
function invalidateSocketRole(id) {
    roleCache.delete(String(id || ''));
}

async function lookupUser(id) {
    const cached = cacheGet(id);
    if (cached) return cached;

    let value = { exists: false, isAdmin: false };
    try {
        const user = await User.findById(id).select('role').lean();
        if (user) {
            value = { exists: true, isAdmin: String(user.role || '').toLowerCase() === 'admin' };
        }
    } catch (_) {
        // On a DB hiccup treat the socket as a guest rather than trusting the client
        return { exists: false, isAdmin: false };
    }
    cacheSet(id, value);
    return value;
}

/**
 * @returns {Promise<{userId: string|null, isAdmin: boolean}>}
 */
async function resolveSocketIdentity(auth = {}) {
    const claimedId = String(auth.userId || '').trim();
    const adminToken = String(auth.adminToken || '').trim();
    const secret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;

    // 1. Signed admin token — strongest proof, no DB hit needed
    if (adminToken && secret) {
        try {
            const payload = jwt.verify(adminToken, secret);
            const isAdminClaim = payload
                && (payload.isAdmin === true || String(payload.role || '').toLowerCase() === 'admin');
            if (isAdminClaim) {
                const tokenId = String(payload.sub || payload.id || payload._id || '').trim();
                const id = isObjectId(tokenId) ? tokenId : (isObjectId(claimedId) ? claimedId : null);
                return { userId: id, isAdmin: true };
            }
        } catch (_) { /* invalid/expired token → fall through */ }
    }

    // 2. Plain user id: must look like an id and must exist
    if (!isObjectId(claimedId)) return { userId: null, isAdmin: false };

    const { exists, isAdmin } = await lookupUser(claimedId);
    if (!exists) return { userId: null, isAdmin: false };

    return { userId: claimedId, isAdmin };
}

/**
 * Socket.IO middleware: attaches the verified identity to socket.data.
 */
function socketIdentityMiddleware() {
    return async (socket, next) => {
        let identity = { userId: null, isAdmin: false };
        try {
            identity = await resolveSocketIdentity(socket.handshake.auth || {});
        } catch (_) { /* treat failures as a guest */ }
        socket.data.identity = identity;
        socket.data.userId = identity.userId;      // legacy field used by existing handlers
        socket.data.isAdmin = identity.isAdmin;
        next();
    };
}

/**
 * Joins the rooms the verified identity is entitled to.
 * @returns {string[]} rooms joined (empty for guests)
 */
function joinIdentityRooms(socket) {
    const userId = String(socket.data.userId || '').trim();
    const isAdmin = Boolean(socket.data.isAdmin);
    const rooms = [];

    if (userId) {
        socket.join(`user:${userId}`);
        rooms.push(`user:${userId}`);
    }
    if (isAdmin) {
        socket.join('admin:dashboard');
        rooms.push('admin:dashboard');
    }
    return rooms;
}

module.exports = {
    resolveSocketIdentity,
    socketIdentityMiddleware,
    joinIdentityRooms,
    invalidateSocketRole,
    isObjectId
};
