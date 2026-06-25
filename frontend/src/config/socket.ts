import { io, Socket } from 'socket.io-client';

// Fallback to local machine running on port 5000
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:5000`;

export const socket: Socket = io(BACKEND_URL, {
  autoConnect: false,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
});
