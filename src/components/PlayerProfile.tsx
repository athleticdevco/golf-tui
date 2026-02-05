import React from 'react';
import { Box, Text } from 'ink';
import type { PlayerProfile as PlayerProfileType, PlayerStat } from '../api/types.js';
import { Spinner } from './Spinner.js';
import { formatDate } from '../utils/format.js';

function TigerGoatArt() {
  return (
    <Box flexDirection="column" marginY={1}>
      <Text color="white">⠀⠀⠀⠀⠀⠀⠀⠠⠴⠶⠾⠿⠿⠿⢶⣦⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀</Text>
      <Text color="white">⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⢿⣿⣆⠐⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀</Text>
      <Text color="white">⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠿⠿⠆⠹⠦⠀⠀⠀⠀⠀⠀⠀⠀</Text>
      <Text color="white">⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠛⠻⢿⣿⡆⢹⡿⠻⢿⣿⣿⣷⠈⠿⠛⠁⠀⠀</Text>
      <Text color="white">⠀⠀⠀⠀⠀⠀⠀⠀⢀⣀⣤⣴⣾⣷⣤⣉⣠⣾⣷⣦⣼⣿⣿⣿⣧⠀⠀⠀⠀⠀</Text>
      <Text color="white">⠀⣶⣶⣶⣶⣶⣶⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣇⠀⠀⠀⠀</Text>
      <Text color="white">⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡄⠀⠀⠀</Text>
      <Text color="white">⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣛⠻⢧⣘⡷⠀⠀⠀</Text>
      <Text color="white">⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠋⠀⠀⣉⠛⠿⣷⣦⣌⠁⠀⠀⠀</Text>
      <Text color="white">⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠋⣠⠘⠀⠀⢹⣿⣶⣶⠀⠀⠀⠀⠀⠀</Text>
      <Text color="white">⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠋⠀⢺⣿⠀⠀⠀⠘⣿⣿⡟⠀⠀⠀⠀⠀⠀</Text>
      <Text color="white">⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠋⠀⠀⠀⠀⠁⠀⠀⠀⠀⠻⡟⠃⠀⠀⠀⠀⠀⠀</Text>
      <Text color="white">⠀⠛⠛⠛⠛⠛⠛⠛⠛⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀</Text>
      <Box marginTop={1}>
        <Text bold color="yellow">G.O.A.T.</Text>
        <Text dimColor> - Greatest of All Time</Text>
      </Box>
    </Box>
  );
}

interface PlayerProfileProps {
  player: PlayerProfileType | null;
  isLoading: boolean;
  error: string | null;
  selectedIndex?: number;
  onSelectResult?: (tournamentId: string, tournamentName: string, date: string) => void;
}

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

interface StatRowProps {
  label: string;
  stat: PlayerStat | undefined;
  suffix?: string;
}

function StatRow({ label, stat, suffix = '' }: StatRowProps) {
  if (!stat || stat.value === '0' || stat.value === '0.0') return null;
  return (
    <Box>
      <Text dimColor>{label.padEnd(20)}</Text>
      <Text bold>{stat.value}{suffix}</Text>
      {stat.rank !== undefined && stat.rank !== null && stat.rank > 0 && (
        <Text dimColor> (#{stat.rank})</Text>
      )}
    </Box>
  );
}

export function PlayerProfile({ player, isLoading, error, selectedIndex = 0 }: PlayerProfileProps) {
  if (isLoading) {
    return (
      <Box justifyContent="center" marginY={1}>
        <Spinner type="player" label="Loading player profile..." />
      </Box>
    );
  }

  if (error) {
    return (
      <Box marginY={1}>
        <Text color="red">Error: {error}</Text>
      </Box>
    );
  }

  if (!player) {
    return (
      <Box marginY={1}>
        <Text color="yellow">Player not found</Text>
      </Box>
    );
  }

  const hasSeasonStats = player.events || player.cutsMade || player.wins || player.topTens;
  const hasPerformanceStats = player.scoringAvg || player.drivingDistance || 
    player.drivingAccuracy || player.greensInReg || player.puttsPerGir || 
    player.birdiesPerRound || player.sandSaves;

  return (
    <Box flexDirection="column">
      {/* Player Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">{player.name}</Text>
      </Box>

      {/* Season Summary */}
      {hasSeasonStats && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="green">Season Stats</Text>
          <Text dimColor>{'─'.repeat(40)}</Text>
          <Box flexDirection="row" gap={6}>
            {player.events !== undefined && (
              <Box>
                <Text dimColor>Events: </Text>
                <Text bold>{player.events}</Text>
              </Box>
            )}
            {player.cutsMade !== undefined && (
              <Box>
                <Text dimColor>Cuts: </Text>
                <Text bold>{player.cutsMade}</Text>
              </Box>
            )}
            {player.wins !== undefined && player.wins > 0 && (
              <Box>
                <Text dimColor>Wins: </Text>
                <Text bold color="yellow">{player.wins}</Text>
              </Box>
            )}
            {player.topTens !== undefined && player.topTens > 0 && (
              <Box>
                <Text dimColor>Top 10s: </Text>
                <Text bold>{player.topTens}</Text>
              </Box>
            )}
            {player.earnings && player.earnings !== '--' && player.earnings !== '0' && (
              <Box>
                <Text dimColor>Earnings: </Text>
                <Text bold color="green">{player.earnings}</Text>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Performance Stats */}
      {hasPerformanceStats && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="green">Performance</Text>
          <Text dimColor>{'─'.repeat(40)}</Text>
          {player.scoringAvg && player.scoringAvg.value !== '0' && (
            <Box>
              <Text dimColor>{'Scoring Average'.padEnd(20)}</Text>
              <Text bold>{player.scoringAvg.value}</Text>
            </Box>
          )}
          <StatRow label="Driving Distance" stat={player.drivingDistance} suffix=" yds" />
          <StatRow label="Driving Accuracy" stat={player.drivingAccuracy} suffix="%" />
          <StatRow label="Greens Hit" stat={player.greensInReg} />
          <StatRow label="Putts per GIR" stat={player.puttsPerGir} />
          <StatRow label="Birdies per Round" stat={player.birdiesPerRound} />
          <StatRow label="Sand Save %" stat={player.sandSaves} suffix="%" />
        </Box>
      )}

      {/* Recent Results */}
      {player.recentResults && player.recentResults.length > 0 && (
        <Box flexDirection="column">
          <Box>
            <Text bold color="green">Recent Tournaments</Text>
            {player.lastSeasonPlayed && (
              <Text dimColor>  ({player.lastSeasonPlayed})</Text>
            )}
            <Text dimColor>  - press Enter to view leaderboard</Text>
          </Box>
          <Text dimColor>{'─'.repeat(55)}</Text>
          {player.recentResults.slice(0, 6).map((result, index) => {
            const pos = formatPosition(result.position);
            const posColor = getPositionColor(pos);
            const isSelected = index === selectedIndex;
            return (
              <Box key={index}>
                <Text color={isSelected ? 'cyan' : 'white'}>{isSelected ? '> ' : '  '}</Text>
                <Text dimColor={!isSelected}>{formatDate(result.date).padEnd(8)}</Text>
                <Text color={isSelected ? posColor : posColor} bold={isSelected}>{pos.padEnd(5)}</Text>
                <Text bold={isSelected}>{(result.score || '-').padEnd(6)}</Text>
                <Text color={isSelected ? 'white' : 'gray'}>{result.tournamentName}</Text>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Special Tiger Woods treatment */}
      {player.id === '462' && (
        <TigerGoatArt />
      )}

      {/* No recent activity message */}
      {(!player.recentResults || player.recentResults.length === 0) && (
        <Box flexDirection="column" marginTop={1} paddingY={1}>
          <Text color="yellow">No recent tournament results found</Text>
          <Text dimColor>This may be due to ESPN data availability or tour/season coverage.</Text>
        </Box>
      )}
    </Box>
  );
}
