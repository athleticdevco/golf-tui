import React from 'react';
import { Box, Text } from 'ink';
import type { SeasonSummary, SeasonResults } from '../api/types.js';
import { Spinner } from './Spinner.js';
import { formatDate } from '../utils/format.js';

interface SeasonResultsViewProps {
  playerName: string;
  season: SeasonSummary;
  results: SeasonResults | null;
  isLoading: boolean;
  selectedIndex: number;
}

const VISIBLE_ROWS = 15;

function formatPosition(pos: string): string {
  if (!pos || pos === '-') return '-';
  if (pos === 'CUT') return 'CUT';
  if (pos === 'WD') return 'WD';
  if (pos === 'DQ') return 'DQ';
  return pos;
}

function getPositionColor(pos: string): string {
  if (pos === '1') return 'yellow';
  if (pos === 'CUT' || pos === 'WD' || pos === 'DQ') return 'gray';
  const num = parseInt(pos.replace('T', ''), 10);
  if (!isNaN(num) && num <= 10) return 'green';
  return 'white';
}

export function SeasonResultsView({
  playerName,
  season,
  results,
  isLoading,
  selectedIndex,
}: SeasonResultsViewProps) {
  if (isLoading) {
    return (
      <Box justifyContent="center" marginY={1}>
        <Spinner type="schedule" label={`Loading ${season.year} season results...`} />
      </Box>
    );
  }

  const entries = results?.results || [];

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="cyan">{playerName}</Text>
        <Text dimColor>{season.year} Season</Text>
      </Box>

      {/* Season summary */}
      <Box flexDirection="column" marginBottom={1}>
        <Text dimColor>{'─'.repeat(55)}</Text>
        <Box flexDirection="row" gap={4}>
          <Box>
            <Text dimColor>Events: </Text>
            <Text bold>{season.events}</Text>
          </Box>
          {season.wins > 0 && (
            <Box>
              <Text dimColor>Wins: </Text>
              <Text bold color="yellow">{season.wins}</Text>
            </Box>
          )}
          <Box>
            <Text dimColor>Top 10s: </Text>
            <Text bold>{season.topTens}</Text>
          </Box>
          <Box>
            <Text dimColor>Cuts: </Text>
            <Text bold>{season.cutsMade}</Text>
          </Box>
          {season.scoringAvg && (
            <Box>
              <Text dimColor>Avg: </Text>
              <Text bold>{season.scoringAvg}</Text>
            </Box>
          )}
          {season.earnings && (
            <Box>
              <Text dimColor>Earnings: </Text>
              <Text bold color="green">{season.earnings}</Text>
            </Box>
          )}
        </Box>
      </Box>

      {/* Results list */}
      {entries.length > 0 && (
        <Box flexDirection="column">
          <Box>
            <Text dimColor>{'  '}</Text>
            <Text dimColor>{'Date'.padEnd(9)}</Text>
            <Text dimColor>{'Pos'.padEnd(6)}</Text>
            <Text dimColor>{'Score'.padEnd(7)}</Text>
            <Text dimColor>Tournament</Text>
          </Box>
          <Text dimColor>{'─'.repeat(55)}</Text>
          {(() => {
            const total = entries.length;
            let startIndex = 0;
            if (selectedIndex >= VISIBLE_ROWS) {
              startIndex = selectedIndex - VISIBLE_ROWS + 1;
            }
            const endIndex = Math.min(startIndex + VISIBLE_ROWS, total);
            const visible = entries.slice(startIndex, endIndex);

            return (
              <>
                {visible.map((result, i) => {
                  const absIndex = startIndex + i;
                  const isSelected = absIndex === selectedIndex;
                  const pos = formatPosition(result.position);
                  const posColor = getPositionColor(pos);
                  return (
                    <Box key={absIndex}>
                      <Text color={isSelected ? 'cyan' : 'white'}>{isSelected ? '> ' : '  '}</Text>
                      <Text dimColor={!isSelected}>{formatDate(result.date).padEnd(9)}</Text>
                      <Text color={posColor} bold={isSelected}>{pos.padEnd(6)}</Text>
                      <Text bold={isSelected}>{(result.score || '-').padEnd(7)}</Text>
                      <Text color={isSelected ? 'white' : 'gray'}>{result.tournamentName}</Text>
                    </Box>
                  );
                })}
                {total > VISIBLE_ROWS && (
                  <Box marginTop={1}>
                    <Text dimColor>
                      Showing {startIndex + 1}-{endIndex} of {total} events
                      {selectedIndex < total - 1 && ' (j/↓ for more)'}
                    </Text>
                  </Box>
                )}
              </>
            );
          })()}
        </Box>
      )}

      {entries.length === 0 && !isLoading && (
        <Box marginY={1}>
          <Text color="yellow">No tournament results found for {season.year}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>Esc: back to player profile</Text>
      </Box>
    </Box>
  );
}
