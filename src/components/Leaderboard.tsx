import React from 'react';
import { Box, Text } from 'ink';
import type { Leaderboard as LeaderboardType, Tour } from '../api/types.js';
import { PlayerCard } from './PlayerCard.js';
import { Spinner } from './Spinner.js';
import { formatDateRange } from '../utils/format.js';

interface LeaderboardProps {
  leaderboard: LeaderboardType | null;
  isLoading: boolean;
  error: string | null;
  selectedIndex: number;
  tour: Tour;
}

const TOUR_NAMES: Record<Tour, string> = {
  pga: 'PGA Tour',
  lpga: 'LPGA Tour',
  eur: 'DP World Tour',
  'champions-tour': 'Champions Tour',
};

const VISIBLE_ROWS = 15;

export function Leaderboard({ leaderboard, isLoading, error, selectedIndex, tour }: LeaderboardProps) {
  if (isLoading && !leaderboard) {
    return (
      <Box justifyContent="center" marginY={1}>
        <Spinner type="leaderboard" label="Loading leaderboard..." />
      </Box>
    );
  }

  if (error && !leaderboard) {
    return (
      <Box marginY={1}>
        <Text color="red">Error: {error}</Text>
      </Box>
    );
  }

  if (!leaderboard) {
    return (
      <Box marginY={1}>
        <Text color="yellow">No active tournament on {TOUR_NAMES[tour]}</Text>
      </Box>
    );
  }

  const { tournament, entries, round } = leaderboard;
  const showRounds = entries.some(e => e.rounds.length > 0);

  // Calculate scroll window
  const totalEntries = entries.length;
  let startIndex = 0;
  if (selectedIndex >= VISIBLE_ROWS) {
    startIndex = selectedIndex - VISIBLE_ROWS + 1;
  }
  const endIndex = Math.min(startIndex + VISIBLE_ROWS, totalEntries);
  const visibleEntries = entries.slice(startIndex, endIndex);

  return (
    <Box flexDirection="column">
      {/* Tournament Info */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="cyan">{tournament.name}</Text>
        {(tournament.venue || tournament.location) && (
          <Box>
            {tournament.venue && <Text dimColor>{tournament.venue}</Text>}
            {tournament.venue && tournament.location && <Text dimColor> - </Text>}
            {tournament.location && <Text dimColor>{tournament.location}</Text>}
          </Box>
        )}
        <Box>
          <Text dimColor>{formatDateRange(tournament.date, tournament.endDate)}</Text>
          {tournament.purse && <Text dimColor> | {tournament.purse}</Text>}
          <Text dimColor> | Round {round}</Text>
          {tournament.status === 'in' && <Text color="green"> LIVE</Text>}
          {tournament.status === 'post' && <Text color="yellow"> FINAL</Text>}
        </Box>
      </Box>

      {/* Header Row */}
      <Box>
        <Text dimColor> </Text>
        <Text dimColor>{'POS'.padStart(4)}</Text>
        <Text dimColor> </Text>
        <Text dimColor>{'PLAYER'.padEnd(24)}</Text>
        <Text dimColor>{'TOTAL'.padStart(6)}</Text>
        <Text dimColor>{'TODAY'.padStart(7)}</Text>
        <Text dimColor>{'THRU'.padStart(5)}</Text>
        {showRounds && (
          <>
            <Text dimColor> │</Text>
            <Text dimColor>{'R1'.padStart(5)}</Text>
            <Text dimColor>{'R2'.padStart(5)}</Text>
            <Text dimColor>{'R3'.padStart(5)}</Text>
            <Text dimColor>{'R4'.padStart(5)}</Text>
          </>
        )}
      </Box>
      <Text dimColor>
        {'─'.repeat(showRounds ? 69 : 49)}
      </Text>

      {/* Player Rows */}
      {visibleEntries.map((entry, index) => {
        const prevEntry = index > 0 ? visibleEntries[index - 1] : null;
        const prevIsCut = prevEntry?.status && ['cut', 'wd', 'dq'].includes(prevEntry.status);
        const currIsCut = entry.status && ['cut', 'wd', 'dq'].includes(entry.status);
        const showCutLine = currIsCut && prevEntry && !prevIsCut;

        return (
          <React.Fragment key={entry.player.id}>
            {showCutLine && (
              <Box justifyContent="center">
                <Text dimColor>──────────────── CUT ────────────────</Text>
              </Box>
            )}
            <PlayerCard
              entry={entry}
              isSelected={startIndex + index === selectedIndex}
              showRounds={showRounds}
            />
          </React.Fragment>
        );
      })}

      {/* Scroll indicator */}
      <Box marginTop={1}>
        <Text dimColor>
          Showing {startIndex + 1}-{endIndex} of {totalEntries} players
          {selectedIndex < totalEntries - 1 && ' (j/↓ for more)'}
        </Text>
      </Box>
    </Box>
  );
}
