import { cachedApiRequest } from './client.js';
import type { Tour, Leaderboard, LeaderboardEntry, Player, Tournament } from './types.js';

interface ESPNLeaderboardResponse {
  events?: ESPNEvent[];
}

interface ESPNEvent {
  id: string;
  name: string;
  shortName?: string;
  date: string;
  endDate?: string;
  competitions?: ESPNCompetition[];
  status?: {
    type?: {
      state?: string;
    };
  };
}

interface ESPNCompetition {
  id: string;
  purse?: number;
  venue?: {
    fullName?: string;
    address?: {
      city?: string;
      state?: string;
      country?: string;
    };
  };
  status?: {
    period?: number;
  };
  competitors?: ESPNCompetitor[];
}

interface ESPNCompetitor {
  id: string;
  order?: number;
  athlete?: {
    id?: string;
    fullName?: string;
    displayName: string;
    shortName?: string;
    flag?: {
      href?: string;
      alt?: string;
    };
    citizenship?: string;
    amateur?: boolean;
    headshot?: {
      href?: string;
    };
  };
  status?: {
    position?: {
      id?: string;
      displayName?: string;
    };
    thru?: number;
    displayValue?: string;
  };
  score?: number | string;
  statistics?: ESPNStatistic[];
  linescores?: ESPNLinescore[];
}

interface ESPNStatistic {
  name: string;
  displayValue?: string;
  value?: number;
}

interface ESPNLinescore {
  value?: number;
  displayValue?: string;
  period?: number;
  linescores?: { period?: number }[];  // Nested hole-by-hole scores
}

function parseScore(scoreStr: string | undefined): number {
  if (!scoreStr || scoreStr === 'E') return 0;
  const num = parseInt(scoreStr, 10);
  return isNaN(num) ? 0 : num;
}

function formatScore(num: number): string {
  if (num === 0) return 'E';
  return num > 0 ? `+${num}` : `${num}`;
}

export async function fetchEventLeaderboard(eventId: string, eventName: string, eventDate: string): Promise<Leaderboard | null> {
  try {
    const dateStr = eventDate.slice(0, 10).replace(/-/g, '');
    const response = await cachedApiRequest<ESPNLeaderboardResponse>(`/pga/scoreboard`, {
      params: { dates: dateStr }
    });
    
    if (!response.events || response.events.length === 0) {
      return null;
    }

    // Find the specific event
    const event = response.events.find(e => e.id === eventId) || response.events[0];
    const competition = event.competitions?.[0];
    
    if (!competition) {
      return null;
    }

    const statusState = event.status?.type?.state || 'post';
    const status = statusState === 'in' ? 'in' : statusState === 'post' ? 'post' : 'pre';

    const tournament: Tournament = {
      id: event.id,
      name: event.name,
      shortName: event.shortName,
      date: event.date,
      endDate: event.endDate,
      status,
      tour: 'pga',
    };

    const entries: LeaderboardEntry[] = (competition.competitors || [])
      .map((comp, index): LeaderboardEntry | null => {
        if (!comp.athlete) return null;

        const athlete = comp.athlete;
        const player: Player = {
          id: athlete.id || comp.id,
          name: athlete.displayName || athlete.fullName || 'Unknown',
          firstName: athlete.shortName?.split(' ')[0],
          lastName: athlete.shortName?.split(' ').slice(1).join(' '),
          country: athlete.flag?.alt,
          countryCode: athlete.flag?.alt,
          amateur: athlete.amateur,
          imageUrl: athlete.headshot?.href,
        };

        const positionNum = comp.order || index + 1;
        const positionStr = String(positionNum);
        
        const scoreNum = typeof comp.score === 'number' ? comp.score : 
                        typeof comp.score === 'string' ? parseScore(comp.score) : 0;
        const scoreStr = formatScore(scoreNum);
        
        const roundLinescores = (comp.linescores || []).filter(ls => ls.period !== undefined);
        const rounds = roundLinescores.map(ls => ls.displayValue || '-');
        
        const currentRound = competition.status?.period || 1;
        const todayLinescore = roundLinescores.find(ls => ls.period === currentRound);
        const todayStr = todayLinescore?.displayValue || (rounds.length > 0 ? rounds[rounds.length - 1] : '-');
        const todayNum = parseScore(todayStr);
        
        // Thru - count holes played from current round's nested linescores
        const currentRoundLinescore = roundLinescores.find(ls => ls.period === currentRound);
        const holesPlayed = currentRoundLinescore?.linescores?.length || 0;
        const thruStr = holesPlayed >= 18 ? 'F'
                      : holesPlayed > 0 ? String(holesPlayed)
                      : '-';

        return {
          player,
          position: positionStr,
          positionNum,
          score: scoreStr,
          scoreNum,
          today: todayStr,
          todayNum,
          thru: thruStr,
          rounds,
          status: 'active',
        };
      })
      .filter((e): e is LeaderboardEntry => e !== null)
      .sort((a, b) => a.scoreNum - b.scoreNum);

    return {
      tournament,
      entries,
      round: competition.status?.period || 4,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching event leaderboard:', error);
    return null;
  }
}

export async function fetchLeaderboard(tour: Tour): Promise<Leaderboard | null> {
  try {
    const response = await cachedApiRequest<ESPNLeaderboardResponse>(`/${tour}/scoreboard`);
    
    if (!response.events || response.events.length === 0) {
      return null;
    }

    const event = response.events[0];
    const competition = event.competitions?.[0];
    
    if (!competition) {
      return null;
    }

    const statusState = event.status?.type?.state || 'pre';
    const status = statusState === 'in' ? 'in' : statusState === 'post' ? 'post' : 'pre';

    const tournament: Tournament = {
      id: event.id,
      name: event.name,
      shortName: event.shortName,
      date: event.date,
      endDate: event.endDate,
      status,
      tour,
    };

    const entries: LeaderboardEntry[] = (competition.competitors || [])
      .map((comp, index): LeaderboardEntry | null => {
        if (!comp.athlete) return null;

        const athlete = comp.athlete;
        const player: Player = {
          id: athlete.id || comp.id,
          name: athlete.displayName || athlete.fullName || 'Unknown',
          firstName: athlete.shortName?.split(' ')[0],
          lastName: athlete.shortName?.split(' ').slice(1).join(' '),
          country: athlete.flag?.alt,
          countryCode: athlete.flag?.alt,
          amateur: athlete.amateur,
          imageUrl: athlete.headshot?.href,
        };

        // Position comes from order or we derive from array position
        const positionNum = comp.order || index + 1;
        const positionStr = String(positionNum);
        
        // Score is the total score to par (number like -17)
        const scoreNum = typeof comp.score === 'number' ? comp.score : 
                        typeof comp.score === 'string' ? parseScore(comp.score) : 0;
        const scoreStr = formatScore(scoreNum);
        
        // Get round scores from linescores (each linescore is a round)
        const roundLinescores = (comp.linescores || []).filter(ls => ls.period !== undefined);
        const rounds = roundLinescores.map(ls => ls.displayValue || '-');
        
        // Today's score is from the current round (last with data)
        const currentRound = competition.status?.period || 1;
        const todayLinescore = roundLinescores.find(ls => ls.period === currentRound);
        const todayStr = todayLinescore?.displayValue || (rounds.length > 0 ? rounds[rounds.length - 1] : '-');
        const todayNum = parseScore(todayStr);
        
        // Thru - count holes played from current round's nested linescores
        const currentRoundLinescore = roundLinescores.find(ls => ls.period === currentRound);
        const holesPlayed = currentRoundLinescore?.linescores?.length || 0;
        const thruStr = holesPlayed >= 18 ? 'F'
                      : holesPlayed > 0 ? String(holesPlayed)
                      : '-';

        let entryStatus: 'active' | 'cut' | 'wd' | 'dq' = 'active';
        const statusVal = comp.status?.displayValue?.toLowerCase() || '';
        if (statusVal.includes('cut')) entryStatus = 'cut';
        else if (statusVal.includes('wd')) entryStatus = 'wd';
        else if (statusVal.includes('dq')) entryStatus = 'dq';

        return {
          player,
          position: positionStr,
          positionNum,
          score: scoreStr,
          scoreNum,
          today: todayStr,
          todayNum,
          thru: thruStr,
          rounds,
          status: entryStatus,
        };
      })
      .filter((e): e is LeaderboardEntry => e !== null)
      .sort((a, b) => a.scoreNum - b.scoreNum);

    return {
      tournament,
      entries,
      round: competition.status?.period || 1,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return null;
  }
}
