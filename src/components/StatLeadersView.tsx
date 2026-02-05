import React from 'react';
import { Box, Text } from 'ink';
import type { StatCategory, StatLeader } from '../api/stats.js';
import { Spinner } from './Spinner.js';

interface StatLeadersViewProps {
  category: StatCategory | null;
  leaders: StatLeader[];
  isLoading: boolean;
  error: string | null;
  selectedIndex: number;
  currentPlayerId?: string;
  currentPlayerRank?: number;
}

const VISIBLE_ROWS = 12;

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + '…';
}

export function StatLeadersView({
  category,
  leaders,
  isLoading,
  error,
  selectedIndex,
  currentPlayerId,
  currentPlayerRank,
}: StatLeadersViewProps) {
  if (isLoading) {
    return (
      <Box justifyContent="center" marginY={1}>
        <Spinner type="leaderboard" label="Loading stat leaders..." />
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" marginY={1}>
        <Text color="red">{error}</Text>
        <Text dimColor>This stat category may not have a tour-wide leaderboard.</Text>
      </Box>
    );
  }

  if (!category || leaders.length === 0) {
    return (
      <Box marginY={1}>
        <Text color="yellow">No leaders data available for this stat</Text>
      </Box>
    );
  }

  // Calculate scroll window
  const totalLeaders = leaders.length;
  let startIndex = 0;
  if (selectedIndex >= VISIBLE_ROWS) {
    startIndex = selectedIndex - VISIBLE_ROWS + 1;
  }
  const endIndex = Math.min(startIndex + VISIBLE_ROWS, totalLeaders);
  const visibleLeaders = leaders.slice(startIndex, endIndex);

  // Find if current player is in the leaders list
  const currentPlayerIndex = currentPlayerId
    ? leaders.findIndex(l => l.playerId === currentPlayerId)
    : -1;

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="cyan">{category.displayName}</Text>
        <Text dimColor>Tour Leaders - Top {totalLeaders}</Text>
      </Box>

      {/* Column headers */}
      <Box>
        <Text dimColor>{'RANK'.padEnd(6)}</Text>
        <Text dimColor>{'PLAYER'.padEnd(28)}</Text>
        <Text dimColor>{'VALUE'.padStart(12)}</Text>
      </Box>
      <Text dimColor>{'─'.repeat(48)}</Text>

      {/* Leaders list */}
      {visibleLeaders.map((leader, index) => {
        const absoluteIndex = startIndex + index;
        const isSelected = absoluteIndex === selectedIndex;
        const isCurrentPlayer = leader.playerId === currentPlayerId;

        return (
          <Box key={leader.playerId}>
            <Text color={isSelected ? 'cyan' : 'white'}>
              {isSelected ? '> ' : '  '}
            </Text>
            <Text color={isCurrentPlayer ? 'yellow' : isSelected ? 'cyan' : 'white'}>
              {`#${leader.rank}`.padEnd(5)}
            </Text>
            <Text color={isCurrentPlayer ? 'yellow' : isSelected ? 'cyan' : 'white'} bold={isCurrentPlayer}>
              {truncate(leader.playerName, 26).padEnd(27)}
            </Text>
            <Text color={isSelected ? 'cyan' : 'white'}>
              {leader.displayValue.padStart(12)}
            </Text>
            {isCurrentPlayer && <Text color="yellow"> ◄</Text>}
          </Box>
        );
      })}

      {/* Current player indicator if not in visible range */}
      {currentPlayerId && currentPlayerIndex >= 0 && (currentPlayerIndex < startIndex || currentPlayerIndex >= endIndex) && (
        <Box marginTop={1}>
          <Text dimColor>
            Your player: #{leaders[currentPlayerIndex].rank} {leaders[currentPlayerIndex].playerName}
          </Text>
        </Box>
      )}

      {/* Show player rank if outside top 50 */}
      {currentPlayerId && currentPlayerIndex === -1 && currentPlayerRank && currentPlayerRank > 0 && (
        <Box marginTop={1}>
          <Text dimColor>
            Your player rank: #{currentPlayerRank} (outside top {totalLeaders})
          </Text>
        </Box>
      )}

      {/* Scroll indicator */}
      <Box marginTop={1}>
        <Text dimColor>
          Showing {startIndex + 1}-{endIndex} of {totalLeaders} leaders
          {selectedIndex < totalLeaders - 1 && ' (j/↓ for more)'}
        </Text>
      </Box>

      {/* Help text */}
      <Box marginTop={1}>
        <Text dimColor>Enter: view player profile • Esc: back to stats</Text>
      </Box>
    </Box>
  );
}
