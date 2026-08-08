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
 * The identity used for the socket handshake:
 * admins share one 'admin-dashboard' room, users get their own id,
 * guests get null.
 */
export function socketUserId() {
    try {
        const isAdmin = localStorage.getItem('isAdmin') === 'true'
            || (localStorage.getItem('role') || '').toLowerCase() === 'admin'
        if (isAdmin) return 'admin-dashboard'
        return localStorage.getItem('userid') || null
    } catch (_) {
        return null
    }
}

/** Tell listeners (the realtime socket) that the session changed. */
export function notifyAuthChanged() {
    try {
        window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
    } catch (_) { /* ignore */ }
}
