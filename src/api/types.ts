export type Tour = 'pga' | 'lpga' | 'eur' | 'champions-tour';

export interface Tournament {
  id: string;
  name: string;
  shortName?: string;
  date: string;
  endDate?: string;
  venue?: string;
  location?: string;
  purse?: string;
  status: 'pre' | 'in' | 'post';
  tour: Tour;
}

export interface Player {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  country?: string;
  countryCode?: string;
  amateur?: boolean;
  imageUrl?: string;
}

export interface LeaderboardEntry {
  player: Player;
  position: string;
  positionNum: number;
  score: string;
  scoreNum: number;
  today: string;
  todayNum: number;
  thru: string;
  rounds: string[];
  status?: 'active' | 'cut' | 'wd' | 'dq';
  scorecardAvailable?: boolean;
}

export interface Leaderboard {
  tournament: Tournament;
  entries: LeaderboardEntry[];
  round: number;
  lastUpdated: string;
}

export interface PlayerStat {
  value: string;
  rank?: number;
}

export interface PlayerProfile extends Player {
  worldRanking?: number;
  fedexRank?: number;
  earnings?: string;
  wins?: number;
  topTens?: number;
  cutsMade?: number;
  events?: number;
  scoringAvg?: PlayerStat;
  drivingDistance?: PlayerStat;
  drivingAccuracy?: PlayerStat;
  greensInReg?: PlayerStat;
  puttsPerGir?: PlayerStat;
  birdiesPerRound?: PlayerStat;
  lastSeasonPlayed?: string;
  sandSaves?: PlayerStat;
  recentResults?: TournamentResult[];
}

export interface TournamentResult {
  tournamentId: string;
  tournamentName: string;
  date: string;
  position: string;
  score: string;
}

export interface HoleScore {
  holeNumber: number;
  strokes: number;
  toPar: number;
  par: number;
}

export interface RoundScorecard {
  round: number;
  totalStrokes: number | null;
  toPar: number | null;
  holes: HoleScore[];
  isComplete: boolean;
}

export interface PlayerScorecard {
  playerId: string;
  playerName: string;
  eventId: string;
  eventName: string;
  rounds: RoundScorecard[];
}

export type View =
  | 'leaderboard'
  | 'schedule'
  | 'players'
  | 'player'
  | 'stats'
  | 'help'
  | 'event-leaderboard'
  | 'stat-leaders'
  | 'scorecard';

export interface AppState {
  view: View;
  tour: Tour;
  selectedIndex: number;
  isSearchFocused: boolean;
}
