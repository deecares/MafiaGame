export interface Player {
  id: string;
  firebaseUid: string;
  nickname: string;
  isReady: boolean;
  isHost: boolean;
  role: 'mafia' | 'doctor' | 'detective' | 'villager' | null;
  isAlive: boolean;
  votedFor: string | null;
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
    mafiaVotes: { [mafiaUid: string]: string };
    doctorHeal: string | null;
    detectiveInvestigate: string | null;
  };
  logs: string[];
  timer: number;
  phaseCount: number;
}

export interface Message {
  id: string;
  senderName: string;
  senderUid: string;
  text: string;
  timestamp: string;
  isMafiaOnly?: boolean;
}
