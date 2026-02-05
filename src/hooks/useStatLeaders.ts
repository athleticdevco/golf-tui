import { useState, useCallback } from 'react';
import type { Tour } from '../api/types.js';
import { fetchStatLeaders, type StatLeader, type StatCategory } from '../api/stats.js';

interface UseStatLeadersResult {
  category: StatCategory | null;
  leaders: StatLeader[];
  isLoading: boolean;
  error: string | null;
  load: (metricName: string, tour: Tour) => void;
  clear: () => void;
}

export function useStatLeaders(): UseStatLeadersResult {
  const [category, setCategory] = useState<StatCategory | null>(null);
  const [leaders, setLeaders] = useState<StatLeader[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (metricName: string, tour: Tour) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchStatLeaders(tour, metricName);
      setCategory(result.category);
      setLeaders(result.leaders);

      if (!result.category) {
        setError(`No leaderboard available for "${metricName}"`);
      }
    } catch (err) {
      setError('Failed to load stat leaders');
      setCategory(null);
      setLeaders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setCategory(null);
    setLeaders([]);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    category,
    leaders,
    isLoading,
    error,
    load,
    clear,
  };
}
