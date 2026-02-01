import { useState, useCallback } from 'react';
import { fetchPlayerProfile } from '../api/players.js';
import type { PlayerProfile, Tour } from '../api/types.js';

interface UsePlayerProfileResult {
  player: PlayerProfile | null;
  isLoading: boolean;
  error: string | null;
  loadPlayer: (playerId: string, playerName?: string, tour?: Tour) => void;
  clear: () => void;
}

export function usePlayerProfile(): UsePlayerProfileResult {
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlayer = useCallback(async (playerId: string, playerName?: string, tour: Tour = 'pga') => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchPlayerProfile(playerId, playerName, tour);
      setPlayer(data);
      if (!data) {
        setError('Player not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load player');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setPlayer(null);
    setError(null);
  }, []);

  return {
    player,
    isLoading,
    error,
    loadPlayer,
    clear,
  };
}
