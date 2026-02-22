import { cachedApiRequest, safeFetch } from './client.js';
import type { PlayerProfile, LeaderboardEntry, TournamentResult, PlayerStat, RankingMetric, Tour, SeasonSummary, SeasonResults } from './types.js';

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

interface ESPNSeasonStats {
  splits?: {
    categories?: {
      name: string;
      stats?: {
        name: string;
        displayValue?: string | null;
      }[];
    }[];
  };
}

const seasonStatsCache = new Map<string, { data: SeasonSummary | null; timestamp: number }>();
const SEASON_CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function fetchSeasonStats(playerId: string, tour: Tour, year: number): Promise<SeasonSummary | null> {
  const cacheKey = `${tour}:${playerId}:${year}`;
  const cached = seasonStatsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < SEASON_CACHE_TTL) return cached.data;

  try {
    const resp = await safeFetch(
      `https://sports.core.api.espn.com/v2/sports/golf/leagues/${tour}/seasons/${year}/types/2/athletes/${playerId}/statistics`
    );
    if (!resp.ok) { seasonStatsCache.set(cacheKey, { data: null, timestamp: Date.now() }); return null; }
    const data: ESPNSeasonStats = await resp.json();

    const stats = data.splits?.categories?.find(c => c.name === 'general')?.stats || [];
    const get = (name: string) => stats.find(s => s.name === name)?.displayValue ?? undefined;

    const events = parseInt(get('tournamentsPlayed') || '0', 10);
    if (events === 0) { seasonStatsCache.set(cacheKey, { data: null, timestamp: Date.now() }); return null; }

    const result: SeasonSummary = {
      year,
      events,
      wins: parseInt(get('wins') || '0', 10),
      topTens: parseInt(get('topTenFinishes') || '0', 10),
      cutsMade: parseInt(get('cutsMade') || '0', 10),
      earnings: get('amount') || undefined,
      scoringAvg: get('scoringAverage') || undefined,
    };
    seasonStatsCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch {
    seasonStatsCache.set(cacheKey, { data: null, timestamp: Date.now() });
    return null;
  }
}

async function fetchSeasonHistory(playerId: string, tour: Tour): Promise<SeasonSummary[]> {
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];
  const results = await Promise.all(years.map(y => fetchSeasonStats(playerId, tour, y)));
  return results.filter((r): r is SeasonSummary => r !== null);
}

interface ESPNEventLogResponse {
  events?: {
    items?: {
      event?: { $ref?: string };
      competitor?: { $ref?: string };
      played?: boolean;
      league?: string;
    }[];
  };
}

const CORE_API = 'https://sports.core.api.espn.com/v2/sports/golf/leagues';
const seasonResultsCache = new Map<string, { data: SeasonResults; timestamp: number }>();

export async function fetchSeasonResults(playerId: string, tour: Tour, year: number): Promise<SeasonResults> {
  const cacheKey = `sr:${tour}:${playerId}:${year}`;
  const cached = seasonResultsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < SEASON_CACHE_TTL) return cached.data;

  const empty: SeasonResults = { year, results: [] };
  try {
    const logResp = await safeFetch(`${CORE_API}/${tour}/seasons/${year}/athletes/${playerId}/eventlog`);
    if (!logResp.ok) { seasonResultsCache.set(cacheKey, { data: empty, timestamp: Date.now() }); return empty; }
    const log: ESPNEventLogResponse = await logResp.json();

    const items = (log.events?.items || []).filter(i => i.played && i.league === tour);
    if (items.length === 0) { seasonResultsCache.set(cacheKey, { data: empty, timestamp: Date.now() }); return empty; }

    const eventEntries = items.map(item => {
      const eventRef = item.event?.$ref || '';
      const compRef = item.competitor?.$ref || '';
      const eventId = eventRef.split('/events/')[1]?.split('?')[0] || '';
      return { eventId, eventRef, compRef };
    }).filter(e => e.eventId);

    // Resolve event info + score + status in parallel for all events
    const resolved = await Promise.all(eventEntries.map(async ({ eventId, eventRef, compRef }) => {
      try {
        const scoreUrl = compRef ? compRef.replace(/\?.*/, '') + '/score' : '';
        const statusUrl = compRef ? compRef.replace(/\?.*/, '') + '/status' : '';

        const [eventResp, scoreResp, statusResp] = await Promise.all([
          safeFetch(eventRef).then(r => r.ok ? r.json() : null).catch(() => null),
          scoreUrl ? safeFetch(scoreUrl).then(r => r.ok ? r.json() : null).catch(() => null) : null,
          statusUrl ? safeFetch(statusUrl).then(r => r.ok ? r.json() : null).catch(() => null) : null,
        ]);

        if (!eventResp) return null;

        return {
          tournamentId: eventId,
          tournamentName: eventResp.shortName || eventResp.name || 'Unknown',
          date: eventResp.date || '',
          score: scoreResp?.displayValue || '-',
          position: statusResp?.position?.displayName || '-',
        } as TournamentResult;
      } catch {
        return null;
      }
    }));

    const results = resolved
      .filter((r): r is TournamentResult => r !== null)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const seasonResults: SeasonResults = { year, results };
    seasonResultsCache.set(cacheKey, { data: seasonResults, timestamp: Date.now() });
    return seasonResults;
  } catch {
    seasonResultsCache.set(cacheKey, { data: empty, timestamp: Date.now() });
    return empty;
  }
}

export async function fetchPlayerProfile(playerId: string, playerName?: string, tour: Tour = 'pga'): Promise<PlayerProfile | null> {
  try {
    // Fetch overview, recent scoreboard data, and season history in parallel
    const [overviewResponse, liveResults, seasonHistory] = await Promise.all([
      safeFetch(`https://site.web.api.espn.com/apis/common/v3/sports/golf/${tour}/athletes/${playerId}/overview`),
      fetchRecentTournamentResults(playerId, tour),
      fetchSeasonHistory(playerId, tour),
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

    const rankings: RankingMetric[] = rankingCategories
      .filter(c => !!c.displayName && !!c.displayValue)
      .map(c => ({
        name: c.name,
        displayName: c.displayName,
        abbreviation: c.abbreviation,
        displayValue: c.displayValue!,
        rank: c.rank,
      }));

    // Extract recent tournaments from overview
    const recentTourData = data.recentTournaments?.[0];
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
      recentResults: mergedResults,
      rankings,
      seasonHistory,
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
    const response = await safeFetch(
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
