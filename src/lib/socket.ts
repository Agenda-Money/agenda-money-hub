import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create a singleton socket instance with autoConnect: false to prevent connection spam
// We explicitly connect when we have a valid user session (MSISDN)
export const socket: Socket = io(API_URL, {
  autoConnect: false,
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  query: {},
});

// Helper to join rooms
export const joinUserRooms = (msisdn: string) => {
  if (socket.connected) {
    socket.emit('join-user-room', msisdn);

  }
};
