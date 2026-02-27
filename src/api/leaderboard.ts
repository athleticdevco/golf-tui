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

function parseCompetitor(
  comp: ESPNCompetitor,
  index: number,
  currentRound: number,
  isPlayoff: boolean,
  tournamentStatus: string,
): LeaderboardEntry | null {
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

  const allLinescores = (comp.linescores || []).filter(ls => ls.period !== undefined);
  const regulationLinescores = allLinescores.filter(ls => (ls.period || 0) <= 4);
  const playoffLinescores = allLinescores.filter(ls => (ls.period || 0) > 4);
  const playerInPlayoff = isPlayoff && playoffLinescores.length > 0;

  // Rounds: only regulation (R1-R4)
  const rounds = regulationLinescores.map(ls => ls.displayValue || '-');

  // Score: for playoff participants, sum regulation linescore values instead of using ESPN's comp.score
  let scoreNum: number;
  if (playerInPlayoff) {
    scoreNum = regulationLinescores.reduce((sum, ls) => sum + parseScore(ls.displayValue), 0);
  } else {
    scoreNum = typeof comp.score === 'number' ? comp.score :
               typeof comp.score === 'string' ? parseScore(comp.score) : 0;
  }
  const scoreStr = formatScore(scoreNum);

  // Today/Thru for playoff participants
  let todayStr: string;
  let todayNum: number;
  let thruStr: string;

  if (playerInPlayoff && tournamentStatus === 'post') {
    todayStr = '-';
    todayNum = 0;
    thruStr = 'P';
  } else if (playerInPlayoff && tournamentStatus === 'in') {
    // Live playoff: show playoff hole info
    const playoffLs = playoffLinescores[0];
    const playoffHoles = playoffLs?.linescores?.length || 0;
    todayStr = playoffLs?.displayValue || '-';
    todayNum = parseScore(todayStr);
    thruStr = playoffHoles > 0 ? `P${playoffHoles}` : 'P';
  } else {
    // Normal (non-playoff) handling
    const effectiveRound = Math.min(currentRound, 4);
    const todayLinescore = regulationLinescores.find(ls => ls.period === effectiveRound);
    todayStr = todayLinescore?.displayValue || (rounds.length > 0 ? rounds[rounds.length - 1] : '-');
    todayNum = parseScore(todayStr);

    const currentRoundLinescore = regulationLinescores.find(ls => ls.period === effectiveRound);
    const holesPlayed = currentRoundLinescore?.linescores?.length || 0;
    thruStr = holesPlayed >= 18 ? 'F'
            : holesPlayed > 0 ? String(holesPlayed)
            : '-';
  }

  let entryStatus: 'active' | 'cut' | 'wd' | 'dq' = 'active';
  const statusVal = comp.status?.displayValue?.toLowerCase() || '';
  if (statusVal.includes('cut')) entryStatus = 'cut';
  else if (statusVal.includes('wd')) entryStatus = 'wd';
  else if (statusVal.includes('dq')) entryStatus = 'dq';

  const hasHoleData = regulationLinescores.some(ls => ls.linescores && ls.linescores.length > 0);

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
    scorecardAvailable: hasHoleData,
    inPlayoff: playerInPlayoff || undefined,
  };
}

export async function fetchEventLeaderboard(eventId: string, eventName: string, eventDate: string, tour: Tour = 'pga'): Promise<Leaderboard | null> {
  const dateStr = eventDate.slice(0, 10).replace(/-/g, '');
  const response = await cachedApiRequest<ESPNLeaderboardResponse>(`/${tour}/scoreboard`, {
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
    tour,
  };

  const currentRound = competition.status?.period || 1;
  const isPlayoff = currentRound > 4;

  const entries: LeaderboardEntry[] = (competition.competitors || [])
    .map((comp, index) => parseCompetitor(comp, index, currentRound, isPlayoff, status))
    .filter((e): e is LeaderboardEntry => e !== null)
    .sort((a, b) => a.positionNum - b.positionNum);

  return {
    tournament,
    entries,
    round: Math.min(currentRound, 4),
    isPlayoff: isPlayoff || undefined,
    lastUpdated: new Date().toISOString(),
  };
}

export async function fetchLeaderboard(tour: Tour): Promise<Leaderboard | null> {
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

  const currentRound = competition.status?.period || 1;
  const isPlayoff = currentRound > 4;

  const entries: LeaderboardEntry[] = (competition.competitors || [])
    .map((comp, index) => parseCompetitor(comp, index, currentRound, isPlayoff, status))
    .filter((e): e is LeaderboardEntry => e !== null)
    .sort((a, b) => a.positionNum - b.positionNum);

  return {
    tournament,
    entries,
    round: Math.min(currentRound, 4),
    isPlayoff: isPlayoff || undefined,
    lastUpdated: new Date().toISOString(),
  };
}
