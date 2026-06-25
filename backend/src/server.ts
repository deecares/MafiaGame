import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { RoomManager } from './room-manager';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/health', (req, res) => {
  res.send({ status: 'ok', time: new Date() });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for local testing convenience
    methods: ['GET', 'POST'],
  },
});

const roomManager = new RoomManager(io);

// Keep track of socketId -> { roomCode, playerId } for quick disconnect lookup
const socketRegistry: { [socketId: string]: { roomCode: string; playerId: string } } = {};

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // 1. Create Room
  socket.on('create-room', ({ playerId, nickname }, callback) => {
    try {
      const room = roomManager.createRoom(playerId, nickname, socket.id);
      socket.join(room.code);
      socketRegistry[socket.id] = { roomCode: room.code, playerId };
      
      console.log(`Room created: ${room.code} by ${nickname}`);
      
      // Callback with sanitized state for the host
      const sanitized = roomManager.getSanitizedRoomState(room, playerId);
      callback({ success: true, room: sanitized });
      
      // Broadcast sanitized states to all clients in the room
      roomManager.broadcastRoomState(room.code);
    } catch (err: any) {
      console.error(err);
      callback({ success: false, error: err.message });
    }
  });

  // 2. Join Room
  socket.on('join-room', ({ roomCode, playerId, nickname }, callback) => {
    try {
      const room = roomManager.joinRoom(roomCode, playerId, nickname, socket.id);
      if (!room) {
        return callback({ success: false, error: 'Room not found or game already in progress' });
      }

      socket.join(roomCode);
      socketRegistry[socket.id] = { roomCode, playerId };

      console.log(`${nickname} joined room: ${roomCode}`);
      
      // Callback with sanitized state for joining player
      const sanitized = roomManager.getSanitizedRoomState(room, playerId);
      callback({ success: true, room: sanitized });
      
      // Update room for all clients securely
      roomManager.broadcastRoomState(roomCode);
    } catch (err: any) {
      console.error(err);
      callback({ success: false, error: err.message });
    }
  });

  // 3. Toggle Ready
  socket.on('toggle-ready', ({ roomCode, playerId }) => {
    const room = roomManager.toggleReady(roomCode, playerId);
    if (room) {
      roomManager.broadcastRoomState(roomCode);
    }
  });

  // 4. Update Settings
  socket.on('update-settings', ({ roomCode, playerId, settings }) => {
    const room = roomManager.updateSettings(roomCode, playerId, settings);
    if (room) {
      roomManager.broadcastRoomState(roomCode);
    }
  });

  // 5. Start Game
  socket.on('start-game', ({ roomCode, playerId }) => {
    console.log(`Host requested start for room: ${roomCode}`);
    const room = roomManager.startGame(roomCode, playerId);
    if (room) {
      roomManager.broadcastRoomState(roomCode);
    }
  });

  // 6. Submit Night Action
  socket.on('night-action', ({ roomCode, playerId, action }, callback) => {
    const result = roomManager.submitNightAction(roomCode, playerId, action);
    if (result) {
      const { detectiveResult } = result;
      // Broadcast state to everyone in room securely
      roomManager.broadcastRoomState(roomCode);
      
      // If detective action, return investigation result privately
      if (action.type === 'detective' && detectiveResult) {
        callback({ success: true, detectiveResult });
      } else {
        callback({ success: true });
      }
    } else {
      callback({ success: false, error: 'Action failed or invalid phase' });
    }
  });

  // 7. Submit Day Vote
  socket.on('day-vote', ({ roomCode, playerId, targetUid }) => {
    const room = roomManager.submitDayVote(roomCode, playerId, targetUid);
    if (room) {
      roomManager.broadcastRoomState(roomCode);
    }
  });

  // 8. Chat Messages
  socket.on('send-message', ({ roomCode, playerId, nickname, text, isMafiaOnly }) => {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    const sender = room.players[playerId];
    if (!sender) return;

    const messagePayload = {
      id: Math.random().toString(36).substring(2, 9),
      senderName: nickname,
      playerId,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMafiaOnly: !!isMafiaOnly,
    };

    if (isMafiaOnly && sender.role === 'mafia') {
      // Send message only to mafia members in the room
      const mafiaSockets = Object.values(room.players)
        .filter(p => p.role === 'mafia' && !p.disconnected)
        .map(p => p.id);

      mafiaSockets.forEach(socketId => {
        io.to(socketId).emit('chat-message', messagePayload);
      });
      console.log(`[Mafia Chat][${roomCode}] ${nickname}: ${text}`);
    } else {
      // Normal chat
      io.to(roomCode).emit('chat-message', messagePayload);
      console.log(`[Chat][${roomCode}] ${nickname}: ${text}`);
    }
  });

  // Typing Indicators
  socket.on('typing', ({ roomCode, nickname, isTyping }) => {
    socket.to(roomCode).emit('player-typing', { nickname, isTyping });
  });

  // 9. Restart Game
  socket.on('restart-game', ({ roomCode, playerId }) => {
    const room = roomManager.restartGame(roomCode, playerId);
    if (room) {
      roomManager.broadcastRoomState(roomCode);
    }
  });

  // 10. Disconnect
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    const disconnectInfo = roomManager.disconnectPlayer(socket.id);
    if (disconnectInfo) {
      const { roomCode, isEmpty } = disconnectInfo;
      delete socketRegistry[socket.id];
      
      if (!isEmpty) {
        roomManager.broadcastRoomState(roomCode);
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
