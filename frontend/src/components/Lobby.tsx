import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, ShieldAlert, Heart, Search, Star, Play, CheckCircle2 } from 'lucide-react';
import type { Player, GameSettings, Message } from '../types/game';
import { Chat } from './Chat';

interface LobbyProps {
  roomCode: string;
  players: { [firebaseUid: string]: Player };
  currentUserUid: string;
  settings: GameSettings;
  onUpdateSettings: (settings: GameSettings) => void;
  onToggleReady: () => void;
  onStartGame: () => void;
  messages: Message[];
  onSendMessage: (text: string, isMafiaOnly: boolean) => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  roomCode,
  players,
  currentUserUid,
  settings,
  onUpdateSettings,
  onToggleReady,
  onStartGame,
  messages,
  onSendMessage,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  
  const localPlayer = players[currentUserUid];
  const isHost = localPlayer?.isHost;
  
  const playerList = Object.values(players);
  const totalPlayersCount = playerList.length;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyInviteLink = () => {
    const inviteLink = `${window.location.origin}?join=${roomCode}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSettingChange = (field: keyof GameSettings, delta: number) => {
    if (!isHost) return;
    const newSettings = { ...settings };
    newSettings[field] = Math.max(0, newSettings[field] + delta);
    
    if (field === 'mafiaCount') {
      newSettings.mafiaCount = Math.max(1, newSettings.mafiaCount);
    }
    
    const sumRoles = newSettings.mafiaCount + newSettings.doctorCount + newSettings.detectiveCount;
    if (sumRoles > totalPlayersCount) {
      return; // Exceeds player count limit
    }
    
    onUpdateSettings(newSettings);
  };

  const canStart = 
    totalPlayersCount >= 3 && 
    playerList.every(p => p.isHost || p.isReady);

  // Framer Motion Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-6xl mx-auto px-4 py-6 select-none">
      
      {/* Settings & Info (Left Panel) - cols 4 */}
      <div className="space-y-6 lg:col-span-4">
        {/* Room Code Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-6 space-y-4"
        >
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-mafia-danger">
              Lobby Session
            </h2>
            <p className="text-[10px] text-mafia-textSecondary">Share this code with your crew.</p>
          </div>

          <div className="flex items-center justify-between bg-mafia-bgSecondary/60 rounded-xl p-3 border border-mafia-border">
            <span className="text-3xl font-black tracking-widest text-white font-display">
              {roomCode}
            </span>
            <button
              onClick={handleCopyCode}
              className="p-2.5 bg-mafia-card hover:bg-mafia-bgSecondary border border-mafia-border rounded-lg text-gray-300 transition"
              title="Copy Room Code"
            >
              {copiedCode ? <Check size={16} className="text-mafia-success" /> : <Copy size={16} />}
            </button>
          </div>

          {/* Invite Link Button */}
          <button
            onClick={handleCopyInviteLink}
            className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-bold text-gray-200 transition flex items-center justify-center gap-1.5 active:scale-95"
          >
            {copiedLink ? (
              <>
                <Check size={14} className="text-mafia-success" />
                <span className="text-mafia-success font-bold">Invite Link Copied!</span>
              </>
            ) : (
              <>
                <Star size={14} className="text-amber-400 fill-amber-400" />
                <span>Copy Invite URL</span>
              </>
            )}
          </button>
        </motion.div>

        {/* Game Rules Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel p-6 space-y-5"
        >
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-mafia-danger">
              Roles Alignment
            </h2>
            <p className="text-[10px] text-mafia-textSecondary">
              {isHost ? 'Adjust custom counts of specialized roles.' : 'View current host configuration.'}
            </p>
          </div>

          <div className="space-y-4">
            {/* Mafia */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert size={16} className="text-mafia-danger" />
                <span className="text-sm font-semibold text-gray-200">Mafia Count</span>
              </div>
              <div className="flex items-center gap-3">
                {isHost && (
                  <button
                    onClick={() => handleSettingChange('mafiaCount', -1)}
                    className="w-7 h-7 bg-mafia-bgSecondary/60 hover:bg-mafia-accent border border-mafia-border rounded-full flex items-center justify-center font-bold text-gray-300 active:scale-90 transition"
                  >
                    -
                  </button>
                )}
                <span className="text-sm font-black w-4 text-center font-mono">{settings.mafiaCount}</span>
                {isHost && (
                  <button
                    onClick={() => handleSettingChange('mafiaCount', 1)}
                    className="w-7 h-7 bg-mafia-bgSecondary/60 hover:bg-mafia-accent border border-mafia-border rounded-full flex items-center justify-center font-bold text-gray-300 active:scale-90 transition"
                  >
                    +
                  </button>
                )}
              </div>
            </div>

            {/* Doctor */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart size={16} className="text-mafia-success" />
                <span className="text-sm font-semibold text-gray-200">Doctor Count</span>
              </div>
              <div className="flex items-center gap-3">
                {isHost && (
                  <button
                    onClick={() => handleSettingChange('doctorCount', -1)}
                    className="w-7 h-7 bg-mafia-bgSecondary/60 hover:bg-mafia-accent border border-mafia-border rounded-full flex items-center justify-center font-bold text-gray-300 active:scale-90 transition"
                  >
                    -
                  </button>
                )}
                <span className="text-sm font-black w-4 text-center font-mono">{settings.doctorCount}</span>
                {isHost && (
                  <button
                    onClick={() => handleSettingChange('doctorCount', 1)}
                    className="w-7 h-7 bg-mafia-bgSecondary/60 hover:bg-mafia-accent border border-mafia-border rounded-full flex items-center justify-center font-bold text-gray-300 active:scale-90 transition"
                  >
                    +
                  </button>
                )}
              </div>
            </div>

            {/* Detective */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search size={16} className="text-blue-400" />
                <span className="text-sm font-semibold text-gray-200">Detective Count</span>
              </div>
              <div className="flex items-center gap-3">
                {isHost && (
                  <button
                    onClick={() => handleSettingChange('detectiveCount', -1)}
                    className="w-7 h-7 bg-mafia-bgSecondary/60 hover:bg-mafia-accent border border-mafia-border rounded-full flex items-center justify-center font-bold text-gray-300 active:scale-90 transition"
                  >
                    -
                  </button>
                )}
                <span className="text-sm font-black w-4 text-center font-mono">{settings.detectiveCount}</span>
                {isHost && (
                  <button
                    onClick={() => handleSettingChange('detectiveCount', 1)}
                    className="w-7 h-7 bg-mafia-bgSecondary/60 hover:bg-mafia-accent border border-mafia-border rounded-full flex items-center justify-center font-bold text-gray-300 active:scale-90 transition"
                  >
                    +
                  </button>
                )}
              </div>
            </div>

            {/* Unassigned villagers */}
            <div className="pt-3 border-t border-mafia-border/60 text-[10px] text-mafia-textSecondary flex justify-between font-bold">
              <span>Villagers (Innocents):</span>
              <span className="font-black text-white font-mono">
                {Math.max(0, totalPlayersCount - (settings.mafiaCount + settings.doctorCount + settings.detectiveCount))}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Players List (Middle Panel) - cols 5 */}
      <div className="space-y-6 lg:col-span-5">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-panel p-6 flex flex-col h-full space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-mafia-danger">
              Citizen Registry
            </h2>
            <span className="text-xs bg-mafia-bgSecondary/80 border border-mafia-border px-2.5 py-0.5 rounded-full font-bold">
              {totalPlayersCount} Online
            </span>
          </div>

          {/* Animated Player List container */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-2.5 flex-1 overflow-y-auto max-h-[300px] lg:max-h-[none]"
          >
            {playerList.map((player) => {
              const isMe = player.firebaseUid === currentUserUid;
              return (
                <motion.div
                  key={player.firebaseUid}
                  variants={itemVariants}
                  className={`flex items-center justify-between p-3 rounded-xl border transition ${
                    isMe
                      ? 'bg-mafia-accent/10 border-mafia-accent/40 shadow-glow'
                      : 'bg-mafia-bgSecondary/45 border-mafia-border'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Circle avatar */}
                    <div className="w-8 h-8 rounded-full bg-mafia-card border border-mafia-border flex items-center justify-center font-bold text-gray-300">
                      {player.nickname[0].toUpperCase()}
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-gray-150 flex items-center gap-1.5">
                        {player.nickname}
                        {player.isHost && (
                          <span title="Lobby Host"><Star size={12} className="fill-amber-400 text-amber-400 animate-pulse" /></span>
                        )}
                        {isMe && <span className="text-[10px] text-mafia-textSecondary font-normal">(You)</span>}
                      </span>
                    </div>
                  </div>

                  <div>
                    {player.isHost ? (
                      <span className="text-[10px] font-black text-amber-400 uppercase bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                        Host
                      </span>
                    ) : player.isReady ? (
                      <span className="text-[10px] font-black text-mafia-success uppercase bg-mafia-success/10 border border-mafia-success/20 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                        <CheckCircle2 size={10} /> Ready
                      </span>
                    ) : (
                      <span className="text-[10px] font-black text-mafia-textSecondary uppercase bg-white/5 border border-white/5 px-2.5 py-0.5 rounded-md">
                        Waiting
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-mafia-border/60 space-y-3">
            {!isHost && (
              <button
                id="toggle-ready-btn"
                onClick={onToggleReady}
                className={`w-full py-3 px-4 rounded-xl font-bold transition flex items-center justify-center gap-2 border active:scale-95 ${
                  localPlayer?.isReady
                    ? 'bg-mafia-success hover:bg-green-600 border-green-500 text-white shadow-glowGreen'
                    : 'bg-white/5 hover:bg-white/10 border-white/5 text-gray-300'
                }`}
              >
                {localPlayer?.isReady ? 'Confirm: Ready!' : 'Ready up'}
              </button>
            )}

            {isHost && (
              <button
                id="start-game-btn"
                onClick={onStartGame}
                disabled={!canStart}
                className="w-full glass-button-primary flex items-center justify-center gap-2 relative overflow-hidden group"
              >
                {/* Visual glow on hover */}
                <div className="absolute inset-0 bg-white/5 translate-y-full group-hover:translate-y-0 transition duration-300" />
                <Play size={16} />
                <span>Start Game Session</span>
              </button>
            )}

            {isHost && !canStart && (
              <p className="text-[10px] text-mafia-textSecondary text-center animate-pulse font-bold">
                {totalPlayersCount < 3
                  ? 'Require at least 3 players to load roles...'
                  : 'Awaiting ready confirmation from all citizens...'}
              </p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Chat Room (Right Panel) - cols 3 */}
      <div className="lg:col-span-3">
        <Chat
          messages={messages}
          onSendMessage={onSendMessage}
          currentUserUid={currentUserUid}
          playerRole={localPlayer?.role}
          gameStatus="lobby"
        />
      </div>

    </div>
  );
};
