import { io } from 'socket.io-client';

// You can set this to your backend URL if needed
const SOCKET_URL = window.location.origin.replace(/^http/, 'ws');

let socket;

export function getSocket(userId = 'admin-dashboard') {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { userId },
      reconnection: true,
    });
  }
  return socket;
}
