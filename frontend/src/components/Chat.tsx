import React, { useState, useRef, useEffect } from 'react';
import { Send, EyeOff, Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Message } from '../types/game';
import { socket } from '../config/socket';

interface ChatProps {
  messages: Message[];
  onSendMessage: (text: string, isMafiaOnly: boolean) => void;
  currentUserUid: string;
  playerRole: 'mafia' | 'doctor' | 'detective' | 'villager' | null;
  gameStatus: 'lobby' | 'night' | 'day-discussion' | 'day-voting' | 'game-over';
}

const EMOJIS = ['🤫', '🕵️‍♂️', '💀', '🩸', '🔫', '🏥', '🗳️', '😀', '😂', '🔥', '👍', '👀'];

export const Chat: React.FC<ChatProps> = ({
  messages,
  onSendMessage,
  currentUserUid,
  playerRole,
  gameStatus,
}) => {
  const [inputText, setInputText] = useState('');
  const [mafiaOnly, setMafiaOnly] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typingPlayers, setTypingPlayers] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for socket typing events
  useEffect(() => {
    const handleTyping = ({ nickname, isTyping }: { nickname: string; isTyping: boolean }) => {
      setTypingPlayers(prev => {
        if (isTyping) {
          if (!prev.includes(nickname)) return [...prev, nickname];
        } else {
          return prev.filter(n => n !== nickname);
        }
        return prev;
      });
    };

    socket.on('player-typing', handleTyping);

    return () => {
      socket.off('player-typing', handleTyping);
    };
  }, []);

  // Handle typing debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    
    // Find roomCode in state (cached in socket details or session storage)
    const storedCode = sessionStorage.getItem('mafia_room_code');
    const localNickname = localStorage.getItem('mafia_nickname') || 'Someone';
    
    if (storedCode) {
      // Emit typing true
      socket.emit('typing', { roomCode: storedCode, nickname: localNickname, isTyping: true });

      // Debounce typing false
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { roomCode: storedCode, nickname: localNickname, isTyping: false });
      }, 1500);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const forceNormal = gameStatus === 'lobby' || gameStatus === 'day-discussion' || gameStatus === 'day-voting' || gameStatus === 'game-over';
    const isMafiaChat = !forceNormal && mafiaOnly && playerRole === 'mafia';

    onSendMessage(inputText.trim(), isMafiaChat);
    setInputText('');
    setShowEmojiPicker(false);

    // Cancel typing
    const storedCode = sessionStorage.getItem('mafia_room_code');
    const localNickname = localStorage.getItem('mafia_nickname') || 'Someone';
    if (storedCode && typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      socket.emit('typing', { roomCode: storedCode, nickname: localNickname, isTyping: false });
    }
  };

  const handleInsertEmoji = (emoji: string) => {
    setInputText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const showMafiaOption = playerRole === 'mafia' && gameStatus === 'night';

  const visibleMessages = messages.filter((msg) => {
    if (msg.isMafiaOnly) {
      return playerRole === 'mafia';
    }
    return true;
  });

  return (
    <div className="flex flex-col h-[480px] lg:h-[80vh] glass-panel overflow-hidden border border-mafia-border">
      {/* Chat header */}
      <div className="bg-mafia-bgSecondary/95 px-4 py-3 border-b border-mafia-border flex items-center justify-between">
        <h3 className="text-xs font-bold tracking-wider uppercase text-mafia-textSecondary">
          Discussion Board
        </h3>
        {showMafiaOption && (
          <button
            onClick={() => setMafiaOnly(!mafiaOnly)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
              mafiaOnly
                ? 'bg-mafia-accent/20 border-mafia-accent text-red-400'
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
            }`}
          >
            <EyeOff size={12} />
            <span>{mafiaOnly ? 'Mafia Channel' : 'All channel'}</span>
          </button>
        )}
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {visibleMessages.length === 0 ? (
          <div className="text-center text-mafia-textSecondary/40 text-xs py-8 font-medium">
            Radio silence. Discuss clues here.
          </div>
        ) : (
          visibleMessages.map((msg) => {
            const isMe = msg.senderUid === currentUserUid;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-baseline gap-1.5 mb-0.5 px-1">
                  <span className="text-[10px] font-black text-mafia-textSecondary">
                    {msg.senderName}
                  </span>
                  <span className="text-[8px] text-gray-500 font-mono">{msg.timestamp}</span>
                </div>
                
                <div
                  className={`px-3.5 py-2 rounded-2xl max-w-[85%] text-xs break-all leading-normal ${
                    msg.isMafiaOnly
                      ? 'bg-red-950/60 border border-mafia-accent/30 text-red-200'
                      : isMe
                      ? 'bg-mafia-accent text-white rounded-tr-none shadow-glow'
                      : 'bg-mafia-bgSecondary/60 text-gray-200 rounded-tl-none border border-mafia-border'
                  }`}
                >
                  {msg.isMafiaOnly && (
                    <span className="text-[9px] block font-black text-red-400 mb-0.5 uppercase tracking-wider">
                      [Mafia whisper]
                    </span>
                  )}
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicators */}
      {typingPlayers.length > 0 && (
        <div className="px-4 py-1.5 bg-mafia-bg/40 text-[9px] text-mafia-textSecondary font-bold animate-pulse">
          {typingPlayers.join(', ')} {typingPlayers.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      {/* Input controls */}
      <form onSubmit={handleSend} className="p-3 bg-mafia-bgSecondary/90 border-t border-mafia-border relative">
        {/* Emoji picker drawer */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-16 left-3 right-3 bg-mafia-card border border-mafia-border p-3 rounded-xl grid grid-cols-6 gap-2 z-30"
            >
              {EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleInsertEmoji(emoji)}
                  className="text-lg hover:scale-125 transition active:scale-95"
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-2">
          {/* Emoji button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 bg-mafia-bg border border-mafia-border text-mafia-textSecondary hover:text-white rounded-xl transition"
          >
            <Smile size={16} />
          </button>

          <input
            id="chat-input"
            type="text"
            placeholder={
              mafiaOnly && showMafiaOption
                ? 'Type mafia whisper...'
                : 'Send game text...'
            }
            value={inputText}
            onChange={handleInputChange}
            disabled={gameStatus === 'night' && playerRole !== 'mafia'}
            className="flex-1 glass-input py-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            id="chat-send-btn"
            type="submit"
            disabled={!inputText.trim() || (gameStatus === 'night' && playerRole !== 'mafia')}
            className="glass-button-primary py-2 px-3.5 flex items-center justify-center disabled:opacity-50"
          >
            <Send size={13} />
          </button>
        </div>
        {gameStatus === 'night' && playerRole !== 'mafia' && (
          <span className="text-[9px] text-gray-500 mt-1 block text-center font-bold">
            💤 Night phase. Only Mafia can discuss during sleep.
          </span>
        )}
      </form>
    </div>
  );
};
