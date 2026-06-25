import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Wifi, WifiOff, Volume2, VolumeX, Award, Shield, Eye } from 'lucide-react';
import { socket } from './config/socket';
import { getOrCreatePlayerId } from './config/playerId';
import type { RoomState, Message } from './types/game';
import { Home } from './components/Home';
import { Lobby } from './components/Lobby';
import { GameRoom } from './components/GameRoom';
import { Stats } from './components/Stats';
import type { MatchRecord } from './components/Stats';
import { sound } from './config/sound';

function App() {
  const [playerId, setPlayerId] = useState<string>('');
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [detectiveResult, setDetectiveResult] = useState<{ targetName: string; isMafia: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  // AAA Features: Sound toggle, stats modal, high contrast mode
  const [isMuted, setIsMuted] = useState(sound.isMuted());
  const [showStats, setShowStats] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  // 1. Persistent Player ID Initialization
  useEffect(() => {
    const id = getOrCreatePlayerId();
    setPlayerId(id);
  }, []);

  // 2. Parse invite link query parameter on load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const joinCode = urlParams.get('join');
    if (joinCode && joinCode.length === 6) {
      // Clean query parameter from address bar for neat looks
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Cache invite code in session storage to auto-fill Home/Join UI
      sessionStorage.setItem('mafia_invite_code', joinCode);
      
      // Alert user
      alert(`Lobby invitation code ${joinCode} detected! Enter your pseudonym to join.`);
    }
  }, []);

  // 3. Socket Event Listeners
  useEffect(() => {
    if (!playerId) return;

    // Connect socket manually with auth parameters
    socket.auth = { playerId };
    socket.connect();

    const onConnect = () => {
      setConnected(true);
      setError(null);
      
      // Auto-rejoin if room code existed in session storage (reconnection resilience)
      const cachedCode = sessionStorage.getItem('mafia_room_code');
      const cachedNickname = localStorage.getItem('mafia_nickname');
      if (cachedCode && cachedNickname && !roomCode) {
        socket.emit('join-room', { roomCode: cachedCode, playerId, nickname: cachedNickname }, (res: any) => {
          if (res.success) {
            setRoomState(res.room);
            setRoomCode(res.room.code);
          } else {
            sessionStorage.removeItem('mafia_room_code');
          }
        });
      }
    };

    const onDisconnect = () => {
      setConnected(false);
    };

    const onRoomUpdated = (updatedRoom: RoomState) => {
      setRoomState(updatedRoom);
      setRoomCode(updatedRoom.code);
      sessionStorage.setItem('mafia_room_code', updatedRoom.code);
      setLoading(false);
      setError(null);

      // Record Stats on Game Over
      if (updatedRoom.status === 'game-over' && updatedRoom.winner) {
        const gameKey = `mafia_recorded_game_${updatedRoom.code}_${updatedRoom.phaseCount}`;
        const alreadyRecorded = sessionStorage.getItem(gameKey);
        
        if (!alreadyRecorded) {
          const localPlayer = updatedRoom.players[playerId];
          if (localPlayer && localPlayer.role) {
            const outcome = 
              (updatedRoom.winner === 'mafia' && localPlayer.role === 'mafia') ||
              (updatedRoom.winner === 'town' && localPlayer.role !== 'mafia')
                ? 'win'
                : 'loss';

            const record: MatchRecord = {
              id: Math.random().toString(36).substring(2, 9),
              date: new Date().toLocaleDateString('en-GB'),
              role: localPlayer.role,
              outcome,
              winner: updatedRoom.winner,
              playersCount: Object.keys(updatedRoom.players).length
            };

            const rawHistory = localStorage.getItem('mafia_match_history');
            let history: MatchRecord[] = [];
            if (rawHistory) {
              try { history = JSON.parse(rawHistory); } catch {}
            }
            history.unshift(record);
            localStorage.setItem('mafia_match_history', JSON.stringify(history));
            
            // Mark game concluded
            sessionStorage.setItem(gameKey, 'true');
          }
        }
      }
    };

    const onChatMessage = (newMessage: Message) => {
      setMessages((prev) => [...prev, newMessage]);
    };

    const onTimerTick = (time: number) => {
      setRoomState((prev) => {
        if (!prev) return null;
        return { ...prev, timer: time };
      });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room-updated', onRoomUpdated);
    socket.on('chat-message', onChatMessage);
    socket.on('timer-tick', onTimerTick);

    if (socket.connected) {
      setConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room-updated', onRoomUpdated);
      socket.off('chat-message', onChatMessage);
      socket.off('timer-tick', onTimerTick);
      socket.disconnect();
    };
  }, [playerId, roomCode]);

  // 4. Sound initialization when audio turns on
  useEffect(() => {
    if (!isMuted) {
      sound.startAmbient();
    } else {
      sound.stopAmbient();
    }
  }, [isMuted]);

  // 5. Actions
  const handleCreateRoom = () => {
    if (!playerId || !nickname.trim()) return;
    setLoading(true);
    setError(null);

    socket.emit('create-room', { playerId, nickname }, (res: any) => {
      if (!res.success) {
        setError(res.error || 'Failed to create room.');
        setLoading(false);
      } else {
        setRoomState(res.room);
        setRoomCode(res.room.code);
        sessionStorage.setItem('mafia_room_code', res.room.code);
        setMessages([]);
        setLoading(false);
      }
    });
  };

  const handleJoinRoom = (code: string) => {
    if (!playerId || !nickname.trim() || !code) return;
    setLoading(true);
    setError(null);

    socket.emit('join-room', { roomCode: code, playerId, nickname }, (res: any) => {
      if (!res.success) {
        setError(res.error || 'Failed to join room.');
        setLoading(false);
      } else {
        setRoomState(res.room);
        setRoomCode(res.room.code);
        sessionStorage.setItem('mafia_room_code', res.room.code);
        setMessages([]);
        setLoading(false);
      }
    });
  };

  const handleToggleReady = () => {
    if (!roomCode || !playerId) return;
    socket.emit('toggle-ready', { roomCode, playerId });
  };

  const handleUpdateSettings = (settings: any) => {
    if (!roomCode || !playerId) return;
    socket.emit('update-settings', { roomCode, playerId, settings });
  };

  const handleStartGame = () => {
    if (!roomCode || !playerId) return;
    socket.emit('start-game', { roomCode, playerId });
  };

  const handleSendMessage = (text: string, isMafiaOnly: boolean) => {
    if (!roomCode || !playerId) return;
    socket.emit('send-message', {
      roomCode,
      playerId,
      nickname,
      text,
      isMafiaOnly,
    });
  };

  const handleNightAction = (targetUid: string) => {
    if (!roomCode || !playerId || !roomState) return;
    
    const localPlayer = roomState.players[playerId];
    if (!localPlayer) return;

    const actionType = localPlayer.role;
    if (!actionType || actionType === 'villager') return;

    socket.emit(
      'night-action',
      { roomCode, playerId, action: { type: actionType, targetUid } },
      (res: any) => {
        if (res.success && res.detectiveResult) {
          setDetectiveResult(res.detectiveResult);
        }
      }
    );
  };

  const handleDayVote = (targetUid: string | 'skip') => {
    if (!roomCode || !playerId) return;
    socket.emit('day-vote', { roomCode, playerId, targetUid });
  };

  const handleRestartGame = () => {
    if (!roomCode || !playerId) return;
    socket.emit('restart-game', { roomCode, playerId });
  };

  const handleLeaveRoom = () => {
    socket.disconnect();
    setTimeout(() => {
      socket.connect();
    }, 500);

    setRoomCode(null);
    setRoomState(null);
    setMessages([]);
    setDetectiveResult(null);
    setError(null);
    sessionStorage.removeItem('mafia_room_code');
  };

  const handleToggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleContrast = () => {
    setHighContrast(!highContrast);
    if (!highContrast) {
      document.documentElement.classList.add('high-contrast-mode');
    } else {
      document.documentElement.classList.remove('high-contrast-mode');
    }
  };

  return (
    <div className={`min-h-screen flex flex-col justify-between select-none`}>
      {/* Dynamic Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-mafia-border bg-mafia-bg/80 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Shield size={16} className="text-mafia-danger animate-pulse" />
          <span className="text-xl font-black tracking-wider text-white font-display uppercase">MAFIA NOIR</span>
          <div className="flex items-center gap-1.5 ml-4 bg-white/5 border border-mafia-border/60 px-2.5 py-0.5 rounded-full">
            {connected ? (
              <>
                <Wifi size={10} className="text-mafia-success animate-pulse" />
                <span className="text-[9px] text-mafia-success font-black uppercase tracking-wider font-mono">Live</span>
              </>
            ) : (
              <>
                <WifiOff size={10} className="text-mafia-danger" />
                <span className="text-[9px] text-mafia-danger font-black uppercase tracking-wider font-mono">Disconnected</span>
              </>
            )}
          </div>
        </div>

        {/* Global Toolbar buttons */}
        <div className="flex items-center gap-2">
          {/* High Contrast accessibility Toggle */}
          <button
            onClick={handleToggleContrast}
            className={`p-2 bg-mafia-bgSecondary/60 hover:bg-mafia-card border border-mafia-border rounded-xl text-gray-300 transition-all ${
              highContrast ? 'ring-2 ring-white' : ''
            }`}
            title="Toggle High Contrast Mode (Accessibility)"
          >
            <Eye size={14} />
          </button>

          {/* Statistics Modal Toggle */}
          <button
            onClick={() => setShowStats(true)}
            className="p-2 bg-mafia-bgSecondary/60 hover:bg-mafia-card border border-mafia-border rounded-xl text-gray-300 transition-all"
            title="View Match Stats"
          >
            <Award size={14} />
          </button>

          {/* Dynamic Audio Synthesizer Switch */}
          <button
            onClick={handleToggleSound}
            className="p-2 bg-mafia-bgSecondary/60 hover:bg-mafia-card border border-mafia-border rounded-xl text-gray-300 transition-all"
            title={isMuted ? 'Unmute game chimes' : 'Mute game chimes'}
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} className="text-mafia-danger" />}
          </button>

          {roomState && (
            <button
              onClick={handleLeaveRoom}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-mafia-danger transition-all font-bold ml-2"
              title="Leave Room"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Leave</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Switch panel */}
      <main className="flex-1 w-full relative">
        <AnimatePresence mode="wait">
          {!roomCode ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <Home
                nickname={nickname}
                setNickname={setNickname}
                onCreateRoom={handleCreateRoom}
                onJoinRoom={handleJoinRoom}
                error={error}
                loading={loading}
              />
            </motion.div>
          ) : roomState && roomState.status === 'lobby' ? (
            <motion.div
              key="lobby"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <Lobby
                roomCode={roomCode}
                players={roomState.players}
                currentUserPlayerId={playerId}
                settings={roomState.settings}
                onUpdateSettings={handleUpdateSettings}
                onToggleReady={handleToggleReady}
                onStartGame={handleStartGame}
                messages={messages}
                onSendMessage={handleSendMessage}
              />
            </motion.div>
          ) : roomState ? (
            <motion.div
              key="gameroom"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4 }}
            >
              <GameRoom
                room={roomState}
                currentUserPlayerId={playerId}
                onSendMessage={handleSendMessage}
                messages={messages}
                onNightAction={handleNightAction}
                onDayVote={handleDayVote}
                onRestartGame={handleRestartGame}
                detectiveResult={detectiveResult}
                setDetectiveResult={setDetectiveResult}
              />
            </motion.div>
          ) : (
            <div className="flex items-center justify-center min-h-[50vh] text-mafia-textSecondary animate-pulse text-xs font-bold font-mono">
              Loading active room states...
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* MODAL: Statistics Overlay */}
      <AnimatePresence>
        {showStats && (
          <Stats onClose={() => setShowStats(false)} />
        )}
      </AnimatePresence>

      {/* Footer Info */}
      <footer className="py-4 text-center text-[10px] text-mafia-textSecondary/50 border-t border-mafia-border">
        &copy; {new Date().getFullYear()} Mafia Noir. Built for elite social deduction.
      </footer>
    </div>
  );
}

export default App;
