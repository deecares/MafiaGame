import { Server } from 'socket.io';

export interface Player {
  id: string; // Socket ID (current active connection)
  firebaseUid: string; // Unique persistent ID
  nickname: string;
  isReady: boolean;
  isHost: boolean;
  role: 'mafia' | 'doctor' | 'detective' | 'villager' | null;
  isAlive: boolean;
  votedFor: string | null; // ID of player voted for, or 'skip'
  disconnected: boolean;
}

export interface GameSettings {
  mafiaCount: number;
  doctorCount: number;
  detectiveCount: number;
}

export interface RoomState {
  code: string;
  players: { [firebaseUid: string]: Player };
  status: 'lobby' | 'night' | 'day-discussion' | 'day-voting' | 'game-over';
  winner: 'town' | 'mafia' | null;
  settings: GameSettings;
  nightActions: {
    mafiaVotes: { [mafiaUid: string]: string }; // mafiaUid -> victimUid
    doctorHeal: string | null; // victimUid
    detectiveInvestigate: string | null; // targetUid
  };
  logs: string[];
  timer: number;
  phaseCount: number;
}

export class RoomManager {
  private rooms: { [code: string]: RoomState } = {};
  private timerIntervals: { [code: string]: NodeJS.Timeout } = {};

  constructor(private io: Server) {}

  public getRoom(code: string): RoomState | undefined {
    return this.rooms[code];
  }

  // Secure: Sanitize room state based on player requesting it
  public getSanitizedRoomState(room: RoomState, clientUid: string): RoomState {
    const clientPlayer = room.players[clientUid];
    const isClientMafia = clientPlayer?.role === 'mafia';
    
    const sanitizedPlayers: { [firebaseUid: string]: Player } = {};
    
    Object.entries(room.players).forEach(([uid, p]) => {
      const isSelf = uid === clientUid;
      const isTeamMafia = isClientMafia && p.role === 'mafia';
      const isDead = !p.isAlive;
      const isLobby = room.status === 'lobby';
      const isGameOver = room.status === 'game-over';

      sanitizedPlayers[uid] = {
        ...p,
        // Only show role details if it is self, mafia teammate, dead, or if game is lobby/over
        role: (isSelf || isTeamMafia || isDead || isLobby || isGameOver) ? p.role : null,
      };
    });

    return {
      ...room,
      players: sanitizedPlayers,
      // Hide active night choices
      nightActions: {
        mafiaVotes: {},
        doctorHeal: null,
        detectiveInvestigate: null
      }
    };
  }

  // Secure: Broadcast personalized sanitized states to each socket in the room
  public broadcastRoomState(code: string) {
    const room = this.rooms[code];
    if (!room) return;

    const clients = this.io.sockets.adapter.rooms.get(code);
    if (clients) {
      for (const socketId of clients) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          // Find player matching socket connection
          const player = Object.values(room.players).find(p => p.id === socketId);
          const clientUid = player ? player.firebaseUid : '';
          const sanitized = this.getSanitizedRoomState(room, clientUid);
          socket.emit('room-updated', sanitized);
        }
      }
    }
  }

  public createRoom(hostUid: string, hostNickname: string, socketId: string): RoomState {
    let code = '';
    do {
      code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code
    } while (this.rooms[code]);

    const newRoom: RoomState = {
      code,
      players: {
        [hostUid]: {
          id: socketId,
          firebaseUid: hostUid,
          nickname: hostNickname,
          isReady: true, // Host is always ready
          isHost: true,
          role: null,
          isAlive: true,
          votedFor: null,
          disconnected: false,
        },
      },
      status: 'lobby',
      winner: null,
      settings: {
        mafiaCount: 1,
        doctorCount: 1,
        detectiveCount: 1,
      },
      nightActions: {
        mafiaVotes: {},
        doctorHeal: null,
        detectiveInvestigate: null,
      },
      logs: ['Room created.'],
      timer: 0,
      phaseCount: 0,
    };

    this.rooms[code] = newRoom;
    return newRoom;
  }

  public joinRoom(code: string, firebaseUid: string, nickname: string, socketId: string): RoomState | null {
    const room = this.rooms[code];
    if (!room) return null;

    // Check if player is reconnecting
    if (room.players[firebaseUid]) {
      const player = room.players[firebaseUid];
      player.id = socketId;
      player.disconnected = false;
      room.logs.push(`${player.nickname} reconnected.`);
      return room;
    }

    // Only allow new joins if in lobby
    if (room.status !== 'lobby') {
      return null;
    }

    // Assign standard player fields
    room.players[firebaseUid] = {
      id: socketId,
      firebaseUid,
      nickname,
      isReady: false,
      isHost: false,
      role: null,
      isAlive: true,
      votedFor: null,
      disconnected: false,
    };

    room.logs.push(`${nickname} joined the lobby.`);

    // Auto-update settings based on player count
    this.adjustDefaultSettings(room);

    return room;
  }

  public disconnectPlayer(socketId: string): { roomCode: string; playerUid: string; isEmpty: boolean } | null {
    for (const code of Object.keys(this.rooms)) {
      const room = this.rooms[code];
      const playerEntry = Object.entries(room.players).find(([_, p]) => p.id === socketId);
      
      if (playerEntry) {
        const [uid, player] = playerEntry;
        player.disconnected = true;

        // If in lobby, we can just remove them outright
        if (room.status === 'lobby') {
          delete room.players[uid];
          room.logs.push(`${player.nickname} left the room.`);
          this.adjustDefaultSettings(room);

          // Reassign host if the host left
          if (player.isHost) {
            const keys = Object.keys(room.players);
            if (keys.length > 0) {
              room.players[keys[0]].isHost = true;
              room.players[keys[0]].isReady = true;
              room.logs.push(`${room.players[keys[0]].nickname} is now the host.`);
            }
          }
        } else {
          room.logs.push(`${player.nickname} disconnected.`);
        }

        // If no non-disconnected players are left, we delete the room
        const activeCount = Object.values(room.players).filter(p => !p.disconnected).length;
        if (activeCount === 0) {
          this.destroyRoom(code);
          return { roomCode: code, playerUid: uid, isEmpty: true };
        }

        return { roomCode: code, playerUid: uid, isEmpty: false };
      }
    }
    return null;
  }

  public toggleReady(code: string, firebaseUid: string): RoomState | null {
    const room = this.rooms[code];
    if (!room || room.status !== 'lobby') return null;

    const player = room.players[firebaseUid];
    if (player && !player.isHost) {
      player.isReady = !player.isReady;
    }
    return room;
  }

  public updateSettings(code: string, hostUid: string, settings: GameSettings): RoomState | null {
    const room = this.rooms[code];
    if (!room || room.status !== 'lobby') return null;

    const player = room.players[hostUid];
    if (player && player.isHost) {
      room.settings = settings;
    }
    return room;
  }

  public startGame(code: string, hostUid: string): RoomState | null {
    const room = this.rooms[code];
    if (!room || room.status !== 'lobby') return null;

    const host = room.players[hostUid];
    if (!host || !host.isHost) return null;

    // Check readiness (all non-host players must be ready)
    const players = Object.values(room.players);
    if (players.length < 3) {
      room.logs.push("Cannot start: At least 3 players required.");
      return room;
    }

    const notReady = players.filter(p => !p.isReady && !p.isHost);
    if (notReady.length > 0) {
      room.logs.push("Cannot start: Some players are not ready.");
      return room;
    }

    // Role assignment
    this.assignRoles(room);

    // Initial setup
    room.status = 'night';
    room.phaseCount = 1;
    room.logs = ['Game started! Role cards have been distributed.', '--- Night 1 ---'];
    room.nightActions = { mafiaVotes: {}, doctorHeal: null, detectiveInvestigate: null };
    
    // Clear votes
    players.forEach(p => {
      p.isAlive = true;
      p.votedFor = null;
    });

    this.startTimer(room, 35, () => this.endNightPhase(room));

    return room;
  }

  public submitNightAction(
    code: string, 
    actorUid: string, 
    action: { type: 'mafia' | 'doctor' | 'detective'; targetUid: string }
  ): { room: RoomState; detectiveResult?: { targetName: string; isMafia: boolean } } | null {
    const room = this.rooms[code];
    if (!room || room.status !== 'night') return null;

    const actor = room.players[actorUid];
    if (!actor || !actor.isAlive || actor.disconnected) return null;

    let detectiveResult;

    if (action.type === 'mafia' && actor.role === 'mafia') {
      room.nightActions.mafiaVotes[actorUid] = action.targetUid;
      room.logs.push(`A Mafia member locked in their target.`);
    } else if (action.type === 'doctor' && actor.role === 'doctor') {
      room.nightActions.doctorHeal = action.targetUid;
      room.logs.push(`The Doctor selected their patient.`);
    } else if (action.type === 'detective' && actor.role === 'detective') {
      room.nightActions.detectiveInvestigate = action.targetUid;
      const target = room.players[action.targetUid];
      if (target) {
        detectiveResult = {
          targetName: target.nickname,
          isMafia: target.role === 'mafia'
        };
      }
      room.logs.push(`The Detective investigated a suspect.`);
    }

    // Check if all active night actions are completed to transition early
    if (this.areNightActionsComplete(room)) {
      this.endNightPhase(room);
    }

    return { room, detectiveResult };
  }

  public submitDayVote(code: string, voterUid: string, targetUid: string | 'skip'): RoomState | null {
    const room = this.rooms[code];
    if (!room || room.status !== 'day-voting') return null;

    const voter = room.players[voterUid];
    if (!voter || !voter.isAlive || voter.disconnected) return null;

    voter.votedFor = targetUid;
    
    // Check if everyone has voted
    const activeAlivePlayers = Object.values(room.players).filter(p => p.isAlive && !p.disconnected);
    const votesSubmitted = activeAlivePlayers.filter(p => p.votedFor !== null);

    if (votesSubmitted.length === activeAlivePlayers.length) {
      this.endVotingPhase(room);
    }

    return room;
  }

  // Helper: End Night Phase
  private endNightPhase(room: RoomState) {
    this.stopTimer(room.code);
    room.status = 'day-discussion';
    room.logs.push('--- Morning arrives ---');

    // Calculate who died
    const votes = Object.values(room.nightActions.mafiaVotes);
    let targetToKill: string | null = null;

    if (votes.length > 0) {
      // Find the item with maximum votes
      const counts: { [uid: string]: number } = {};
      votes.forEach(uid => {
        counts[uid] = (counts[uid] || 0) + 1;
      });

      let maxVal = 0;
      Object.entries(counts).forEach(([uid, count]) => {
        if (count > maxVal) {
          maxVal = count;
          targetToKill = uid;
        }
      });
    }

    // Verify if Doctor saved the player
    const doctorHealed = room.nightActions.doctorHeal;
    if (targetToKill) {
      if (targetToKill === doctorHealed) {
        room.logs.push(`The Mafia attacked a player, but they were saved by the Doctor!`);
      } else {
        const victim = room.players[targetToKill];
        if (victim) {
          victim.isAlive = false;
          room.logs.push(`Tragedy struck! ${victim.nickname} was found dead this morning. They were a ${victim.role}.`);
        }
      }
    } else {
      room.logs.push(`Nothing happened tonight. Everyone is safe.`);
    }

    // Reset night actions
    room.nightActions = { mafiaVotes: {}, doctorHeal: null, detectiveInvestigate: null };

    // Check win condition
    if (this.checkWinConditions(room)) {
      this.broadcastRoomState(room.code);
      return;
    }

    // Transition to Day discussion (45s)
    this.startTimer(room, 45, () => this.startVotingPhase(room));
    this.broadcastRoomState(room.code);
  }

  // Helper: Start Day Voting Phase
  private startVotingPhase(room: RoomState) {
    this.stopTimer(room.code);
    room.status = 'day-voting';
    room.logs.push('--- Voting Phase ---', 'Discuss complete. Cast your votes on who is Mafia!');
    
    // Reset votes
    Object.values(room.players).forEach(p => {
      p.votedFor = null;
    });

    this.startTimer(room, 30, () => this.endVotingPhase(room));
    this.broadcastRoomState(room.code);
  }

  // Helper: End Day Voting Phase
  private endVotingPhase(room: RoomState) {
    this.stopTimer(room.code);

    const alivePlayers = Object.values(room.players).filter(p => p.isAlive);
    const votes: { [target: string]: number } = {};

    alivePlayers.forEach(p => {
      if (p.votedFor) {
        votes[p.votedFor] = (votes[p.votedFor] || 0) + 1;
      }
    });

    // Tally votes
    let executedUid: string | null = null;
    let maxVotes = 0;
    let tie = false;

    Object.entries(votes).forEach(([target, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        executedUid = target;
        tie = false;
      } else if (count === maxVotes) {
        tie = true;
      }
    });

    if (executedUid && executedUid !== 'skip' && !tie) {
      const executed = room.players[executedUid];
      executed.isAlive = false;
      room.logs.push(`The town voted to lynch ${executed.nickname}. They were a ${executed.role}.`);
    } else {
      room.logs.push(`The town decided to skip the lynch vote or votes resulted in a tie.`);
    }

    // Check win conditions
    if (this.checkWinConditions(room)) {
      this.broadcastRoomState(room.code);
      return;
    }

    // Transition back to Night
    room.status = 'night';
    room.phaseCount += 1;
    room.logs.push(`--- Night ${room.phaseCount} ---`, 'Go to sleep Town, the night action begins.');
    
    this.startTimer(room, 35, () => this.endNightPhase(room));
    this.broadcastRoomState(room.code);
  }

  public restartGame(code: string, hostUid: string): RoomState | null {
    const room = this.rooms[code];
    if (!room || room.status !== 'game-over') return null;

    const host = room.players[hostUid];
    if (!host || !host.isHost) return null;

    // Reset everything back to lobby
    room.status = 'lobby';
    room.winner = null;
    room.phaseCount = 0;
    room.logs = ['Game reset. Welcome back to the lobby!'];
    
    Object.values(room.players).forEach(p => {
      p.isAlive = true;
      p.isReady = p.isHost; // host is ready, others reset to not ready
      p.role = null;
      p.votedFor = null;
    });

    this.stopTimer(code);
    return room;
  }

  // Timer Management
  private startTimer(room: RoomState, durationSeconds: number, callback: () => void) {
    this.stopTimer(room.code);
    room.timer = durationSeconds;

    const interval = setInterval(() => {
      const currentRoom = this.rooms[room.code];
      if (!currentRoom) {
        this.stopTimer(room.code);
        return;
      }

      currentRoom.timer -= 1;
      if (currentRoom.timer <= 0) {
        this.stopTimer(room.code);
        callback();
      } else {
        // Emit tick updates to clients for smooth UI rendering
        this.io.to(room.code).emit('timer-tick', currentRoom.timer);
      }
    }, 1000);

    this.timerIntervals[room.code] = interval;
  }

  private stopTimer(code: string) {
    if (this.timerIntervals[code]) {
      clearInterval(this.timerIntervals[code]);
      delete this.timerIntervals[code];
    }
  }

  private destroyRoom(code: string) {
    this.stopTimer(code);
    delete this.rooms[code];
  }

  // Logic: Are Night Actions Complete?
  private areNightActionsComplete(room: RoomState): boolean {
    const alivePlayers = Object.values(room.players).filter(p => p.isAlive && !p.disconnected);
    
    // 1. Check Mafia
    const aliveMafia = alivePlayers.filter(p => p.role === 'mafia');
    const mafiaVotedCount = Object.keys(room.nightActions.mafiaVotes).length;
    if (mafiaVotedCount < aliveMafia.length) return false;

    // 2. Check Doctor
    const aliveDoctor = alivePlayers.filter(p => p.role === 'doctor');
    if (aliveDoctor.length > 0 && room.nightActions.doctorHeal === null) return false;

    // 3. Check Detective
    const aliveDetective = alivePlayers.filter(p => p.role === 'detective');
    if (aliveDetective.length > 0 && room.nightActions.detectiveInvestigate === null) return false;

    return true;
  }

  // Logic: Check Win Conditions
  private checkWinConditions(room: RoomState): boolean {
    const alivePlayers = Object.values(room.players).filter(p => p.isAlive);
    const mafiaCount = alivePlayers.filter(p => p.role === 'mafia').length;
    const innocentCount = alivePlayers.length - mafiaCount;

    if (mafiaCount === 0) {
      room.status = 'game-over';
      room.winner = 'town';
      room.logs.push('--- Game Over ---', 'All Mafia eliminated! The Town wins!');
      this.stopTimer(room.code);
      return true;
    }

    if (mafiaCount >= innocentCount) {
      room.status = 'game-over';
      room.winner = 'mafia';
      room.logs.push('--- Game Over ---', 'Mafia outnumbers the Town! The Mafia wins!');
      this.stopTimer(room.code);
      return true;
    }

    return false;
  }

  // Logic: Role Assignment
  private assignRoles(room: RoomState) {
    const playerUids = Object.keys(room.players);
    const count = playerUids.length;

    // Shuffle array
    const shuffledUids = [...playerUids].sort(() => Math.random() - 0.5);

    // Default settings limits
    let mafiaLimit = room.settings.mafiaCount;
    let doctorLimit = room.settings.doctorCount;
    let detectiveLimit = room.settings.detectiveCount;

    // Adjust in case settings exceed players count
    if (mafiaLimit + doctorLimit + detectiveLimit >= count) {
      mafiaLimit = 1;
      doctorLimit = count >= 3 ? 1 : 0;
      detectiveLimit = count >= 4 ? 1 : 0;
    }

    let assignedCount = 0;

    // Reset roles
    playerUids.forEach(uid => {
      room.players[uid].role = 'villager';
    });

    // Assign Mafia
    for (let i = 0; i < mafiaLimit; i++) {
      if (shuffledUids[assignedCount]) {
        room.players[shuffledUids[assignedCount]].role = 'mafia';
        assignedCount++;
      }
    }

    // Assign Doctor
    for (let i = 0; i < doctorLimit; i++) {
      if (shuffledUids[assignedCount]) {
        room.players[shuffledUids[assignedCount]].role = 'doctor';
        assignedCount++;
      }
    }

    // Assign Detective
    for (let i = 0; i < detectiveLimit; i++) {
      if (shuffledUids[assignedCount]) {
        room.players[shuffledUids[assignedCount]].role = 'detective';
        assignedCount++;
      }
    }
  }

  private adjustDefaultSettings(room: RoomState) {
    const count = Object.keys(room.players).length;
    if (count <= 3) {
      room.settings = { mafiaCount: 1, doctorCount: 0, detectiveCount: 1 };
    } else if (count <= 5) {
      room.settings = { mafiaCount: 1, doctorCount: 1, detectiveCount: 1 };
    } else if (count <= 8) {
      room.settings = { mafiaCount: 2, doctorCount: 1, detectiveCount: 1 };
    } else {
      room.settings = { mafiaCount: 3, doctorCount: 2, detectiveCount: 2 };
    }
  }
}
