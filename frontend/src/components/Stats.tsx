import React from 'react';
import { X, Award, BarChart3, TrendingUp, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export interface MatchRecord {
  id: string;
  date: string;
  role: 'mafia' | 'doctor' | 'detective' | 'villager';
  outcome: 'win' | 'loss';
  winner: 'town' | 'mafia';
  playersCount: number;
}

interface StatsProps {
  onClose: () => void;
}

// Sample fallback records so dashboard is instantly beautiful
const MOCK_RECORDS: MatchRecord[] = [
  { id: '1', date: '25-06-2026', role: 'mafia', outcome: 'win', winner: 'mafia', playersCount: 5 },
  { id: '2', date: '24-06-2026', role: 'detective', outcome: 'win', winner: 'town', playersCount: 6 },
  { id: '3', date: '24-06-2026', role: 'villager', outcome: 'loss', winner: 'mafia', playersCount: 4 },
  { id: '4', date: '23-06-2026', role: 'doctor', outcome: 'win', winner: 'town', playersCount: 8 },
  { id: '5', date: '22-06-2026', role: 'mafia', outcome: 'loss', winner: 'town', playersCount: 5 },
  { id: '6', date: '21-06-2026', role: 'villager', outcome: 'win', winner: 'town', playersCount: 6 },
  { id: '7', date: '20-06-2026', role: 'detective', outcome: 'loss', winner: 'mafia', playersCount: 7 },
];

export const Stats: React.FC<StatsProps> = ({ onClose }) => {
  // Load local match history
  const getMatchHistory = (): MatchRecord[] => {
    const raw = localStorage.getItem('mafia_match_history');
    if (!raw) {
      // Initialize with mock data for display
      localStorage.setItem('mafia_match_history', JSON.stringify(MOCK_RECORDS));
      return MOCK_RECORDS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return MOCK_RECORDS;
    }
  };

  const records = getMatchHistory();
  const totalGames = records.length;
  
  const wins = records.filter(r => r.outcome === 'win').length;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  
  const mafiaWins = records.filter(r => r.role === 'mafia' && r.outcome === 'win').length;
  const civilianWins = records.filter(r => r.role !== 'mafia' && r.outcome === 'win').length;

  const roleCounts = {
    mafia: records.filter(r => r.role === 'mafia').length,
    doctor: records.filter(r => r.role === 'doctor').length,
    detective: records.filter(r => r.role === 'detective').length,
    villager: records.filter(r => r.role === 'villager').length,
  };

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear your match history?')) {
      localStorage.setItem('mafia_match_history', JSON.stringify([]));
      window.location.reload();
    }
  };

  // SVG Chart: generate points for the last 7 games
  const winTrendPoints = records.slice(0, 7).reverse().map((r, i) => {
    const x = 40 + i * 50;
    const y = r.outcome === 'win' ? 40 : 110;
    return { x, y };
  });

  const chartPath = winTrendPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-3xl glass-panel p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto border border-mafia-border"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-mafia-border">
          <div className="flex items-center gap-2.5">
            <Award className="text-mafia-accent" size={24} />
            <h2 className="text-2xl font-black uppercase tracking-wider text-mafia-text font-display">
              Citizen Statistics
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-mafia-bgSecondary/60 hover:bg-mafia-accent hover:text-white rounded-lg border border-mafia-border transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-mafia-bgSecondary/45 border border-mafia-border rounded-2xl p-4 text-center">
            <span className="text-[10px] uppercase font-bold tracking-widest text-mafia-textSecondary">Games Played</span>
            <div className="text-3xl font-black text-white mt-1">{totalGames}</div>
          </div>
          <div className="bg-mafia-bgSecondary/45 border border-mafia-border rounded-2xl p-4 text-center">
            <span className="text-[10px] uppercase font-bold tracking-widest text-mafia-textSecondary">Win Rate</span>
            <div className="text-3xl font-black text-mafia-success mt-1">{winRate}%</div>
          </div>
          <div className="bg-mafia-bgSecondary/45 border border-mafia-border rounded-2xl p-4 text-center">
            <span className="text-[10px] uppercase font-bold tracking-widest text-mafia-textSecondary">Mafia Victories</span>
            <div className="text-3xl font-black text-mafia-danger mt-1">{mafiaWins}</div>
          </div>
          <div className="bg-mafia-bgSecondary/45 border border-mafia-border rounded-2xl p-4 text-center">
            <span className="text-[10px] uppercase font-bold tracking-widest text-mafia-textSecondary">Town Victories</span>
            <div className="text-3xl font-black text-indigo-400 mt-1">{civilianWins}</div>
          </div>
        </div>

        {/* Charts & Graphs Panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Trend Chart */}
          <div className="bg-mafia-bgSecondary/30 border border-mafia-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-mafia-textSecondary flex items-center gap-1.5">
                <TrendingUp size={14} className="text-mafia-success" /> Recent Performance
              </span>
              <span className="text-[9px] text-gray-500 font-mono">Last 7 Games</span>
            </div>
            
            <div className="flex justify-center bg-mafia-bg/40 rounded-xl p-2 border border-mafia-border/50">
              <svg width="340" height="150" className="overflow-visible">
                {/* Horizontal guide lines */}
                <line x1="30" y1="40" x2="340" y2="40" stroke="#2D3644" strokeDasharray="3,3" />
                <line x1="30" y1="110" x2="340" y2="110" stroke="#2D3644" strokeDasharray="3,3" strokeWidth="1" />
                <text x="5" y="44" fill="#A8B0BC" fontSize="9" fontWeight="bold">WIN</text>
                <text x="5" y="114" fill="#A8B0BC" fontSize="9" fontWeight="bold">LOSS</text>

                {winTrendPoints.length > 1 && (
                  <>
                    {/* Connection Line */}
                    <path
                      d={chartPath}
                      fill="none"
                      stroke="#7A1F1F"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    
                    {/* Joint dots */}
                    {winTrendPoints.map((p, idx) => (
                      <circle
                        key={idx}
                        cx={p.x}
                        cy={p.y}
                        r="5"
                        fill={records.slice(0, 7).reverse()[idx].outcome === 'win' ? '#3BA55D' : '#D63C3C'}
                        stroke="#222A36"
                        strokeWidth="1.5"
                      />
                    ))}
                  </>
                )}
              </svg>
            </div>
          </div>

          {/* Role Frequency Stats */}
          <div className="bg-mafia-bgSecondary/30 border border-mafia-border rounded-2xl p-5 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-mafia-textSecondary flex items-center gap-1.5">
              <BarChart3 size={14} className="text-indigo-400" /> Role Frequency Breakdown
            </span>

            <div className="space-y-2.5">
              {Object.entries(roleCounts).map(([roleName, count]) => {
                const percentage = totalGames > 0 ? Math.round((count / totalGames) * 100) : 0;
                return (
                  <div key={roleName} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold uppercase">
                      <span className="text-gray-300">{roleName}</span>
                      <span className="text-mafia-textSecondary font-mono">{count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-mafia-bg rounded-full h-2 overflow-hidden border border-mafia-border/50">
                      <div
                        className={`h-full rounded-full ${
                          roleName === 'mafia'
                            ? 'bg-mafia-accent'
                            : roleName === 'doctor'
                            ? 'bg-mafia-success'
                            : roleName === 'detective'
                            ? 'bg-blue-500'
                            : 'bg-yellow-600'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Match History Table */}
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-mafia-textSecondary">Match History</span>
          
          <div className="border border-mafia-border rounded-xl overflow-hidden bg-mafia-bg/20 max-h-[220px] overflow-y-auto">
            <table className="w-full text-left text-xs divide-y divide-mafia-border">
              <thead className="bg-mafia-bgSecondary/60 font-bold uppercase text-[10px] text-mafia-textSecondary tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Role Played</th>
                  <th className="px-4 py-2.5">Game Winner</th>
                  <th className="px-4 py-2.5">Lobby Size</th>
                  <th className="px-4 py-2.5 text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mafia-border/40 font-medium">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-gray-500 py-6">
                      No game history found. Play a game to record stats!
                    </td>
                  </tr>
                ) : (
                  records.map((r, i) => (
                    <tr key={r.id || i} className="hover:bg-white/5 transition">
                      <td className="px-4 py-3 text-gray-400">{r.date}</td>
                      <td className="px-4 py-3 font-semibold uppercase tracking-wide text-gray-300">{r.role}</td>
                      <td className="px-4 py-3 capitalize text-gray-300">{r.winner} wins</td>
                      <td className="px-4 py-3 text-gray-400 font-mono">{r.playersCount} players</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                          r.outcome === 'win'
                            ? 'bg-mafia-success/10 border border-mafia-success/20 text-mafia-success'
                            : 'bg-mafia-danger/10 border border-mafia-danger/20 text-mafia-danger'
                        }`}>
                          {r.outcome}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Clear Stats Footer */}
        {records.length > 0 && (
          <div className="flex justify-end border-t border-mafia-border pt-4">
            <button
              onClick={clearHistory}
              className="text-[10px] font-bold text-mafia-textSecondary hover:text-mafia-danger transition flex items-center gap-1 uppercase"
            >
              <RefreshCw size={10} /> Clear Statistics Data
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
