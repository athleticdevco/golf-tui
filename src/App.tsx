import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Box, Text, useApp, useInput, Static } from 'ink';
import type { View, Tour, LeaderboardEntry, Tournament, RankingMetric } from './api/types.js';
import { fetchEventLeaderboard } from './api/leaderboard.js';
import { useLeaderboard, useTournaments, usePlayerProfile, useGlobalSearch, useScorecard, useActiveTours, useStatLeaders } from './hooks/index.js';
import {
  Header,
  StatusBar,
  SearchInput,
  SearchResults,
  Leaderboard,
  PlayerProfile,
  TournamentList,
  PlayersView,
  StatsView,
  StatLeadersView,
  MetricDetailModal,
  CommandPalette,
  COMMANDS,
  filterCommands,
  HelpView,
  SplashScreen,
  ScorecardDetail,
  Breadcrumb,
} from './components/index.js';


type SearchContext = 'leaderboardPlayers' | 'globalPlayers' | 'scheduleTournaments' | 'statsMetrics';
type ScheduleSortMode = 'date' | 'status';
type StatsSortMode = 'rank' | 'name';
type BreadcrumbTarget =
  | { kind: 'leaderboard' }
  | { kind: 'schedule'; anchorEventId?: string }
  | { kind: 'players' }
  | { kind: 'event-leaderboard' }
  | { kind: 'player'; playerId?: string; playerName?: string; origin?: 'leaderboard' | 'event' }
  | { kind: 'scorecard-player'; playerName: string };

type BreadcrumbNavItem = { label: string; target?: BreadcrumbTarget };

function sortScheduleTournaments(tournaments: Tournament[], mode: ScheduleSortMode): Tournament[] {
  const items = [...tournaments];

  if (mode === 'date') {
    items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return items;
  }

  const statusRank = (s: Tournament['status']) => (s === 'in' ? 0 : s === 'post' ? 1 : 2);
  items.sort((a, b) => {
    const sr = statusRank(a.status) - statusRank(b.status);
    if (sr !== 0) return sr;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  return items;
}

function sortStatsMetrics(metrics: RankingMetric[], mode: StatsSortMode): RankingMetric[] {
  const items = [...metrics];

  if (mode === 'name') {
    items.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return items;
  }

  items.sort((a, b) => {
    const ar = a.rank ?? Number.POSITIVE_INFINITY;
    const br = b.rank ?? Number.POSITIVE_INFINITY;
    if (ar !== br) return ar - br;
    return a.displayName.localeCompare(b.displayName);
  });
  return items;
}

function filterRankingMetrics(metrics: RankingMetric[]): RankingMetric[] {
  return metrics.filter(m => {
    const v = String(m.displayValue ?? '').trim();
    if (!v) return false;
    if (v === '--' || v === '-' || v.toLowerCase() === 'n/a') return false;
    if (/^0(\.0+)?$/.test(v)) return false;
    return true;
  });
}



function searchPlayers(entries: LeaderboardEntry[], query: string): LeaderboardEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return entries.filter(entry => 
    entry.player.name.toLowerCase().includes(q)
  );
}

export function App() {
  const { exit } = useApp();

  // Splash screen state
  const [showSplash, setShowSplash] = useState(true);

  // View state
  const [view, setView] = useState<View>('leaderboard');
  const [tour, setTour] = useState<Tour>('pga');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Command palette and search state
  const [commandInput, setCommandInput] = useState('');
  const [commandIndex, setCommandIndex] = useState(0);
  const [searchIndex, setSearchIndex] = useState(0);
  const [searchContext, setSearchContext] = useState<SearchContext>('leaderboardPlayers');

  const isCommandMode = isSearchFocused && commandInput.startsWith('/');
  const isSearchMode = isSearchFocused && !commandInput.startsWith('/');

  // Navigation state
  const [leaderboardIndex, setLeaderboardIndex] = useState(0);
  const [scheduleSelectedId, setScheduleSelectedId] = useState<string | null>(null);
  const [playerResultIndex, setPlayerResultIndex] = useState(0);
  const [scheduleSortMode, setScheduleSortMode] = useState<ScheduleSortMode>('date');

  const [statsSortMode, setStatsSortMode] = useState<StatsSortMode>('rank');
  const [statsMetricIndex, setStatsMetricIndex] = useState(0);
  const [metricDetail, setMetricDetail] = useState<RankingMetric | null>(null);
  const [statLeadersIndex, setStatLeadersIndex] = useState(0);
  const [currentStatMetric, setCurrentStatMetric] = useState<RankingMetric | null>(null);

  // Event leaderboard state (for drilling into a tournament from player profile)
  const [eventLeaderboard, setEventLeaderboard] = useState<typeof leaderboard>(null);
  const [eventLoading, setEventLoading] = useState(false);
  const [eventIndex, setEventIndex] = useState(0);
  const [eventOrigin, setEventOrigin] = useState<'player' | 'schedule'>('player');
  const [eventParentPlayer, setEventParentPlayer] = useState<{ id: string; name: string } | null>(null);

  const [playerOrigin, setPlayerOrigin] = useState<'leaderboard' | 'event'>('leaderboard');

  // Scorecard state
  const [selectedRound, setSelectedRound] = useState(1);

  // Breadcrumb navigation state
  const [breadcrumbIndex, setBreadcrumbIndex] = useState<number | null>(null);
  const [breadcrumbNavItems, setBreadcrumbNavItems] = useState<BreadcrumbNavItem[] | null>(null);

  // Data hooks
  const { activeTours } = useActiveTours();
  const { leaderboard, isLoading: leaderboardLoading, error: leaderboardError, refresh } = useLeaderboard(tour);
  const { tournaments, isLoading: tournamentsLoading, error: tournamentsError } = useTournaments(tour);
  const { player, isLoading: playerLoading, error: playerError, loadPlayer, clear: clearPlayer } = usePlayerProfile();
  const { scorecard, isLoading: scorecardLoading, error: scorecardError, loadScorecard, clear: clearScorecard, setAutoRefresh } = useScorecard();
  const { category: statCategory, leaders: statLeaders, isLoading: statLeadersLoading, error: statLeadersError, load: loadStatLeaders, clear: clearStatLeaders } = useStatLeaders();

  const scheduleTournaments = useMemo(
    () => sortScheduleTournaments(tournaments, scheduleSortMode),
    [tournaments, scheduleSortMode]
  );

  const scheduleIndex = useMemo(() => {
    if (scheduleTournaments.length === 0) return 0;
    if (!scheduleSelectedId) return 0;
    const idx = scheduleTournaments.findIndex(t => t.id === scheduleSelectedId);
    return idx >= 0 ? idx : 0;
  }, [scheduleTournaments, scheduleSelectedId]);

  useEffect(() => {
    if (scheduleTournaments.length === 0) return;
    if (!scheduleSelectedId) {
      setScheduleSelectedId(scheduleTournaments[0].id);
      return;
    }
    if (!scheduleTournaments.some(t => t.id === scheduleSelectedId)) {
      setScheduleSelectedId(scheduleTournaments[0].id);
    }
  }, [scheduleTournaments, scheduleSelectedId]);

  const statsMetrics = useMemo(() => {
    if (!player?.rankings) return [];

    return sortStatsMetrics(filterRankingMetrics(player.rankings), statsSortMode);
  }, [player, statsSortMode]);

  // Get filtered commands
  const filteredCommands = filterCommands(COMMANDS, commandInput);

  // Get leaderboard search results (players in current tournament)
  const leaderboardSearchResults = useMemo(() => {
    if (!isSearchMode || searchContext !== 'leaderboardPlayers' || !leaderboard) return [];
    return searchPlayers(leaderboard.entries, commandInput);
  }, [isSearchMode, searchContext, leaderboard, commandInput]);

  // Get global search results (all players)
  const { results: globalSearchResults, isLoading: globalSearchLoading } = useGlobalSearch(
    isSearchMode && (searchContext === 'globalPlayers' || searchContext === 'leaderboardPlayers') ? commandInput : ''
  );

  // Combine: show leaderboard results first, then global
  const hasLeaderboardResults = leaderboardSearchResults.length > 0;

  const searchPlaceholder = useMemo(() => {
    if (isSearchFocused) {
      if (isCommandMode) return 'Type a command (e.g. /players)...';
      switch (searchContext) {
        case 'leaderboardPlayers':
          return 'Search players in tournament...';
        case 'globalPlayers':
          return 'Search all players...';
        case 'scheduleTournaments':
          return 'Search tournaments...';
        case 'statsMetrics':
          return 'Filter metrics...';
      }
    }

    switch (view) {
      case 'leaderboard':
        return 'Press s to search • / commands';
      case 'players':
        return 'Press s to search • / commands';
      case 'schedule':
        return 'Press s to search • / commands';
      case 'stats':
        return 'Press s to filter • / commands';
      default:
        return 'Type / for commands...';
    }
  }, [isSearchFocused, isCommandMode, searchContext, view]);

  const scheduleSearchResults = useMemo(() => {
    if (!isSearchMode || searchContext !== 'scheduleTournaments') return [] as { tournament: Tournament; index: number }[];
    const q = commandInput.toLowerCase().trim();
    if (!q) return [];

    return scheduleTournaments
      .map((t, index) => ({ tournament: t, index }))
      .filter(({ tournament }) => {
        const haystack = [tournament.name, tournament.venue, tournament.location]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
  }, [isSearchMode, searchContext, commandInput, scheduleTournaments]);

  const metricSearchResults = useMemo(() => {
    if (!isSearchMode || searchContext !== 'statsMetrics') return [] as { metric: RankingMetric; index: number }[];
    const q = commandInput.toLowerCase().trim();
    if (!q) return [];

    return statsMetrics
      .map((m, index) => ({ metric: m, index }))
      .filter(({ metric }) => {
        const haystack = [metric.displayName, metric.abbreviation, metric.name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
  }, [isSearchMode, searchContext, commandInput, statsMetrics]);

  const clearEventContext = useCallback(() => {
    setEventLeaderboard(null);
    setEventIndex(0);
    setEventParentPlayer(null);
    setEventOrigin('player');
  }, []);

  // Breadcrumb model with stable targets (no index-based meaning).
  const breadcrumbModel = useMemo((): BreadcrumbNavItem[] => {
    const items: BreadcrumbNavItem[] = [];
    const push = (label: string, target?: BreadcrumbTarget) => items.push({ label, target });

    switch (view) {
      case 'leaderboard':
        if (leaderboard) push(leaderboard.tournament.name);
        return items;
      case 'schedule':
        push('Schedule');
        return items;
      case 'players':
        push('Players');
        return items;
      case 'event-leaderboard': {
        if (!eventLeaderboard) return [];

        if (eventOrigin === 'schedule') {
          push('Schedule', { kind: 'schedule', anchorEventId: eventLeaderboard.tournament.id });
          push(eventLeaderboard.tournament.name);
          return items;
        }

        if (eventParentPlayer) {
          push(eventParentPlayer.name, {
            kind: 'player',
            origin: 'event',
            playerId: eventParentPlayer.id,
            playerName: eventParentPlayer.name,
          });
          push(eventLeaderboard.tournament.name);
          return items;
        }

        push(eventLeaderboard.tournament.name);
        return items;
      }
      case 'player': {
        if (!player) return [];

        if (playerOrigin === 'event' && eventLeaderboard) {
          if (eventOrigin === 'schedule') {
            push('Schedule', { kind: 'schedule', anchorEventId: eventLeaderboard.tournament.id });
            push(eventLeaderboard.tournament.name, { kind: 'event-leaderboard' });
            push(player.name);
            return items;
          }

          push(eventLeaderboard.tournament.name, { kind: 'event-leaderboard' });
          push(player.name);
          return items;
        }

        if (leaderboard) {
          push(leaderboard.tournament.name, { kind: 'leaderboard' });
          push(player.name);
          return items;
        }

        push(player.name);
        return items;
      }
      case 'stats': {
        if (!player) {
          push('Stats');
          return items;
        }

        if (playerOrigin === 'event' && eventLeaderboard) {
          if (eventOrigin === 'schedule') {
            push('Schedule', { kind: 'schedule', anchorEventId: eventLeaderboard.tournament.id });
            push(eventLeaderboard.tournament.name, { kind: 'event-leaderboard' });
            push(player.name, { kind: 'player', origin: 'event', playerId: player.id, playerName: player.name });
            push('Stats');
            return items;
          }

          push(eventLeaderboard.tournament.name, { kind: 'event-leaderboard' });
          push(player.name, { kind: 'player', origin: 'event', playerId: player.id, playerName: player.name });
          push('Stats');
          return items;
        }

        push(player.name, { kind: 'player', origin: 'leaderboard', playerId: player.id, playerName: player.name });
        push('Stats');
        return items;
      }
      case 'scorecard': {
        if (!scorecard) return [];

        if (leaderboard) {
          push(leaderboard.tournament.name, { kind: 'leaderboard' });
          push(scorecard.playerName, { kind: 'scorecard-player', playerName: scorecard.playerName });
          push('Scorecard');
          return items;
        }

        push(scorecard.playerName);
        push('Scorecard');
        return items;
      }
      default:
        return [];
    }
  }, [view, leaderboard, player, playerOrigin, eventLeaderboard, eventOrigin, eventParentPlayer, scorecard]);

  const navigateToTarget = useCallback((target?: BreadcrumbTarget) => {
    if (!target) return;

    switch (target.kind) {
      case 'leaderboard':
        setView('leaderboard');
        setPlayerOrigin('leaderboard');
        clearPlayer();
        setPlayerResultIndex(0);
        clearEventContext();
        return;
      case 'players':
        setView('players');
        setPlayerOrigin('leaderboard');
        clearEventContext();
        return;
      case 'event-leaderboard':
        if (eventLeaderboard) setView('event-leaderboard');
        return;
      case 'schedule':
        if (target.anchorEventId) setScheduleSelectedId(target.anchorEventId);
        setView('schedule');
        setPlayerOrigin('leaderboard');
        clearEventContext();
        return;
      case 'player': {
        setView('player');
        setPlayerOrigin(target.origin ?? 'leaderboard');
        setPlayerResultIndex(0);
        if (target.playerId && target.playerId !== player?.id) {
          loadPlayer(target.playerId, target.playerName, tour);
        }
        return;
      }
      case 'scorecard-player': {
        const entry = leaderboard?.entries.find(e => e.player.name === target.playerName);
        if (!entry) return;

        setPlayerOrigin('leaderboard');
        loadPlayer(entry.player.id, entry.player.name, tour);
        setView('player');
        setAutoRefresh(false);
        clearScorecard();
        setSelectedRound(1);
        return;
      }
    }
  }, [
    clearEventContext,
    clearPlayer,
    clearScorecard,
    eventLeaderboard,
    leaderboard,
    loadPlayer,
    player?.id,
    setAutoRefresh,
    tour,
  ]);

  const breadcrumbItems = breadcrumbModel.map(i => i.label);
  const isBreadcrumbMode = breadcrumbIndex !== null;
  const activeBreadcrumbModel = isBreadcrumbMode ? (breadcrumbNavItems ?? breadcrumbModel) : breadcrumbModel;
  const activeBreadcrumbItems = activeBreadcrumbModel.map(i => i.label);

  // Execute command
  const executeCommand = useCallback((commandName: string) => {
    setCommandInput('');
    setCommandIndex(0);
    setIsSearchFocused(false);

    switch (commandName) {
      case 'leaderboard':
        setView('leaderboard');
        break;
      case 'schedule':
        setView('schedule');
        break;
      case 'players':
        setView('players');
        setIsSearchFocused(false);
        setCommandInput('');
        setSearchIndex(0);
        break;
      case 'stats':
        setView('stats');
        setIsSearchFocused(false);
        setCommandInput('');
        break;
      case 'pga':
        setTour('pga');
        setView('leaderboard');
        setLeaderboardIndex(0);
        break;
      case 'lpga':
        setTour('lpga');
        setView('leaderboard');
        setLeaderboardIndex(0);
        break;
      case 'eur':
        setTour('eur');
        setView('leaderboard');
        setLeaderboardIndex(0);
        break;
      case 'champions':
        setTour('champions-tour');
        setView('leaderboard');
        setLeaderboardIndex(0);
        break;
      case 'help':
        setShowHelp(true);
        break;
    }
  }, []);

  // Handle search input
  const handleQueryChange = useCallback((value: string) => {
    if (value.startsWith('/')) {
      setCommandInput(value);
      setCommandIndex(0);
    } else {
      setCommandInput(value);
    }
  }, []);

  // Cycle to next tour (only active tours)
  const cycleTour = useCallback(() => {
    const currentIndex = activeTours.indexOf(tour);
    const nextIndex = (currentIndex + 1) % activeTours.length;
    setTour(activeTours[nextIndex]);
    setLeaderboardIndex(0);
  }, [tour, activeTours]);

  // Keyboard input
  useInput((input, key) => {
    // Close help on any key
    if (showHelp) {
      setShowHelp(false);
      return;
    }

    // Close metric detail modal on any key
    if (metricDetail) {
      setMetricDetail(null);
      return;
    }

    // Global quit
    if (input === 'q' && !isSearchFocused) {
      exit();
      return;
    }

    // Open search/command mode
    if (input === '/' && !isSearchFocused) {
      setBreadcrumbIndex(null);
      setBreadcrumbNavItems(null);
      setIsSearchFocused(true);
      setCommandInput('/');
      return;
    }

    // Quick help
    if (input === '?' && !isSearchFocused) {
      setBreadcrumbIndex(null);
      setBreadcrumbNavItems(null);
      setShowHelp(true);
      return;
    }

    // Open search mode (s key)
    if (input === 's' && !isSearchFocused) {
      setBreadcrumbIndex(null);
      setBreadcrumbNavItems(null);
      if (view === 'leaderboard') {
        setSearchContext('leaderboardPlayers');
      } else if (view === 'players') {
        setSearchContext('globalPlayers');
      } else if (view === 'schedule') {
        setSearchContext('scheduleTournaments');
      } else if (view === 'stats') {
        setSearchContext('statsMetrics');
      } else {
        return;
      }

      setIsSearchFocused(true);
      setCommandInput('');
      setSearchIndex(0);
      return;
    }

    // Command palette navigation
    if (isCommandMode && filteredCommands.length > 0) {
      if (key.downArrow || input === 'j') {
        setCommandIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
        return;
      }
      if (key.upArrow || input === 'k') {
        setCommandIndex(prev => Math.max(prev - 1, 0));
        return;
      }
      if (key.return) {
        const cmd = filteredCommands[commandIndex];
        if (cmd) {
          executeCommand(cmd.name);
        }
        return;
      }
    }

    // Search results navigation
    if (isSearchMode) {
      const totalResults =
        searchContext === 'scheduleTournaments'
          ? scheduleSearchResults.length
          : searchContext === 'statsMetrics'
          ? metricSearchResults.length
          : searchContext === 'leaderboardPlayers'
          ? (hasLeaderboardResults ? leaderboardSearchResults.length : globalSearchResults.length)
          : globalSearchResults.length;
      
      if (key.downArrow) {
        if (totalResults > 0) {
          setSearchIndex(prev => Math.min(prev + 1, totalResults - 1));
        }
        return;
      }
      if (key.upArrow) {
        if (totalResults > 0) {
          setSearchIndex(prev => Math.max(prev - 1, 0));
        }
        return;
      }
      if (key.return) {
        if (totalResults === 0) return;
          if (searchContext === 'scheduleTournaments') {
            const hit = scheduleSearchResults[searchIndex];
            if (hit) {
              setScheduleSelectedId(hit.tournament.id);
              setIsSearchFocused(false);
              setCommandInput('');
              setSearchIndex(0);
            }
            return;
          }

          if (searchContext === 'statsMetrics') {
            const hit = metricSearchResults[searchIndex];
            if (hit) {
              setStatsMetricIndex(hit.index);
              setIsSearchFocused(false);
              setCommandInput('');
              setSearchIndex(0);
            }
            return;
          }

          if (searchContext === 'leaderboardPlayers' && hasLeaderboardResults) {
            const entry = leaderboardSearchResults[searchIndex];
            if (entry) {
              setPlayerOrigin('leaderboard');
              loadPlayer(entry.player.id, entry.player.name, tour);
              setView('player');
              setIsSearchFocused(false);
              setCommandInput('');
              setSearchIndex(0);
            }
            return;
          }

          const player = globalSearchResults[searchIndex];
          if (player) {
            setPlayerOrigin('leaderboard');
            loadPlayer(player.id, player.name, tour);
            setView('player');
            setIsSearchFocused(false);
            setCommandInput('');
            setSearchIndex(0);
          }
          return;
      }
    }

    // Escape handling
    if (key.escape) {
      if (breadcrumbIndex !== null) {
        setBreadcrumbIndex(null);
        setBreadcrumbNavItems(null);
        return;
      }
      if (isSearchFocused) {
        setIsSearchFocused(false);
        setCommandInput('');
        setCommandIndex(0);
        return;
      }
      if (view === 'scorecard') {
        setView('leaderboard');
        setAutoRefresh(false);
        clearScorecard();
        setSelectedRound(1);
        return;
      }
      if (view === 'event-leaderboard') {
        if (eventOrigin === 'schedule') {
          setView('schedule');
          setEventLeaderboard(null);
          setEventIndex(0);
          setPlayerOrigin('leaderboard');
          setEventParentPlayer(null);
          return;
        }

        // Go back to the parent player, but keep the event context so Tab/crumbs can return here.
        setView('player');
        setPlayerOrigin('event');
        setPlayerResultIndex(0);
        if (eventParentPlayer && player?.id !== eventParentPlayer.id) {
          loadPlayer(eventParentPlayer.id, eventParentPlayer.name, tour);
        }
        return;
      }
      if (view === 'player') {
        if (playerOrigin === 'event' && eventLeaderboard) {
          // If we're back on the parent player, Esc exits the event context.
          if (eventParentPlayer && player?.id === eventParentPlayer.id) {
            setView('leaderboard');
            setPlayerOrigin('leaderboard');
            setEventLeaderboard(null);
            setEventIndex(0);
            setEventParentPlayer(null);
            setPlayerResultIndex(0);
            return;
          }

          setView('event-leaderboard');
          setPlayerResultIndex(0);
          return;
        }

        setView('leaderboard');
        clearPlayer();
        setPlayerResultIndex(0);
        setPlayerOrigin('leaderboard');
        return;
      }
      if (view === 'schedule') {
        setView('leaderboard');
        return;
      }
      if (view === 'players') {
        setView('leaderboard');
        setCommandInput('');
        setSearchIndex(0);
        return;
      }
      if (view === 'stats') {
        setView(player ? 'player' : 'leaderboard');
        return;
      }
      if (view === 'stat-leaders') {
        clearStatLeaders();
        setCurrentStatMetric(null);
        setView('stats');
        return;
      }
      return;
    }

    // Player profile navigation
    if (view === 'player' && !isSearchFocused && player?.recentResults) {
      const maxIndex = Math.min(player.recentResults.length - 1, 5);

      if (key.downArrow || input === 'j') {
        setPlayerResultIndex(prev => Math.min(prev + 1, maxIndex));
        return;
      }
      if (key.upArrow || input === 'k') {
        setPlayerResultIndex(prev => Math.max(prev - 1, 0));
        return;
      }
      if (key.return) {
        const result = player.recentResults[playerResultIndex];
        if (result) {
          setEventLoading(true);
          setEventOrigin('player');
          setEventParentPlayer({ id: player.id, name: player.name });
          setPlayerOrigin('leaderboard');
          setView('event-leaderboard');
          fetchEventLeaderboard(result.tournamentId, result.tournamentName, result.date, tour)
            .then(lb => {
              setEventLeaderboard(lb);
              setEventLoading(false);
              setEventIndex(0);
            });
        }
        return;
      }
    }

    // Event leaderboard navigation
    if (view === 'event-leaderboard' && !isSearchFocused && eventLeaderboard) {
      const maxIndex = eventLeaderboard.entries.length - 1;

      if (key.downArrow || input === 'j') {
        setEventIndex(prev => Math.min(prev + 1, maxIndex));
        return;
      }
      if (key.upArrow || input === 'k') {
        setEventIndex(prev => Math.max(prev - 1, 0));
        return;
      }
      if (key.return) {
        const entry = eventLeaderboard.entries[eventIndex];
        if (entry) {
          setPlayerOrigin('event');
          loadPlayer(entry.player.id, entry.player.name, tour);
          setView('player');
          setPlayerResultIndex(0);
        }
        return;
      }
    }

    // Scorecard view navigation
    if (view === 'scorecard' && !isSearchFocused) {
      if (input === '1' || input === '2' || input === '3' || input === '4') {
        setSelectedRound(parseInt(input, 10));
        return;
      }
    }

    // Stats view navigation
    if (view === 'stats' && !isSearchFocused) {
      const maxIndex = statsMetrics.length - 1;

      if (input === 'o' && breadcrumbIndex === null && player?.rankings) {
        const selectedName = statsMetrics[statsMetricIndex]?.name;
        const nextMode: StatsSortMode = statsSortMode === 'rank' ? 'name' : 'rank';
        const nextSorted = sortStatsMetrics(filterRankingMetrics(player.rankings), nextMode);
        const nextIndex = selectedName ? nextSorted.findIndex(m => m.name === selectedName) : -1;

        setStatsSortMode(nextMode);
        setStatsMetricIndex(nextIndex >= 0 ? nextIndex : 0);
        return;
      }

      if (breadcrumbIndex === null && (key.downArrow || input === 'j') && maxIndex >= 0) {
        setStatsMetricIndex(prev => Math.min(prev + 1, maxIndex));
        return;
      }
      if (breadcrumbIndex === null && (key.upArrow || input === 'k') && maxIndex >= 0) {
        setStatsMetricIndex(prev => Math.max(prev - 1, 0));
        return;
      }

      if (breadcrumbIndex === null && key.return) {
        const metric = statsMetrics[statsMetricIndex];
        if (metric) {
          setCurrentStatMetric(metric);
          setStatLeadersIndex(0);
          loadStatLeaders(metric.name, tour);
          setView('stat-leaders');
        }
        return;
      }
    }

    // Stat leaders view navigation
    if (view === 'stat-leaders' && !isSearchFocused) {
      const maxIndex = statLeaders.length - 1;

      if ((key.downArrow || input === 'j') && maxIndex >= 0) {
        setStatLeadersIndex(prev => Math.min(prev + 1, maxIndex));
        return;
      }
      if ((key.upArrow || input === 'k') && maxIndex >= 0) {
        setStatLeadersIndex(prev => Math.max(prev - 1, 0));
        return;
      }
      if (key.return && statLeaders.length > 0) {
        const leader = statLeaders[statLeadersIndex];
        if (leader) {
          loadPlayer(leader.playerId, leader.playerName, tour);
          setView('player');
          setPlayerOrigin('leaderboard');
          setPlayerResultIndex(0);
        }
        return;
      }
    }

    // Jump to stats from player profile
    if (input === 't' && !isSearchFocused && view === 'player') {
      setView('stats');
      return;
    }

    // Open scorecard from leaderboard or event leaderboard
    if (input === 'c' && !isSearchFocused && (view === 'leaderboard' || view === 'event-leaderboard')) {
      const currentLeaderboard = view === 'leaderboard' ? leaderboard : eventLeaderboard;
      const currentIndex = view === 'leaderboard' ? leaderboardIndex : eventIndex;

      if (currentLeaderboard) {
        const entry = currentLeaderboard.entries[currentIndex];
        // Only open scorecard if data is available
        if (entry && entry.scorecardAvailable !== false) {
          loadScorecard(
            currentLeaderboard.tournament.id,
            entry.player.id,
            entry.player.name,
            tour
          );
          setSelectedRound(currentLeaderboard.round || 1);
          setAutoRefresh(true);
          setView('scorecard');
        }
      }
      return;
    }

    // Refresh
    if (input === 'r' && !isSearchFocused && view === 'leaderboard') {
      refresh();
      return;
    }

    // Tab navigation
    if (key.tab && !isSearchFocused) {
      // On leaderboard, Tab cycles tours
      if (view === 'leaderboard') {
        cycleTour();
        return;
      }
      // On other views, Tab cycles through breadcrumb items
      const model = breadcrumbIndex === null ? breadcrumbModel : (breadcrumbNavItems ?? breadcrumbModel);
      if (model.length > 1) {
        if (breadcrumbIndex === null) {
          setBreadcrumbNavItems(breadcrumbModel);
          setBreadcrumbIndex(0);
          return;
        }

        setBreadcrumbIndex(prev => {
          if (prev === null) return 0;
          return (prev + 1) % model.length;
        });
        return;
      }
    }

    // Enter on breadcrumb selection navigates
    if (key.return && !isSearchFocused && breadcrumbIndex !== null) {
      const model = breadcrumbNavItems ?? breadcrumbModel;
      const item = model[breadcrumbIndex];
      navigateToTarget(item?.target);
      setBreadcrumbIndex(null);
      setBreadcrumbNavItems(null);
      return;
    }

    // Leaderboard navigation
    if (view === 'leaderboard' && !isSearchFocused && leaderboard) {
      const maxIndex = leaderboard.entries.length - 1;

      if (key.downArrow || input === 'j') {
        setLeaderboardIndex(prev => Math.min(prev + 1, maxIndex));
        return;
      }
      if (key.upArrow || input === 'k') {
        setLeaderboardIndex(prev => Math.max(prev - 1, 0));
        return;
      }
      if (key.return) {
        const entry = leaderboard.entries[leaderboardIndex];
        if (entry) {
          setPlayerOrigin('leaderboard');
          loadPlayer(entry.player.id, entry.player.name, tour);
          setView('player');
        }
        return;
      }
    }

    // Schedule navigation
    if (view === 'schedule' && !isSearchFocused && scheduleTournaments.length > 0) {
      const maxIndex = scheduleTournaments.length - 1;

      if (input === 'o') {
        setScheduleSortMode(prev => (prev === 'date' ? 'status' : 'date'));
        return;
      }

      if (key.return) {
        const tournament = scheduleTournaments[scheduleIndex];
        if (tournament) {
          setScheduleSelectedId(tournament.id);
          setEventOrigin('schedule');
          setEventParentPlayer(null);
          setEventLoading(true);
          setView('event-leaderboard');
          fetchEventLeaderboard(tournament.id, tournament.name, tournament.date, tour)
            .then(lb => {
              setEventLeaderboard(lb);
              setEventLoading(false);
              setEventIndex(0);
            });
        }
        return;
      }

      if (key.downArrow || input === 'j') {
        const nextIndex = Math.min(scheduleIndex + 1, maxIndex);
        const next = scheduleTournaments[nextIndex];
        if (next) setScheduleSelectedId(next.id);
        return;
      }
      if (key.upArrow || input === 'k') {
        const nextIndex = Math.max(scheduleIndex - 1, 0);
        const next = scheduleTournaments[nextIndex];
        if (next) setScheduleSelectedId(next.id);
        return;
      }
    }
  });

  // Reset indices when tour changes
  useEffect(() => {
    setLeaderboardIndex(0);
    setScheduleSelectedId(null);
  }, [tour]);

  useEffect(() => {
    setStatsMetricIndex(0);
  }, [player?.id]);

  useEffect(() => {
    setStatsMetricIndex(prev => {
      if (statsMetrics.length === 0) return 0;
      return Math.max(0, Math.min(prev, statsMetrics.length - 1));
    });
  }, [statsMetrics.length]);

  // Reset indices when filter changes
  useEffect(() => {
    setCommandIndex(0);
    setSearchIndex(0);
  }, [commandInput]);

  // Reset breadcrumb selection when view changes
  useEffect(() => {
    setBreadcrumbIndex(null);
    setBreadcrumbNavItems(null);
  }, [view]);

  // If the underlying breadcrumb model changes while the user is tabbing, cancel breadcrumb mode.
  useEffect(() => {
    // Always clear any snapshot so Tab can't reuse a stale model.
    setBreadcrumbNavItems(null);
    if (breadcrumbIndex !== null) setBreadcrumbIndex(null);
  }, [player?.id, leaderboard?.tournament?.id, eventLeaderboard?.tournament?.id, view, playerOrigin, eventOrigin]);

  // Show splash screen
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Static items={['header'] as const}>
        {(item) => <Header key={item} />}
      </Static>

      {/* Help overlay */}
      {showHelp && <HelpView />}

      {/* Metric detail overlay */}
      {metricDetail && <MetricDetailModal metric={metricDetail} />}

      {/* Search input */}
      {!showHelp && !metricDetail && (view === 'leaderboard' || view === 'players' || view === 'schedule' || view === 'stats' || isSearchFocused) && (
        <SearchInput
          value={commandInput}
          onChange={handleQueryChange}
          isFocused={isSearchFocused}
          placeholder={searchPlaceholder}
        />
      )}

      {/* Command palette */}
      {isCommandMode && !showHelp && !metricDetail && (
        <CommandPalette
          filter={commandInput}
          selectedIndex={commandIndex}
        />
      )}

      {/* Breadcrumb navigation */}
      {!showHelp && !metricDetail && !isSearchFocused && activeBreadcrumbItems.length > 0 && (
        <Breadcrumb items={activeBreadcrumbItems} selectedIndex={breadcrumbIndex ?? undefined} />
      )}

      {/* Search results */}
      {isSearchMode && !showHelp && !metricDetail && searchContext === 'scheduleTournaments' && (
        <SearchResults
          type="schedule"
          results={scheduleSearchResults}
          selectedIndex={searchIndex}
          query={commandInput}
        />
      )}
      {isSearchMode && !showHelp && !metricDetail && searchContext === 'statsMetrics' && (
        <SearchResults
          type="metrics"
          results={metricSearchResults}
          selectedIndex={searchIndex}
          query={commandInput}
        />
      )}

      {isSearchMode && !showHelp && !metricDetail && searchContext === 'leaderboardPlayers' && hasLeaderboardResults && (
        <SearchResults
          type="leaderboard"
          results={leaderboardSearchResults}
          selectedIndex={searchIndex}
          query={commandInput}
        />
      )}
      {isSearchMode && !showHelp && !metricDetail && searchContext === 'leaderboardPlayers' && !hasLeaderboardResults && (
        <SearchResults
          type="global"
          results={globalSearchResults}
          selectedIndex={searchIndex}
          query={commandInput}
          isLoading={globalSearchLoading}
        />
      )}

      {isSearchMode && !showHelp && !metricDetail && searchContext === 'globalPlayers' && (
        <SearchResults
          type="global"
          results={globalSearchResults}
          selectedIndex={searchIndex}
          query={commandInput}
          isLoading={globalSearchLoading}
        />
      )}

      {/* Leaderboard view */}
      {!isSearchFocused && !showHelp && !metricDetail && view === 'leaderboard' && (
        <Leaderboard
          leaderboard={leaderboard}
          isLoading={leaderboardLoading}
          error={leaderboardError}
          selectedIndex={leaderboardIndex}
          tour={tour}
        />
      )}

      {/* Schedule view */}
      {!isSearchFocused && !showHelp && !metricDetail && view === 'schedule' && (
        <TournamentList
          tournaments={scheduleTournaments}
          isLoading={tournamentsLoading}
          error={tournamentsError}
          selectedIndex={scheduleIndex}
          tour={tour}
        />
      )}

      {/* Players view */}
      {!isSearchFocused && !showHelp && !metricDetail && view === 'players' && (
        <PlayersView isSearchFocused={isSearchFocused} />
      )}

      {/* Player profile view */}
      {!isSearchFocused && !showHelp && !metricDetail && view === 'player' && (
        <PlayerProfile
          player={player}
          isLoading={playerLoading}
          error={playerError}
          selectedIndex={playerResultIndex}
        />
      )}

      {/* Stats view */}
      {!isSearchFocused && !showHelp && !metricDetail && view === 'stats' && (
        <StatsView
          player={player}
          metrics={statsMetrics}
          selectedMetricIndex={statsMetricIndex}
          sortMode={statsSortMode}
        />
      )}

      {/* Stat leaders view */}
      {!isSearchFocused && !showHelp && !metricDetail && view === 'stat-leaders' && (
        <StatLeadersView
          category={statCategory}
          leaders={statLeaders}
          isLoading={statLeadersLoading}
          error={statLeadersError}
          selectedIndex={statLeadersIndex}
          currentPlayerId={player?.id}
          currentPlayerRank={currentStatMetric?.rank}
        />
      )}

      {/* Event leaderboard view (from player profile drill-down) */}
      {!isSearchFocused && !showHelp && !metricDetail && view === 'event-leaderboard' && (
        <Leaderboard
          leaderboard={eventLeaderboard}
          isLoading={eventLoading}
          error={null}
          selectedIndex={eventIndex}
          tour={tour}
        />
      )}

      {/* Scorecard view */}
      {!isSearchFocused && !showHelp && !metricDetail && view === 'scorecard' && (
        <ScorecardDetail
          scorecard={scorecard}
          isLoading={scorecardLoading}
          error={scorecardError}
          selectedRound={selectedRound}
        />
      )}

      {/* Status bar */}
      {!showHelp && !metricDetail && (
        <StatusBar
          view={view}
          tour={tour}
          isSearchFocused={isSearchFocused}
          isCommandMode={isCommandMode}
          isSearchMode={isSearchMode}
          hasBreadcrumbs={breadcrumbModel.length > 1}
          scorecardAvailable={
            view === 'leaderboard' 
              ? leaderboard?.entries[leaderboardIndex]?.scorecardAvailable
              : view === 'event-leaderboard'
              ? eventLeaderboard?.entries[eventIndex]?.scorecardAvailable
              : true
          }
          activeTours={activeTours}
        />
      )}
    </Box>
  );
}
