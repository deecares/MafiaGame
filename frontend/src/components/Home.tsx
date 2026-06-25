import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, Shield, BookOpen, HelpCircle, UserCheck } from 'lucide-react';

interface HomeProps {
  nickname: string;
  setNickname: (val: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  error: string | null;
  loading: boolean;
}

export const Home: React.FC<HomeProps> = ({
  nickname,
  setNickname,
  onCreateRoom,
  onJoinRoom,
  error,
  loading,
}) => {
  const [roomCode, setRoomCode] = useState('');
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showAIMaster, setShowAIMaster] = useState(false);
  
  // Custom Live Counter state (mocked with realistic variance)
  const [livePlayers, setLivePlayers] = useState(482);
  const [gamesToday, setGamesToday] = useState(1329);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Persist nickname
  useEffect(() => {
    const saved = localStorage.getItem('mafia_nickname');
    if (saved) {
      setNickname(saved);
    }
  }, [setNickname]);

  // Subtle random change in counters to make them feel alive
  useEffect(() => {
    const interval = setInterval(() => {
      setLivePlayers(prev => prev + Math.floor(Math.random() * 5 - 2));
      if (Math.random() > 0.7) {
        setGamesToday(prev => prev + 1);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Floating canvas particles (Noir Ashes effect)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      opacity: number;
    }> = [];

    // Initialize particles
    for (let i = 0; i < 45; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2.5 + 0.5,
        speedY: -Math.random() * 0.6 - 0.2, // Float upwards
        speedX: Math.random() * 0.4 - 0.2,
        opacity: Math.random() * 0.5 + 0.2,
      });
    }

    const handleResize = () => {
      if (canvas) {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      }
    };

    window.addEventListener('resize', handleResize);

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(122, 31, 31, ${p.opacity})`; // Crimson ash particles
        ctx.fill();

        // Move particle
        p.y += p.speedY;
        p.x += p.speedX;

        // Reset particle if it leaves the screen
        if (p.y < 0) {
          p.y = height;
          p.x = Math.random() * width;
        }
        if (p.x < 0 || p.x > width) {
          p.x = Math.random() * width;
        }
      });
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNickname(val);
    localStorage.setItem('mafia_nickname', val);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim() || !nickname.trim()) return;
    onJoinRoom(roomCode.trim());
  };

  return (
    <div className="relative min-h-[85vh] flex flex-col items-center justify-center px-4 overflow-hidden py-10 select-none">
      
      {/* Floating Canvas Particles */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none opacity-85" />

      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] rounded-full bg-mafia-accent/5 filter blur-[100px] z-0 pointer-events-none" />

      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Cinematic Left Column */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-6 space-y-6 text-left"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-mafia-accent/10 border border-mafia-accent/30 rounded-full text-xs font-bold text-mafia-danger uppercase tracking-widest">
            <Shield size={12} />
            <span>Season 1 Active</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white font-display leading-[0.9] uppercase bg-clip-text text-transparent bg-gradient-to-br from-white via-gray-150 to-mafia-textSecondary">
              MAFIA <br />
              <span className="text-mafia-danger tracking-wider">NOIR</span>
            </h1>
            <p className="text-mafia-textSecondary text-sm md:text-base max-w-md leading-relaxed font-medium">
              Infiltrate the town. Accuse the suspects. Lie to save your skin. A beautiful real-time multiplayer social deduction experience.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex gap-6 border-t border-mafia-border/60 pt-6">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-mafia-textSecondary">Active Players</span>
              <div className="text-2xl font-black text-white font-mono mt-0.5">{livePlayers}</div>
            </div>
            <div className="h-10 w-[1px] bg-mafia-border/60 align-middle self-center" />
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-mafia-textSecondary">Matches Today</span>
              <div className="text-2xl font-black text-white font-mono mt-0.5">{gamesToday}</div>
            </div>
          </div>

          {/* Modals trigger buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowHowToPlay(true)}
              className="px-4 py-2 border border-mafia-border bg-mafia-bgSecondary/40 hover:bg-mafia-card rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <BookOpen size={14} className="text-indigo-400" />
              <span>How To Play</span>
            </button>
            <button
              onClick={() => setShowAIMaster(true)}
              className="px-4 py-2 border border-mafia-border bg-mafia-bgSecondary/40 hover:bg-mafia-accent/20 hover:border-mafia-accent rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <HelpCircle size={14} className="text-mafia-danger" />
              <span>AI Game Master</span>
            </button>
          </div>
        </motion.div>

        {/* Action Panel Right Column */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="lg:col-span-6 w-full max-w-md mx-auto glass-panel p-6 md:p-8 space-y-6"
        >
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-mafia-textSecondary mb-2 flex items-center gap-1">
              <UserCheck size={12} className="text-mafia-danger" /> Citizen Pseudonym
            </label>
            <input
              id="nickname-input"
              type="text"
              placeholder="e.g. AlCapone, DetectiveX..."
              maxLength={14}
              value={nickname}
              onChange={handleNicknameChange}
              className="w-full glass-input"
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-mafia-danger/10 border border-mafia-danger/25 text-mafia-danger text-xs p-3.5 rounded-xl text-center font-bold"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-4 pt-2">
            {/* Create Room Button */}
            <button
              id="create-room-btn"
              onClick={onCreateRoom}
              disabled={loading || !nickname.trim()}
              className="w-full glass-button-primary flex items-center justify-center gap-2 text-sm uppercase tracking-wider font-bold"
            >
              <Plus size={16} />
              <span>Host New Lobby</span>
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-mafia-border/60"></div>
              <span className="flex-shrink mx-4 text-[9px] text-gray-500 uppercase tracking-widest font-black">Or Join Lobby</span>
              <div className="flex-grow border-t border-mafia-border/60"></div>
            </div>

            {/* Join Room Form */}
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <input
                  id="room-code-input"
                  type="text"
                  placeholder="ENTER 6-DIGIT CODE"
                  maxLength={6}
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full glass-input text-center tracking-[0.25em] text-lg font-black"
                />
              </div>

              <button
                id="join-room-btn"
                type="submit"
                disabled={loading || !nickname.trim() || roomCode.length !== 6}
                className="w-full glass-button-secondary flex items-center justify-center gap-2 text-sm uppercase tracking-wider font-bold"
              >
                <Users size={16} />
                <span>Join Lobby</span>
              </button>
            </form>
          </div>
        </motion.div>

      </div>

      {/* MODAL: How to Play */}
      <AnimatePresence>
        {showHowToPlay && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl glass-panel p-6 md:p-8 space-y-6 max-h-[85vh] overflow-y-auto border border-mafia-border"
            >
              <div className="flex justify-between items-center pb-3 border-b border-mafia-border">
                <h3 className="text-xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <BookOpen size={20} className="text-indigo-400" />
                  <span>How To Play Mafia</span>
                </h3>
                <button
                  onClick={() => setShowHowToPlay(false)}
                  className="px-2 py-1 bg-mafia-bgSecondary/60 hover:bg-mafia-accent hover:text-white rounded-lg border border-mafia-border text-xs font-bold transition"
                >
                  Close
                </button>
              </div>

              <div className="space-y-4 text-left text-xs text-mafia-textSecondary leading-relaxed">
                <div>
                  <h4 className="font-bold text-white uppercase text-sm mb-1">Concept</h4>
                  <p>
                    A secret Mafia has infiltrated a quiet Town. The citizens must discover and lynch the Mafia members before they outnumber the townsfolk, while the Mafia works secretly to eliminate citizens night by night.
                  </p>
                </div>

                <div className="border-t border-mafia-border/50 pt-3">
                  <h4 className="font-bold text-white uppercase text-sm mb-1.5">Specialist Roles</h4>
                  <ul className="space-y-2.5">
                    <li className="flex gap-2">
                      <span className="font-black text-mafia-danger uppercase tracking-wider min-w-[70px]">Mafia:</span>
                      <span>Coordinates in secret whispers at night to vote and eliminate one citizen.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-black text-mafia-success uppercase tracking-wider min-w-[70px]">Doctor:</span>
                      <span>Heals one player each night to save them from a potential Mafia attack.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-black text-blue-400 uppercase tracking-wider min-w-[70px]">Detective:</span>
                      <span>Investigates one citizen each night, revealing if they belong to the Mafia.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-black text-yellow-500 uppercase tracking-wider min-w-[70px]">Villager:</span>
                      <span>Participates in daytime discussion, gathers clues, and votes during lynching.</span>
                    </li>
                  </ul>
                </div>

                <div className="border-t border-mafia-border/50 pt-3">
                  <h4 className="font-bold text-white uppercase text-sm mb-1">Phases</h4>
                  <ul className="space-y-1.5 list-disc pl-4">
                    <li><strong>Night</strong>: Roles cast their secret actions. Chat is muted for non-mafia.</li>
                    <li><strong>Day Discussion</strong>: The town learns of any tragedies, debates, and analyzes.</li>
                    <li><strong>Day Voting</strong>: Living players vote to execute a suspect or skip voting.</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: AI Game Master */}
      <AnimatePresence>
        {showAIMaster && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl glass-panel p-6 md:p-8 space-y-6 border border-mafia-border"
            >
              <div className="flex justify-between items-center pb-3 border-b border-mafia-border">
                <h3 className="text-xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <HelpCircle size={20} className="text-mafia-danger" />
                  <span>The AI Game Master</span>
                </h3>
                <button
                  onClick={() => setShowAIMaster(false)}
                  className="px-2 py-1 bg-mafia-bgSecondary/60 hover:bg-mafia-accent hover:text-white rounded-lg border border-mafia-border text-xs font-bold transition"
                >
                  Close
                </button>
              </div>

              <div className="space-y-4 text-left text-xs text-mafia-textSecondary leading-relaxed">
                <p>
                  Mafia Noir utilizes an automated **AI Game Master** engine on the server. The AI coordinates all gameplay cycles logically:
                </p>
                <ul className="space-y-2 list-disc pl-4">
                  <li><strong>Role Distribution</strong>: Dynamically parses player count and shuffles and assigns roles securely.</li>
                  <li><strong>Sunset & Sunrise</strong>: Enforces strict timers and automatically skips forward if active roles lock in their targets early.</li>
                  <li><strong>Conflict Resolution</strong>: Calculates if the Doctor successfully protected a target, resolves ties, and checks victory boundaries.</li>
                  <li><strong>No Cheating</strong>: Completely sanitizes data packets, ensuring players cannot peek at state variables.</li>
                </ul>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
