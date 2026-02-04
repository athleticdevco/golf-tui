import { cachedApiRequest } from './client.js';
import type { PlayerProfile, LeaderboardEntry, TournamentResult, PlayerStat, Tour } from './types.js';

interface ESPNScoreboardResponse {
  events?: any[];
  season?: {
    year: number;
    type: number;
  };
}

interface ESPNOverviewResponse {
  statistics?: {
    labels?: string[];
    names?: string[];
    splits?: { displayName: string; stats?: string[] }[];
  };
  seasonRankings?: {
    displayName?: string;
    categories?: {
      name: string;
      displayName: string;
      abbreviation: string;
      value?: number;
      displayValue?: string;
      rank?: number;
      rankDisplayValue?: string;
    }[];
  };
  recentTournaments?: {
    name: string;
    eventsStats?: ESPNEventStat[];
  }[];
}

interface ESPNEventStat {
  id: string;
  name: string;
  shortName?: string;
  date: string;
  competitions?: {
    competitors?: {
      score?: { displayValue?: string };
      status?: {
        position?: { displayName?: string };
        displayValue?: string;
      };
    }[];
  }[];
}

function getSeasonWindow(tour: Tour): { start: Date; end: Date; yearLabel: string } {
  const now = new Date();
  if (tour === 'pga') {
    // PGA Tour season generally spans across calendar years; use a Sep 1 boundary.
    const boundaryMonth = 8; // 0-based (Sep)
    const seasonYear = now.getMonth() >= boundaryMonth ? now.getFullYear() + 1 : now.getFullYear();
    const start = new Date(seasonYear - 1, boundaryMonth, 1);
    const end = new Date(seasonYear, boundaryMonth, 1);
    return { start, end, yearLabel: String(seasonYear) };
  }

  // Default: calendar-year season
  return {
    start: new Date(now.getFullYear(), 0, 1),
    end: new Date(now.getFullYear() + 1, 0, 1),
    yearLabel: String(now.getFullYear()),
  };
}

function toYmd(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

function mondayOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function weeksBetween(start: Date, end: Date): string[] {
  const dates: string[] = [];
  let cur = mondayOfWeek(start);
  const endTime = end.getTime();
  while (cur.getTime() < endTime) {
    dates.push(toYmd(cur));
    cur = new Date(cur);
    cur.setDate(cur.getDate() + 7);
  }
  return dates;
}

async function fetchRecentTournamentResults(playerId: string, tour: Tour): Promise<TournamentResult[]> {
  // Fetch results from season scoreboards (more current than overview endpoint)
  const results: TournamentResult[] = [];
  
  try {
    const window = getSeasonWindow(tour);
    const dates = weeksBetween(window.start, window.end);
    
    // Fetch scoreboards for each date in parallel
    const responses = await Promise.all(
      dates.map(date =>
        cachedApiRequest<ESPNScoreboardResponse>(`/${tour}/scoreboard`, {
          params: { dates: date },
          ttlMs: 30 * 60 * 1000,
        }).catch(() => null)
      )
    );
    
    for (const data of responses) {
      if (!data) continue;
      
      for (const event of data.events || []) {
        // Skip if we already have this tournament
        if (results.some(r => r.tournamentId === event.id)) continue;
        
        const comp = event.competitions?.[0];
        if (!comp) continue;
        
        for (const c of comp.competitors || []) {
          const cid = c?.id != null ? String(c.id) : '';
          const aid = c?.athlete?.id != null ? String(c.athlete.id) : '';
          if (cid === String(playerId) || aid === String(playerId)) {
            const score = typeof c.score === 'number' ? 
              (c.score === 0 ? 'E' : c.score > 0 ? `+${c.score}` : `${c.score}`) : 
              String(c.score || '-');
            
            results.push({
              tournamentId: event.id,
              tournamentName: event.shortName || event.name,
              date: event.date,
              position: c.status?.position?.displayName || c.status?.displayValue || (c.order ? String(c.order) : '-'),
              score,
            });
            break;
          }
        }
      }
    }
  } catch (error) {
    // Ignore errors, fall back to overview data
  }
  
  // Sort by date descending
  results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  return results;
}

export async function fetchPlayerProfile(playerId: string, playerName?: string, tour: Tour = 'pga'): Promise<PlayerProfile | null> {
  try {
    // Fetch both overview and recent scoreboard data in parallel
    const [overviewResponse, liveResults] = await Promise.all([
      fetch(`https://site.web.api.espn.com/apis/common/v3/sports/golf/${tour}/athletes/${playerId}/overview`),
      fetchRecentTournamentResults(playerId, tour),
    ]);
    
    if (!overviewResponse.ok) {
      return null;
    }

    const data: ESPNOverviewResponse = await overviewResponse.json();
    
    // Extract season stats (tour-specific)
    const tourStatsName = tour === 'pga' ? 'PGA TOUR' : tour === 'lpga' ? 'LPGA' : tour === 'eur' ? 'DP WORLD TOUR' : 'PGA TOUR CHAMPIONS';
    const tourStats = data.statistics?.splits?.find(s => s.displayName?.toUpperCase().includes(tourStatsName.toUpperCase()));
    const statLabels = data.statistics?.labels || [];
    const statValues = tourStats?.stats || [];
    
    const getStatValue = (label: string): string | undefined => {
      const idx = statLabels.indexOf(label);
      return idx >= 0 ? statValues[idx] : undefined;
    };

    // Extract rankings from categories
    const rankingCategories = data.seasonRankings?.categories || [];
    const findRankingCategory = (name: string) => 
      rankingCategories.find(c => c.name?.toLowerCase().includes(name) || c.abbreviation?.toLowerCase().includes(name));

    // Extract recent tournaments from overview (get the tour name for context)
    const recentTourData = data.recentTournaments?.[0];
    const recentTourName = recentTourData?.name;
    const recentTournaments = recentTourData?.eventsStats || [];
    const overviewResults: TournamentResult[] = recentTournaments.slice(0, 10).map(event => {
      const competitor = event.competitions?.[0]?.competitors?.[0];
      const position = competitor?.status?.position?.displayName || 
                      competitor?.status?.displayValue || '-';
      const score = competitor?.score?.displayValue || '-';
      
      return {
        tournamentId: event.id,
        tournamentName: event.shortName || event.name,
        date: event.date,
        position,
        score,
      };
    });

    // Prefer a rolling 12-month window (avoids dropping late-year starts)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 365);
    const recentOverviewResults = overviewResults.filter(r => new Date(r.date) >= cutoff);

    // Merge live results with recent overview results (live takes priority)
    const seenIds = new Set(liveResults.map(r => r.tournamentId));
    const mergedResults = [
      ...liveResults,
      ...recentOverviewResults.filter(r => !seenIds.has(r.tournamentId))
    ].slice(0, 10);

    // Get earnings from rankings
    const earningsCategory = findRankingCategory('amount') || findRankingCategory('earnings');
    
    // Helper to create PlayerStat
    const makeStat = (abbrev: string): PlayerStat | undefined => {
      const cat = findRankingCategory(abbrev);
      if (!cat || !cat.displayValue) return undefined;
      return { value: cat.displayValue, rank: cat.rank };
    };

    return {
      id: playerId,
      name: playerName || `Player ${playerId}`,
      earnings: earningsCategory?.displayValue || getStatValue('EARNINGS'),
      wins: getStatValue('WINS') ? parseInt(getStatValue('WINS')!, 10) : undefined,
      topTens: getStatValue('TOP10') ? parseInt(getStatValue('TOP10')!, 10) : undefined,
      cutsMade: getStatValue('CUTS') ? parseInt(getStatValue('CUTS')!, 10) : undefined,
      events: getStatValue('EVENTS') ? parseInt(getStatValue('EVENTS')!, 10) : undefined,
      scoringAvg: getStatValue('AVG') ? { value: getStatValue('AVG')! } : undefined,
      drivingDistance: makeStat('yds/drv'),
      drivingAccuracy: makeStat('drv acc'),
      greensInReg: makeStat('greenshit'),
      puttsPerGir: makeStat('pp gir'),
      birdiesPerRound: makeStat('bird/rnd'),
      sandSaves: makeStat('saves'),
      lastSeasonPlayed: recentTourName,
      recentResults: mergedResults,
    };
  } catch (error) {
    console.error('Error fetching player profile:', error);
    return null;
  }
}

export function searchPlayersInLeaderboard(entries: LeaderboardEntry[], query: string): LeaderboardEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  
  return entries.filter(entry => 
    entry.player.name.toLowerCase().includes(q) ||
    entry.player.country?.toLowerCase().includes(q)
  );
}

export interface SearchResult {
  id: string;
  name: string;
  country?: string;
}

export async function searchAllPlayers(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 2) return [];
  
  try {
    const response = await fetch(
      `https://site.web.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(query)}&limit=10&type=player&sport=golf`
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    
    return (data.items || [])
      .filter((item: any) => item.sport === 'golf')
      .map((item: any) => ({
        id: item.id,
        name: item.displayName,
        country: item.citizenshipCountry?.name,
      }));
  } catch (error) {
    console.error('Error searching players:', error);
    return [];
  }
}
