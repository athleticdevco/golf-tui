import { useState, useEffect } from 'react';
import { fetchLeaderboard } from '../api/leaderboard.js';
import type { Tour } from '../api/types.js';

const ALL_TOURS: Tour[] = ['pga', 'lpga', 'eur', 'champions-tour'];

interface UseActiveToursResult {
  activeTours: Tour[];
  isLoading: boolean;
}

export function useActiveTours(): UseActiveToursResult {
  const [activeTours, setActiveTours] = useState<Tour[]>(ALL_TOURS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkTours() {
      const results = await Promise.all(
        ALL_TOURS.map(tour => fetchLeaderboard(tour).catch(() => null))
      );

      // Tour is active only if it has a leaderboard with actual entries
      const active = ALL_TOURS.filter((_, i) => {
        const lb = results[i];
        return lb !== null && lb.entries.length > 0;
      });
      // Ensure at least PGA is available as fallback
      setActiveTours(active.length > 0 ? active : ['pga']);
      setIsLoading(false);
    }

    checkTours();
  }, []);

  return { activeTours, isLoading };
}
