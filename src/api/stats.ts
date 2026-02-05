import type { Tour } from './types.js';

export interface StatLeader {
  rank: number;
  playerId: string;
  playerName: string;
  value: number;
  displayValue: string;
}

export interface StatCategory {
  name: string;
  displayName: string;
  abbreviation: string;
  leaders: StatLeader[];
}

interface ESPNStatisticsResponse {
  stats?: {
    categories?: {
      name: string;
      displayName: string;
      shortDisplayName?: string;
      abbreviation?: string;
      leaders?: {
        displayValue: string;
        value: number;
        athlete: {
          id: string;
          displayName: string;
        };
      }[];
    }[];
  };
}

// Map from RankingMetric names to ESPN stat category names
const METRIC_TO_CATEGORY: Record<string, string> = {
  // Common mappings
  'officialAmount': 'officialAmount',
  'cupPoints': 'cupPoints',
  'cutsMade': 'cutsMade',
  'yardsPerDrive': 'yardsPerDrive',
  'strokesPerHole': 'strokesPerHole',
  'driveAccuracyPct': 'driveAccuracyPct',
  'greensInRegPutts': 'greensInRegPutts',
  'greensInRegPct': 'greensInRegPct',
  'birdiesPerRound': 'birdiesPerRound',
  'scoringAverage': 'scoringAverage',
  'wins': 'wins',
  'topTenFinishes': 'topTenFinishes',
  // Alternate names that might come from player profiles
  'yds/drv': 'yardsPerDrive',
  'drv acc': 'driveAccuracyPct',
  'greenshit': 'greensInRegPct',
  'pp gir': 'greensInRegPutts',
  'bird/rnd': 'birdiesPerRound',
  'saves': 'sandSaves',
  'amount': 'officialAmount',
  'earnings': 'officialAmount',
};

let cachedStats: { tour: Tour; data: StatCategory[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchAllStatCategories(tour: Tour): Promise<StatCategory[]> {
  // Check cache
  if (cachedStats && cachedStats.tour === tour && Date.now() - cachedStats.timestamp < CACHE_TTL) {
    return cachedStats.data;
  }

  try {
    const response = await fetch(
      `https://site.web.api.espn.com/apis/site/v2/sports/golf/${tour}/statistics`
    );

    if (!response.ok) {
      return [];
    }

    const data: ESPNStatisticsResponse = await response.json();
    const categories = data.stats?.categories || [];

    const result: StatCategory[] = categories.map((cat, catIndex) => ({
      name: cat.name,
      displayName: cat.displayName,
      abbreviation: cat.abbreviation || cat.shortDisplayName || '',
      leaders: (cat.leaders || []).map((leader, idx) => ({
        rank: idx + 1,
        playerId: leader.athlete.id,
        playerName: leader.athlete.displayName,
        value: leader.value,
        displayValue: leader.displayValue,
      })),
    }));

    // Cache the result
    cachedStats = { tour, data: result, timestamp: Date.now() };

    return result;
  } catch (error) {
    console.error('Error fetching stat categories:', error);
    return [];
  }
}

export async function fetchStatLeaders(
  tour: Tour,
  metricName: string
): Promise<{ category: StatCategory | null; leaders: StatLeader[] }> {
  const categories = await fetchAllStatCategories(tour);

  // Try direct match first
  let category = categories.find(c => c.name === metricName);

  // Try mapped name
  if (!category) {
    const mappedName = METRIC_TO_CATEGORY[metricName.toLowerCase()];
    if (mappedName) {
      category = categories.find(c => c.name === mappedName);
    }
  }

  // Try fuzzy match on display name
  if (!category) {
    const lowerMetric = metricName.toLowerCase();
    category = categories.find(
      c =>
        c.displayName.toLowerCase().includes(lowerMetric) ||
        lowerMetric.includes(c.displayName.toLowerCase()) ||
        c.abbreviation.toLowerCase() === lowerMetric
    );
  }

  if (!category) {
    return { category: null, leaders: [] };
  }

  return { category, leaders: category.leaders };
}

export function findPlayerInLeaders(leaders: StatLeader[], playerId: string): number {
  const idx = leaders.findIndex(l => l.playerId === playerId);
  return idx >= 0 ? idx : -1;
}
