/*
 * A one-line holder for the socket.io instance.
 *
 * Background workers used to reach the socket server with:
 *     require('../server').getApp()
 * which never worked — server.js has no module.exports, so `getApp` was
 * undefined and every emit fell into a `|| (() => null)` fallback. The refund
 * worker's "refund processed" notification and the Razorpay webhook's realtime
 * update were therefore silently dead.
 *
 * Worse, in the standalone worker process that require would *evaluate*
 * server.js, which calls httpServer.listen() and starts the cron jobs — a second
 * HTTP server, an EADDRINUSE, or duplicated scheduled work.
 *
 * This module imports nothing, so anything may require it without creating a
 * cycle. In a process where no socket server was registered (the worker), emit
 * is simply a no-op.
 */

let io = null;

const setIo = (instance) => { io = instance || null; };

const getIo = () => io;

/**
 * Emit to a room, or to everyone when no room is given.
 * Failures are swallowed: realtime delivery must never break the work that
 * triggered it — a refund must not fail because a socket did.
 */
const emit = (event, payload, room = null) => {
    try {
        if (!io) return false;
        if (room) io.to(room).emit(event, payload);
        else io.emit(event, payload);
        return true;
    } catch (err) {
        return false;
    }
};

module.exports = { setIo, getIo, emit };
