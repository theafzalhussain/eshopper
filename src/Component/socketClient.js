import { io } from 'socket.io-client';
import { BASE_URL, SOCKET_TRANSPORTS } from '../constants';
import { AUTH_CHANGED_EVENT, socketHandshakeAuth } from '../utils/authEvents';

const SOCKET_URL = BASE_URL;
let socketClient;

/* Drop the shared socket on login/logout so it never keeps a previous
   session's identity (and rooms). */
if (typeof window !== 'undefined') {
  window.addEventListener(AUTH_CHANGED_EVENT, () => {
    if (!socketClient) return;
    try { socketClient.disconnect(); } catch (_) { /* ignore */ }
    socketClient = undefined;
  });
}

export function getSocketClient() {
  if (!socketClient) {
    socketClient = io(SOCKET_URL, {
      transports: SOCKET_TRANSPORTS,
      auth: socketHandshakeAuth(),
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
      timeout: 12000,
    });

    socketClient.on('connect', () => console.log('✅ Socket client connected'));
    socketClient.on('disconnect', () => console.log('❌ Socket client disconnected'));
    /* A transport hiccup is retried automatically — warn, never console.error,
       so a cold-starting API does not register as an app error in RUM. */
    socketClient.on('connect_error', (err) => console.warn('Socket client connect_error:', err && err.message));
  }
  return socketClient;
}

export default getSocketClient;
