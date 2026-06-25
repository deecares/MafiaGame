import { v4 as uuidv4 } from 'uuid';

const LOCAL_STORAGE_KEY = 'mafia_player_id';

export const getOrCreatePlayerId = (): string => {
  let playerId = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!playerId) {
    playerId = uuidv4();
    localStorage.setItem(LOCAL_STORAGE_KEY, playerId);
  }
  return playerId;
};
