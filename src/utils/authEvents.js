/* ════════════════════════════════════════════════════════════════════
   AUTH CHANGE NOTIFICATIONS

   The realtime socket sends the logged-in user id in its handshake, and it
   connects once, shortly after page load. Login happens client-side (no
   reload), so without a signal the socket would stay a guest connection
   until the user refreshed — the server logs that as
   "ℹ️ Socket connected without userId" and never joins the user room.

   Anything that changes the stored session should call notifyAuthChanged().
════════════════════════════════════════════════════════════════════ */

export const AUTH_CHANGED_EVENT = 'eshopper:auth-changed'

/**
 * Handshake payload for the realtime socket.
 *
 * The server derives the room from this: a valid user id joins that user's
 * room, and a signed admin token joins the admin room. Sending a made-up
 * string gets a guest connection, so there is no point faking it here.
 */
export function socketHandshakeAuth() {
    try {
        const userId = localStorage.getItem('userid') || null
        const adminToken = (localStorage.getItem('adminToken') || '').trim()
        return adminToken ? { userId, adminToken } : { userId }
    } catch (_) {
        return { userId: null }
    }
}

/** Stable string for "who are we connecting as" — used to detect changes. */
export function socketIdentityKey() {
    const { userId, adminToken } = socketHandshakeAuth()
    return `${userId || 'guest'}:${adminToken ? 'admin' : 'user'}`
}

/** Tell listeners (the realtime socket) that the session changed. */
export function notifyAuthChanged() {
    try {
        window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
    } catch (_) { /* ignore */ }
}
