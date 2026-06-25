import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { ShieldAlert, Heart, Search, Moon, Sun, AlertTriangle, RefreshCw, Check, Star, CheckSquare, Eye } from 'lucide-react';
import type { RoomState, Message } from '../types/game';
import { Chat } from './Chat';
import { sound } from '../config/sound';

interface GameRoomProps {
  room: RoomState;
  currentUserPlayerId: string;
  onSendMessage: (text: string, isMafiaOnly: boolean) => void;
  messages: Message[];
  onNightAction: (targetUid: string) => void;
  onDayVote: (targetUid: string | 'skip') => void;
  onRestartGame: () => void;
  detectiveResult: { targetName: string; isMafia: boolean } | null;
  setDetectiveResult: (res: { targetName: string; isMafia: boolean } | null) => void;
}

export const GameRoom: React.FC<GameRoomProps> = ({
  room,
  currentUserPlayerId,
  onSendMessage,
  messages,
  onNightAction,
  onDayVote,
  onRestartGame,
  detectiveResult,
  setDetectiveResult,
}) => {
  const localPlayer = room.players[currentUserPlayerId];
  const isAlive = localPlayer?.isAlive;
  const isHost = localPlayer?.isHost;
  const role = localPlayer?.role;

  const [voteTarget, setVoteTarget] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // 1. Audio and Confetti triggers on phase changes
  useEffect(() => {
    if (room.status === 'night') {
      sound.playNightChime();
    } else if (room.status === 'day-voting') {
      sound.playTick();
    } else if (room.status === 'game-over') {
      const myTeamWon = 
        (room.winner === 'mafia' && role === 'mafia') || 
        (room.winner === 'town' && role !== 'mafia');

      if (myTeamWon) {
        sound.playWinFanfare();
        // Trigger massive confetti explosion!
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      } else {
        sound.playLoseRumble();
      }
    }
  }, [room.status, room.winner, role]);

  // Clear detective result when night ends
  useEffect(() => {
    if (room.status !== 'night') {
      setDetectiveResult(null);
    }
  }, [room.status, setDetectiveResult]);

  const hasVotedThisNight = () => {
    if (role === 'mafia') {
      return !!room.nightActions.mafiaVotes[currentUserPlayerId];
    }
    if (role === 'doctor') {
      return room.nightActions.doctorHeal !== null;
    }
    if (role === 'detective') {
      return room.nightActions.detectiveInvestigate !== null;
    }
    return false;
  };

  const hasVotedThisDay = () => {
    return localPlayer?.votedFor !== null;
  };

  const handleActionClick = (targetUid: string) => {
    sound.playTick();
    if (room.status === 'night') {
      // Direct night actions
      onNightAction(targetUid);
    } else if (room.status === 'day-voting') {
      // Day vote requires confirmation
      setVoteTarget(targetUid);
      setShowConfirmModal(true);
    }
  };

  const confirmVote = () => {
    if (voteTarget) {
      onDayVote(voteTarget);
    }
    setShowConfirmModal(false);
    setVoteTarget(null);
  };

  const playerList = Object.values(room.players);
  const alivePlayers = playerList.filter(p => p.isAlive);

  return (
    <div className={`min-h-[90vh] px-4 py-6 max-w-7xl mx-auto transition-colors duration-700 ${
      room.status === 'night' ? 'night-phase-bg' : ''
    }`}>
      
      {/* Dynamic Sunrise/Sunset ambient overlays */}
      <AnimatePresence>
        {room.status === 'day-discussion' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none bg-gradient-to-b from-amber-500/30 via-transparent to-transparent z-0"
          />
        )}
      </AnimatePresence>

      {/* Game Header Panel */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4 relative z-10"
      >
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl transition-all duration-500 ${
            room.status === 'night' 
              ? 'bg-mafia-accent/20 text-mafia-danger shadow-glow' 
              : 'bg-amber-950/40 text-mafia-warning border border-mafia-warning/10'
          }`}>
            {room.status === 'night' ? <Moon size={22} className="animate-pulse" /> : <Sun size={22} />}
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide flex items-center gap-2">
              <span className="font-display">Cycle {room.phaseCount}</span>
              <span className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full ${
                room.status === 'night' 
                  ? 'bg-mafia-accent/20 text-mafia-danger border border-mafia-accent/30' 
                  : room.status === 'day-discussion' 
                  ? 'bg-mafia-warning/10 text-mafia-warning border border-mafia-warning/20'
                  : room.status === 'day-voting'
                  ? 'bg-mafia-accentSecondary/20 text-red-300 border border-mafia-accentSecondary/30'
                  : 'bg-mafia-success/10 text-mafia-success border border-mafia-success/20'
              }`}>
                {room.status === 'night' 
                  ? 'Night actions active' 
                  : room.status === 'day-discussion' 
                  ? 'Discussion'
                  : room.status === 'day-voting'
                  ? 'Lynch Tally'
                  : 'Game Over'}
              </span>
            </h1>
            <p className="text-xs text-mafia-textSecondary font-medium">
              {room.status === 'night' 
                ? 'Night has fallen. Silent killers make their choices...' 
                : room.status === 'day-discussion'
                ? 'Debate clues. Form accusations. Discuss in chat.'
                : room.status === 'day-voting'
                ? 'Vote on the prime suspect. Most votes gets lynched.'
                : 'Winner has emerged.'}
            </p>
          </div>
        </div>

        {/* Timer Progress */}
        {room.status !== 'game-over' && (
          <div className="flex items-center gap-4 bg-mafia-bg/85 px-5 py-2.5 rounded-xl border border-mafia-border w-full md:w-auto justify-between shadow-inner">
            <span className="text-[10px] text-mafia-textSecondary uppercase tracking-widest font-black">Timer</span>
            <span className={`text-2xl font-black font-display tracking-wider ${
              room.timer <= 10 ? 'text-mafia-danger animate-pulse' : 'text-indigo-400'
            }`}>
              {room.timer}s
            </span>
          </div>
        )}
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* Living Citizens Registry (Left Panel) - cols 4 */}
        <div className="lg:col-span-4 space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-panel p-6 flex flex-col h-full space-y-4"
          >
            <h2 className="text-xs font-bold uppercase tracking-widest text-mafia-danger">
              Citizen Registry
            </h2>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px] lg:max-h-[none]">
              {playerList.map((player) => {
                const isMe = player.playerId === currentUserPlayerId;
                const isTargetable = 
                  isAlive && 
                  player.isAlive && 
                  !isMe &&
                  ((room.status === 'night' && !hasVotedThisNight() && (role === 'mafia' || role === 'doctor' || role === 'detective')) || 
                   (room.status === 'day-voting' && !hasVotedThisDay()));

                // Roles visibility rules
                let roleLabel = '';
                let roleColor = 'text-mafia-textSecondary';
                let icon = null;

                if (!player.isAlive) {
                  roleLabel = player.role || 'villager';
                  roleColor = player.role === 'mafia' ? 'text-mafia-danger' : 'text-indigo-400';
                } else if (isMe) {
                  roleLabel = role || '';
                  roleColor = role === 'mafia' ? 'text-mafia-danger' : 'text-indigo-400';
                  icon = role === 'mafia' ? <ShieldAlert size={10} /> : role === 'doctor' ? <Heart size={10} /> : role === 'detective' ? <Search size={10} /> : null;
                } else if (role === 'mafia' && player.role === 'mafia') {
                  roleLabel = 'mafia';
                  roleColor = 'text-mafia-danger';
                  icon = <ShieldAlert size={10} />;
                }

                // Tally votes received in day-voting
                const votesReceived = playerList.filter(p => p.votedFor === player.playerId).length;
                const votePercentage = alivePlayers.length > 0 ? (votesReceived / alivePlayers.length) * 100 : 0;

                return (
                  <div
                    key={player.playerId}
                    className={`flex flex-col p-3.5 rounded-xl border transition ${
                      !player.isAlive 
                        ? 'bg-mafia-bg/15 border-mafia-border/30 opacity-40' 
                        : isMe
                        ? 'bg-mafia-accent/5 border-mafia-accent/30 shadow-glow'
                        : 'bg-mafia-bgSecondary/45 border-mafia-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border ${
                          !player.isAlive 
                            ? 'bg-black/60 border-mafia-border text-gray-600' 
                            : player.role === 'mafia' && role === 'mafia'
                            ? 'bg-mafia-accent/20 border-mafia-danger text-mafia-danger'
                            : 'bg-mafia-card border-mafia-border text-gray-300'
                        }`}>
                          {player.isAlive ? player.nickname[0].toUpperCase() : '💀'}
                        </div>

                        <div>
                          <span className="text-sm font-semibold text-gray-200 flex items-center gap-1.5">
                            {player.nickname}
                            {player.isHost && <Star size={11} className="fill-amber-400 text-amber-400" />}
                            {isMe && <span className="text-[10px] text-mafia-textSecondary font-normal">(You)</span>}
                          </span>
                          
                          {roleLabel && (
                            <span className={`text-[9px] font-black uppercase tracking-wider flex items-center gap-1 mt-0.5 ${roleColor}`}>
                              {icon}
                              <span>{roleLabel}</span>
                            </span>
                          )}
                          {!player.isAlive && (
                            <span className="text-[8px] text-mafia-danger uppercase tracking-widest font-black">
                              Deceased
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isTargetable && (
                          <button
                            onClick={() => handleActionClick(player.playerId)}
                            className={`text-[9px] font-bold uppercase px-2.5 py-1.5 rounded-lg border active:scale-95 transition-all ${
                              room.status === 'night' && role === 'mafia'
                                ? 'bg-mafia-accent/10 border-mafia-danger text-mafia-danger hover:bg-mafia-accent'
                                : room.status === 'night' && role === 'doctor'
                                ? 'bg-mafia-success/10 border-mafia-success text-mafia-success hover:bg-mafia-success hover:text-white'
                                : room.status === 'night' && role === 'detective'
                                ? 'bg-blue-950 border-blue-500/50 text-blue-400 hover:bg-blue-500 hover:text-white'
                                : 'bg-mafia-accentSecondary/20 border-mafia-border text-gray-300 hover:bg-mafia-accentSecondary hover:text-white'
                            }`}
                          >
                            Select
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Animated Vote progress bars during day voting */}
                    {room.status === 'day-voting' && player.isAlive && votesReceived > 0 && (
                      <div className="mt-2.5 space-y-1">
                        <div className="flex justify-between text-[9px] font-bold uppercase text-mafia-textSecondary">
                          <span>Accusal Tally</span>
                          <span>{votesReceived} {votesReceived === 1 ? 'vote' : 'votes'}</span>
                        </div>
                        <div className="w-full bg-mafia-bg rounded-full h-1.5 overflow-hidden border border-mafia-border/60">
                          <div
                            className="bg-mafia-accent h-full rounded-full transition-all duration-500"
                            style={{ width: `${votePercentage}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Skip Lynching button */}
            {room.status === 'day-voting' && isAlive && !hasVotedThisDay() && (
              <button
                onClick={() => handleActionClick('skip')}
                className="w-full py-2.5 bg-mafia-bgSecondary/60 hover:bg-mafia-card border border-mafia-border rounded-xl text-xs font-bold text-gray-300 transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <CheckSquare size={13} className="text-mafia-success" />
                <span>Abstain / Skip Vote</span>
              </button>
            )}
          </motion.div>
        </div>

        {/* Console / Role descriptions / Logs (Middle Panel) - cols 5 */}
        <div className="lg:col-span-5 space-y-6">
          {/* Identity HUD Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-6 space-y-4 relative overflow-hidden"
          >
            {/* Color accent back glow based on role */}
            <div className={`absolute top-0 right-0 w-28 h-28 rounded-full filter blur-[50px] opacity-20 ${
              role === 'mafia' 
                ? 'bg-mafia-danger' 
                : role === 'doctor' 
                ? 'bg-mafia-success' 
                : role === 'detective' 
                ? 'bg-blue-500' 
                : 'bg-amber-500'
            }`} />

            <h2 className="text-xs font-bold uppercase tracking-widest text-mafia-danger">
              Identity HUD
            </h2>

            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-2xl ${
                role === 'mafia' 
                  ? 'bg-mafia-accent/15 text-mafia-danger border border-mafia-danger/30' 
                  : role === 'doctor'
                  ? 'bg-mafia-success/15 text-mafia-success border border-mafia-success/30'
                  : role === 'detective'
                  ? 'bg-blue-950 text-blue-400 border border-blue-500/20'
                  : 'bg-amber-950/40 text-amber-500 border border-amber-500/20'
              }`}>
                {role === 'mafia' ? (
                  <ShieldAlert size={36} className="animate-pulse" />
                ) : role === 'doctor' ? (
                  <Heart size={36} />
                ) : role === 'detective' ? (
                  <Search size={36} />
                ) : (
                  <Eye size={36} />
                )}
              </div>

              <div>
                <h3 className="text-lg font-black uppercase tracking-wider text-white font-display">
                  {role || 'villager'}
                </h3>
                <p className="text-[11px] text-mafia-textSecondary leading-normal max-w-xs font-medium">
                  {role === 'mafia'
                    ? 'Infiltrate the town and vote to eliminate players at night. Work silently with fellow Mafia.'
                    : role === 'doctor'
                    ? 'Protect citizens from attacks. Save yourself or teammates, but choose wisely.'
                    : role === 'detective'
                    ? 'Investigate one suspect each night to reveal if they are Mafia.'
                    : 'Observe discussions, accuse suspects, and vote wisely to clean up the town.'}
                </p>
              </div>
            </div>

            {/* Alive/Dead Notification */}
            {isAlive ? (
              <div className="bg-mafia-success/5 border border-mafia-success/10 rounded-xl p-3 text-xs text-mafia-success flex items-center gap-2 font-bold">
                <Check size={14} />
                <span>Active & Alive</span>
              </div>
            ) : (
              <div className="bg-mafia-danger/5 border border-mafia-danger/10 rounded-xl p-3 text-xs text-mafia-danger flex items-center gap-2 font-bold">
                <AlertTriangle size={14} />
                <span>Deceased. Observing mode active.</span>
              </div>
            )}

            {/* Detective private result view */}
            {detectiveResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-blue-950/80 border border-blue-500/30 rounded-xl p-4 text-xs text-blue-200 space-y-1.5 shadow-glowBlue"
              >
                <div className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-blue-400">
                  <Search size={13} />
                  <span>Detective intel</span>
                </div>
                <p>
                  Suspect <span className="font-bold text-white">{detectiveResult.targetName}</span> is classified as:{' '}
                  <span className={`font-black uppercase ${detectiveResult.isMafia ? 'text-mafia-danger' : 'text-mafia-success'}`}>
                    {detectiveResult.isMafia ? 'MAFIA 🕵️‍♂️' : 'TOWN CITIZEN 🏡'}
                  </span>
                </p>
              </motion.div>
            )}
          </motion.div>

          {/* Game Narrative Logs Box */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel p-6 space-y-4 flex flex-col h-[280px]"
          >
            <h2 className="text-xs font-bold uppercase tracking-widest text-mafia-danger font-display">
              Narrative Logs
            </h2>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-[11px] text-mafia-textSecondary font-medium">
              {room.logs.map((log, index) => {
                const isSectionHeader = log.startsWith('---');
                const isTragedy = log.includes('Tragedy');
                const isGameOver = log.includes('Game Over');

                return (
                  <div
                    key={index}
                    className={`py-0.5 ${
                      isSectionHeader
                        ? 'text-indigo-400 font-bold border-b border-mafia-border/60 pb-1 mt-3'
                        : isTragedy
                        ? 'text-mafia-danger font-semibold'
                        : isGameOver
                        ? 'text-mafia-success font-black text-center text-sm py-2'
                        : 'text-mafia-textSecondary/80'
                    }`}
                  >
                    {log}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Chat Component (Right Panel) - cols 3 */}
        <div className="lg:col-span-3">
          <Chat
            messages={messages}
            onSendMessage={onSendMessage}
            currentUserPlayerId={currentUserPlayerId}
            playerRole={role}
            gameStatus={room.status}
          />
        </div>

      </div>

      {/* CONFIRMATION DIALOG: Day Vote Confirmation */}
      <AnimatePresence>
        {showConfirmModal && voteTarget && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm glass-panel p-6 text-center space-y-6 border border-mafia-border"
            >
              <div className="space-y-2">
                <AlertTriangle size={32} className="text-mafia-warning mx-auto animate-bounce" />
                <h3 className="text-lg font-black uppercase text-white font-display">Confirm Accusation</h3>
                <p className="text-xs text-mafia-textSecondary leading-normal">
                  Are you sure you want to cast your vote for{' '}
                  <span className="text-white font-black">
                    {voteTarget === 'skip' ? 'Skipping lynch vote' : room.players[voteTarget]?.nickname}
                  </span>
                  ? This action cannot be revoked.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="py-2.5 bg-mafia-bgSecondary border border-mafia-border rounded-xl text-xs font-bold text-gray-300 transition hover:bg-mafia-card active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmVote}
                  className="py-2.5 bg-mafia-accent border border-mafia-border rounded-xl text-xs font-bold text-white transition hover:bg-mafia-accentHover shadow-lg hover:shadow-glow active:scale-95"
                >
                  Confirm Vote
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GAME OVER DIALOG OVERLAY */}
      {room.status === 'game-over' && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.93 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md glass-panel p-8 text-center space-y-6 border border-mafia-border shadow-glow"
          >
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                Case Concluded
              </span>
              <h2 className={`text-4xl font-black uppercase tracking-wider font-display ${
                room.winner === 'mafia' ? 'text-mafia-danger' : 'text-mafia-success'
              }`}>
                {room.winner === 'mafia' ? 'Mafia Victory' : 'Town Victory'}
              </h2>
              <p className="text-xs text-mafia-textSecondary leading-relaxed">
                {room.winner === 'mafia'
                  ? 'Innocents eliminated. The Syndicate rules the shadows.'
                  : 'Citizens successfully discovered and lynched the Syndicate members.'}
              </p>
            </div>

            {/* Roles Summary breakdown */}
            <div className="bg-mafia-bgSecondary/60 rounded-2xl p-4 border border-mafia-border text-left text-xs divide-y divide-mafia-border/60 space-y-2.5">
              <div className="font-bold text-[9px] uppercase tracking-wider text-mafia-textSecondary pb-1.5">
                Civic Registry breakdown:
              </div>
              {playerList.map((player) => (
                <div key={player.playerId} className="flex justify-between items-center py-2 font-medium">
                  <span className="text-gray-200">
                    {player.nickname} {!player.isAlive && '💀'}
                  </span>
                  <span className={`font-black uppercase tracking-widest text-[9px] ${
                    player.role === 'mafia' ? 'text-mafia-danger' : 'text-indigo-400'
                  }`}>
                    {player.role}
                  </span>
                </div>
              ))}
            </div>

            {isHost ? (
              <button
                onClick={onRestartGame}
                className="w-full glass-button-primary flex items-center justify-center gap-2 text-sm uppercase tracking-wider font-bold"
              >
                <RefreshCw size={16} />
                <span>Return to Lobby</span>
              </button>
            ) : (
              <p className="text-xs text-mafia-textSecondary animate-pulse font-bold">
                Awaiting host to restart session...
              </p>
            )}
          </motion.div>
        </div>
      )}

    </div>
  );
};
