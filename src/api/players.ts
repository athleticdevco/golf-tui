import type { PlayerProfile, LeaderboardEntry, TournamentResult, PlayerStat, Tour } from './types.js';

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

async function fetchRecentTournamentResults(playerId: string, tour: Tour): Promise<TournamentResult[]> {
  // Fetch results from recent scoreboard data (more current than overview endpoint)
  const results: TournamentResult[] = [];
  
  try {
    // Get current week and past 8 weeks to cover recent tournaments
    const now = new Date();
    const dates: string[] = [];
    for (let i = 0; i <= 8; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - (i * 7));
      dates.push(d.toISOString().slice(0, 10).replace(/-/g, ''));
    }
    
    // Fetch scoreboards for each date in parallel
    const responses = await Promise.all(
      dates.map(date => 
        fetch(`https://site.api.espn.com/apis/site/v2/sports/golf/${tour}/scoreboard?dates=${date}`)
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
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
          if (c.id === playerId) {
            const score = typeof c.score === 'number' ? 
              (c.score === 0 ? 'E' : c.score > 0 ? `+${c.score}` : `${c.score}`) : 
              String(c.score || '-');
            
            results.push({
              tournamentId: event.id,
              tournamentName: event.shortName || event.name,
              date: event.date,
              position: c.order ? String(c.order) : '-',
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

    // Filter overview results to current year only
    const currentYear = new Date().getFullYear();
    const currentYearOverviewResults = overviewResults.filter(r => {
      const year = new Date(r.date).getFullYear();
      return year >= currentYear;
    });

    // Merge live results with filtered overview results (live takes priority)
    const seenIds = new Set(liveResults.map(r => r.tournamentId));
    const mergedResults = [
      ...liveResults,
      ...currentYearOverviewResults.filter(r => !seenIds.has(r.tournamentId))
    ].slice(0, 10);

    // Get earnings from rankings
    const earningsCategory = findRankingCategory('amount') || findRankingCategory('earnings');
    
    // Helper to create PlayerStat
    const makeStat = (abbrev: string): PlayerStat | undefined => {
      const cat = findRankingCategory(abbrev);
      if (!cat || !cat.displayValue) return undefined;
      return { value: cat.displayValue, rank: cat.rank };
    };

    // Only include stats if player has recent results (current/last year)
    const hasRecentActivity = mergedResults.length > 0;
    
    return {
      id: playerId,
      name: playerName || `Player ${playerId}`,
      // Only show stats if player has been active recently
      earnings: hasRecentActivity ? (earningsCategory?.displayValue || getStatValue('EARNINGS')) : undefined,
      wins: hasRecentActivity && getStatValue('WINS') ? parseInt(getStatValue('WINS')!, 10) : undefined,
      topTens: hasRecentActivity && getStatValue('TOP10') ? parseInt(getStatValue('TOP10')!, 10) : undefined,
      cutsMade: hasRecentActivity && getStatValue('CUTS') ? parseInt(getStatValue('CUTS')!, 10) : undefined,
      events: hasRecentActivity && getStatValue('EVENTS') ? parseInt(getStatValue('EVENTS')!, 10) : undefined,
      scoringAvg: hasRecentActivity && getStatValue('AVG') ? { value: getStatValue('AVG')! } : undefined,
      drivingDistance: hasRecentActivity ? makeStat('yds/drv') : undefined,
      drivingAccuracy: hasRecentActivity ? makeStat('drv acc') : undefined,
      greensInReg: hasRecentActivity ? makeStat('greenshit') : undefined,
      puttsPerGir: hasRecentActivity ? makeStat('pp gir') : undefined,
      birdiesPerRound: hasRecentActivity ? makeStat('bird/rnd') : undefined,
      sandSaves: hasRecentActivity ? makeStat('saves') : undefined,
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
