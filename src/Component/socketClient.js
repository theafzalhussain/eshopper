import { io } from 'socket.io-client';
import { BASE_URL, SOCKET_TRANSPORTS } from '../constants';

const SOCKET_URL = BASE_URL;
let socketClient;

export function getSocketClient() {
  if (!socketClient) {
    const userId = localStorage.getItem('userid') || 'guest';
    socketClient = io(SOCKET_URL, {
      transports: SOCKET_TRANSPORTS,
      auth: { userId },
      reconnection: true,
    });

    socketClient.on('connect', () => console.log('✅ Socket client connected'));
    socketClient.on('disconnect', () => console.log('❌ Socket client disconnected'));
    socketClient.on('connect_error', (err) => console.error('🔴 Socket client error', err && err.message));
  }
  return socketClient;
}

export default getSocketClient;
