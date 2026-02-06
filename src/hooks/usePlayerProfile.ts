import { useState, useCallback } from 'react';
import { fetchPlayerProfile, fetchSeasonResults } from '../api/players.js';
import type { PlayerProfile, Tour, SeasonResults } from '../api/types.js';

interface UsePlayerProfileResult {
  player: PlayerProfile | null;
  isLoading: boolean;
  error: string | null;
  loadPlayer: (playerId: string, playerName?: string, tour?: Tour) => void;
  clear: () => void;
  seasonResults: SeasonResults | null;
  seasonResultsLoading: boolean;
  loadSeasonResults: (playerId: string, tour: Tour, year: number) => void;
  clearSeasonResults: () => void;
}

export function usePlayerProfile(): UsePlayerProfileResult {
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seasonResults, setSeasonResults] = useState<SeasonResults | null>(null);
  const [seasonResultsLoading, setSeasonResultsLoading] = useState(false);

  const loadPlayer = useCallback(async (playerId: string, playerName?: string, tour: Tour = 'pga') => {
    // Clear prior player immediately so breadcrumbs/nav context don't reflect stale data.
    setPlayer({ id: playerId, name: playerName || `Player ${playerId}` } as PlayerProfile);
    setIsLoading(true);
    setError(null);
    setSeasonResults(null);

    try {
      const data = await fetchPlayerProfile(playerId, playerName, tour);
      setPlayer(data);
      if (!data) {
        setPlayer(null);
        setError('Player not found');
      }
    } catch (err) {
      setPlayer(null);
      setError(err instanceof Error ? err.message : 'Failed to load player');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadSeasonResults = useCallback(async (playerId: string, tour: Tour, year: number) => {
    setSeasonResultsLoading(true);
    try {
      const data = await fetchSeasonResults(playerId, tour, year);
      setSeasonResults(data);
    } catch {
      setSeasonResults(null);
    } finally {
      setSeasonResultsLoading(false);
    }
  }, []);

  const clearSeasonResults = useCallback(() => {
    setSeasonResults(null);
  }, []);

  const clear = useCallback(() => {
    setPlayer(null);
    setError(null);
    setSeasonResults(null);
  }, []);

  return {
    player,
    isLoading,
    error,
    loadPlayer,
    clear,
    seasonResults,
    seasonResultsLoading,
    loadSeasonResults,
    clearSeasonResults,
  };
}
