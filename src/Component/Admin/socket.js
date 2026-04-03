import { io } from 'socket.io-client';
import { BASE_URL, SOCKET_TRANSPORTS } from '../../constants';

// Use the backend URL for socket connection
const SOCKET_URL = BASE_URL;

let socket;

export function getSocket(userId = 'admin-dashboard') {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: SOCKET_TRANSPORTS,
      auth: { userId },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Add connection event listeners for debugging
    socket.on('connect', () => {
      console.log('✅ Socket connected to:', SOCKET_URL);
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected from:', SOCKET_URL);
    });

    socket.on('connect_error', (error) => {
      console.error('🔴 Socket connection error:', error.message);
    });
  }
  return socket;
}
