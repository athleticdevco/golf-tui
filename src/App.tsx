import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Box, Text, useApp, useInput, Static } from 'ink';
import type { View, Tour, LeaderboardEntry } from './api/types.js';
import { fetchEventLeaderboard } from './api/leaderboard.js';
import { useLeaderboard, useTournaments, usePlayerProfile, useGlobalSearch, useScorecard, useActiveTours } from './hooks/index.js';
import {
  Header,
  StatusBar,
  SearchInput,
  SearchResults,
  Leaderboard,
  PlayerProfile,
  TournamentList,
  CommandPalette,
  COMMANDS,
  filterCommands,
  HelpView,
  SplashScreen,
  ScorecardDetail,
  Breadcrumb,
} from './components/index.js';



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
  const isCommandMode = isSearchFocused && commandInput.startsWith('/');
  const isSearchMode = isSearchFocused && !commandInput.startsWith('/') && commandInput.length > 0;

  // Navigation state
  const [leaderboardIndex, setLeaderboardIndex] = useState(0);
  const [scheduleIndex, setScheduleIndex] = useState(0);
  const [playerResultIndex, setPlayerResultIndex] = useState(0);

  // Event leaderboard state (for drilling into a tournament from player profile)
  const [eventLeaderboard, setEventLeaderboard] = useState<typeof leaderboard>(null);
  const [eventLoading, setEventLoading] = useState(false);
  const [eventIndex, setEventIndex] = useState(0);

  // Scorecard state
  const [selectedRound, setSelectedRound] = useState(1);

  // Breadcrumb navigation state
  const [breadcrumbIndex, setBreadcrumbIndex] = useState<number | null>(null);

  // Data hooks
  const { activeTours } = useActiveTours();
  const { leaderboard, isLoading: leaderboardLoading, error: leaderboardError, refresh } = useLeaderboard(tour);
  const { tournaments, isLoading: tournamentsLoading, error: tournamentsError } = useTournaments(tour);
  const { player, isLoading: playerLoading, error: playerError, loadPlayer, clear: clearPlayer } = usePlayerProfile();
  const { scorecard, isLoading: scorecardLoading, error: scorecardError, loadScorecard, clear: clearScorecard, setAutoRefresh } = useScorecard();

  // Get filtered commands
  const filteredCommands = filterCommands(COMMANDS, commandInput);

  // Get leaderboard search results (players in current tournament)
  const leaderboardSearchResults = useMemo(() => {
    if (!isSearchMode || !leaderboard) return [];
    return searchPlayers(leaderboard.entries, commandInput);
  }, [isSearchMode, leaderboard, commandInput]);

  // Get global search results (all players)
  const { results: globalSearchResults, isLoading: globalSearchLoading } = useGlobalSearch(
    isSearchMode ? commandInput : ''
  );

  // Combine: show leaderboard results first, then global
  const hasLeaderboardResults = leaderboardSearchResults.length > 0;

  // Build breadcrumb items based on current view
  const breadcrumbItems = useMemo(() => {
    switch (view) {
      case 'leaderboard':
        return leaderboard ? [leaderboard.tournament.name] : [];
      case 'player':
        return leaderboard && player
          ? [leaderboard.tournament.name, player.name]
          : player
          ? [player.name]
          : [];
      case 'event-leaderboard':
        return eventLeaderboard && player
          ? [player.name, eventLeaderboard.tournament.name]
          : [];
      case 'scorecard':
        return leaderboard && scorecard
          ? [leaderboard.tournament.name, scorecard.playerName, 'Scorecard']
          : scorecard
          ? [scorecard.playerName, 'Scorecard']
          : [];
      case 'schedule':
        return ['Schedule'];
      default:
        return [];
    }
  }, [view, leaderboard, player, eventLeaderboard, scorecard]);

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

  // Navigate to breadcrumb item by index
  const navigateToBreadcrumb = useCallback((index: number) => {
    const isLast = index === breadcrumbItems.length - 1;
    if (isLast) {
      setBreadcrumbIndex(null);
      return;
    }

    // Navigate based on view and index
    switch (view) {
      case 'player':
        if (index === 0) {
          setView('leaderboard');
          clearPlayer();
          setPlayerResultIndex(0);
        }
        break;
      case 'scorecard':
        if (index === 0) {
          setView('leaderboard');
          setAutoRefresh(false);
          clearScorecard();
          setSelectedRound(1);
        } else if (index === 1) {
          // Go to player - need to load player from scorecard
          if (scorecard) {
            // Find the player in leaderboard entries
            const entry = leaderboard?.entries.find(e => e.player.name === scorecard.playerName);
            if (entry) {
              loadPlayer(entry.player.id, entry.player.name, tour);
            }
          }
          setView('player');
          setAutoRefresh(false);
          clearScorecard();
          setSelectedRound(1);
        }
        break;
      case 'event-leaderboard':
        if (index === 0) {
          // Go back to player view
          setView('player');
          setEventLeaderboard(null);
          setEventIndex(0);
        }
        // index === 1 is the current event, stay here
        break;
    }
    setBreadcrumbIndex(null);
  }, [view, breadcrumbItems.length, clearPlayer, clearScorecard, setAutoRefresh, scorecard, leaderboard, loadPlayer]);

  // Keyboard input
  useInput((input, key) => {
    // Close help on any key
    if (showHelp) {
      setShowHelp(false);
      return;
    }

    // Global quit
    if (input === 'q' && !isSearchFocused) {
      exit();
      return;
    }

    // Open search/command mode
    if (input === '/' && !isSearchFocused) {
      setIsSearchFocused(true);
      setCommandInput('/');
      return;
    }

    // Open search mode (s key)
    if (input === 's' && !isSearchFocused && view === 'leaderboard') {
      setIsSearchFocused(true);
      setCommandInput('');
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
      const totalResults = hasLeaderboardResults 
        ? leaderboardSearchResults.length 
        : globalSearchResults.length;
      
      if (totalResults > 0) {
        if (key.downArrow) {
          setSearchIndex(prev => Math.min(prev + 1, totalResults - 1));
          return;
        }
        if (key.upArrow) {
          setSearchIndex(prev => Math.max(prev - 1, 0));
          return;
        }
        if (key.return) {
          if (hasLeaderboardResults) {
            const entry = leaderboardSearchResults[searchIndex];
            if (entry) {
              loadPlayer(entry.player.id, entry.player.name, tour);
              setView('player');
              setIsSearchFocused(false);
              setCommandInput('');
              setSearchIndex(0);
            }
          } else {
            const player = globalSearchResults[searchIndex];
            if (player) {
              loadPlayer(player.id, player.name, tour);
              setView('player');
              setIsSearchFocused(false);
              setCommandInput('');
              setSearchIndex(0);
            }
          }
          return;
        }
      }
    }

    // Escape handling
    if (key.escape) {
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
        setView('player');
        setEventLeaderboard(null);
        setEventIndex(0);
        return;
      }
      if (view === 'player') {
        setView('leaderboard');
        clearPlayer();
        setPlayerResultIndex(0);
        return;
      }
      if (view === 'schedule') {
        setView('leaderboard');
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
      if (breadcrumbItems.length > 1) {
        setBreadcrumbIndex(prev => {
          if (prev === null) return 0;
          return (prev + 1) % breadcrumbItems.length;
        });
        return;
      }
    }

    // Enter on breadcrumb selection navigates
    if (key.return && !isSearchFocused && breadcrumbIndex !== null) {
      navigateToBreadcrumb(breadcrumbIndex);
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
          loadPlayer(entry.player.id, entry.player.name, tour);
          setView('player');
        }
        return;
      }
    }

    // Schedule navigation
    if (view === 'schedule' && !isSearchFocused && tournaments.length > 0) {
      const maxIndex = tournaments.length - 1;

      if (key.downArrow || input === 'j') {
        setScheduleIndex(prev => Math.min(prev + 1, maxIndex));
        return;
      }
      if (key.upArrow || input === 'k') {
        setScheduleIndex(prev => Math.max(prev - 1, 0));
        return;
      }
    }
  });

  // Reset indices when tour changes
  useEffect(() => {
    setLeaderboardIndex(0);
  }, [tour]);

  // Reset indices when filter changes
  useEffect(() => {
    setCommandIndex(0);
    setSearchIndex(0);
  }, [commandInput]);

  // Reset breadcrumb selection when view changes
  useEffect(() => {
    setBreadcrumbIndex(null);
  }, [view]);

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

      {/* Search input */}
      {!showHelp && (view === 'leaderboard' || isSearchFocused) && (
        <SearchInput
          value={commandInput}
          onChange={handleQueryChange}
          isFocused={isSearchFocused}
          placeholder="Search players or type / for commands..."
        />
      )}

      {/* Command palette */}
      {isCommandMode && !showHelp && (
        <CommandPalette
          filter={commandInput}
          selectedIndex={commandIndex}
        />
      )}

      {/* Breadcrumb navigation */}
      {!showHelp && !isSearchFocused && breadcrumbItems.length > 0 && (
        <Breadcrumb items={breadcrumbItems} selectedIndex={breadcrumbIndex ?? undefined} />
      )}

      {/* Search results */}
      {isSearchMode && !showHelp && hasLeaderboardResults && (
        <SearchResults
          type="leaderboard"
          results={leaderboardSearchResults}
          selectedIndex={searchIndex}
          query={commandInput}
        />
      )}
      {isSearchMode && !showHelp && !hasLeaderboardResults && (
        <SearchResults
          type="global"
          results={globalSearchResults}
          selectedIndex={searchIndex}
          query={commandInput}
          isLoading={globalSearchLoading}
        />
      )}

      {/* Leaderboard view */}
      {!isSearchFocused && !showHelp && view === 'leaderboard' && (
        <Leaderboard
          leaderboard={leaderboard}
          isLoading={leaderboardLoading}
          error={leaderboardError}
          selectedIndex={leaderboardIndex}
          tour={tour}
        />
      )}

      {/* Schedule view */}
      {!isSearchFocused && !showHelp && view === 'schedule' && (
        <TournamentList
          tournaments={tournaments}
          isLoading={tournamentsLoading}
          error={tournamentsError}
          selectedIndex={scheduleIndex}
          tour={tour}
        />
      )}

      {/* Player profile view */}
      {!showHelp && view === 'player' && (
        <PlayerProfile
          player={player}
          isLoading={playerLoading}
          error={playerError}
          selectedIndex={playerResultIndex}
        />
      )}

      {/* Event leaderboard view (from player profile drill-down) */}
      {!showHelp && view === 'event-leaderboard' && (
        <Leaderboard
          leaderboard={eventLeaderboard}
          isLoading={eventLoading}
          error={null}
          selectedIndex={eventIndex}
          tour="pga"
        />
      )}

      {/* Scorecard view */}
      {!showHelp && view === 'scorecard' && (
        <ScorecardDetail
          scorecard={scorecard}
          isLoading={scorecardLoading}
          error={scorecardError}
          selectedRound={selectedRound}
        />
      )}

      {/* Status bar */}
      {!showHelp && (
        <StatusBar
          view={view}
          tour={tour}
          isSearchFocused={isSearchFocused}
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
