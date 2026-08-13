import { io } from 'socket.io-client';
import { BASE_URL, SOCKET_TRANSPORTS } from '../../constants';
import { AUTH_CHANGED_EVENT, socketHandshakeAuth } from '../../utils/authEvents';

// Use the backend URL for socket connection
const SOCKET_URL = BASE_URL;

let socket;

/* A logged-out admin must not keep a socket that is still in the admin room,
   so the shared instance is dropped whenever the session changes. */
if (typeof window !== 'undefined') {
  window.addEventListener(AUTH_CHANGED_EVENT, () => {
    if (!socket) return;
    try { socket.disconnect(); } catch (_) { /* ignore */ }
    socket = undefined;
  });
}

/* The admin room is granted by the server after it verifies the admin token —
   the old 'admin-dashboard' string is no longer accepted, so the argument is
   kept only for call-site compatibility. */
export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: SOCKET_TRANSPORTS,
      auth: socketHandshakeAuth(),
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
    });

    // Add connection event listeners for debugging
    socket.on('connect', () => {
      console.log('✅ Socket connected to:', SOCKET_URL);
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected from:', SOCKET_URL);
    });

    socket.on('connect_error', (error) => {
      console.warn('Admin socket connect_error:', error && error.message);
    });
  }
  return socket;
}
