import { io, Socket } from 'socket.io-client';

// Fallback to local machine running on port 5000
const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  "https://mafiagame-2spi.onrender.com";

export const socket: Socket = io(BACKEND_URL, {
  autoConnect: false,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
});
