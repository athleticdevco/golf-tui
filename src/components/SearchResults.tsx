import React from 'react';
import { Box, Text } from 'ink';
import type { LeaderboardEntry, RankingMetric, Tournament } from '../api/types.js';
import type { SearchResult } from '../api/players.js';
import { getScoreColor } from '../utils/theme.js';
import { Spinner } from './Spinner.js';
import { formatDateRange, truncate } from '../utils/format.js';

interface LeaderboardSearchResultsProps {
  type: 'leaderboard';
  results: LeaderboardEntry[];
  selectedIndex: number;
  query: string;
  isLoading?: boolean;
}

interface GlobalSearchResultsProps {
  type: 'global';
  results: SearchResult[];
  selectedIndex: number;
  query: string;
  isLoading?: boolean;
}

interface ScheduleSearchResultsProps {
  type: 'schedule';
  results: { tournament: Tournament; index: number }[];
  selectedIndex: number;
  query: string;
  isLoading?: boolean;
}

interface MetricSearchResultsProps {
  type: 'metrics';
  results: { metric: RankingMetric; index: number }[];
  selectedIndex: number;
  query: string;
  isLoading?: boolean;
}

type SearchResultsProps =
  | LeaderboardSearchResultsProps
  | GlobalSearchResultsProps
  | ScheduleSearchResultsProps
  | MetricSearchResultsProps;

export function SearchResults(props: SearchResultsProps) {
  const { results, selectedIndex, query, isLoading } = props;

  if (isLoading) {
    return (
      <Box marginY={1} paddingX={1}>
        <Spinner type="search" label="Searching..." />
      </Box>
    );
  }

  const minQueryLen = props.type === 'global' ? 2 : 1;
  if (query.length < minQueryLen) {
    const msg =
      props.type === 'leaderboard'
        ? 'Type to search players in this tournament...'
        : props.type === 'global'
        ? 'Type at least 2 characters to search all players...'
        : props.type === 'schedule'
        ? 'Type to search tournaments...'
        : 'Type to filter metrics...';
    return (
      <Box marginY={1} paddingX={1}>
        <Text dimColor>{msg}</Text>
      </Box>
    );
  }

  if (results.length === 0) {
    return (
      <Box marginY={1} paddingX={1}>
        <Text dimColor>
          {props.type === 'schedule'
            ? `No tournaments found matching "${query}"`
            : props.type === 'metrics'
            ? `No metrics found matching "${query}"`
            : `No players found matching "${query}"`}
        </Text>
      </Box>
    );
  }

  if (props.type === 'leaderboard') {
    return (
      <Box flexDirection="column" marginY={1} borderStyle="round" borderColor="gray" paddingX={1}>
        <Text dimColor>In tournament: {results.length} player{results.length !== 1 ? 's' : ''}</Text>
        {(results as LeaderboardEntry[]).slice(0, 10).map((entry, index) => {
          const isSelected = index === selectedIndex;
          const scoreColor = getScoreColor(entry.scoreNum);
          return (
            <Box key={entry.player.id}>
              <Text color={isSelected ? 'cyan' : 'white'}>
                {isSelected ? '> ' : '  '}
              </Text>
              <Text color={isSelected ? 'cyan' : 'white'}>
                {entry.player.name.padEnd(25)}
              </Text>
              <Text dimColor>{entry.position.padEnd(5)}</Text>
              <Text color={scoreColor}>{entry.score}</Text>
            </Box>
          );
        })}
      </Box>
    );
  }

  if (props.type === 'schedule') {
    return (
      <Box flexDirection="column" marginY={1} borderStyle="round" borderColor="gray" paddingX={1}>
        <Text dimColor>{results.length} event{results.length !== 1 ? 's' : ''}</Text>
        {(results as { tournament: Tournament; index: number }[]).slice(0, 10).map((hit, index) => {
          const isSelected = index === selectedIndex;
          const t = hit.tournament;

          let statusText = '';
          let statusColor: string = 'gray';
          if (t.status === 'in') {
            statusText = 'LIVE';
            statusColor = 'green';
          } else if (t.status === 'post') {
            statusText = 'FINAL';
            statusColor = 'yellow';
          }

          return (
            <Box key={`${t.id}-${hit.index}`}>
              <Text color={isSelected ? 'cyan' : 'white'}>{isSelected ? '> ' : '  '}</Text>
              <Text dimColor>{formatDateRange(t.date, t.endDate).padEnd(12)}</Text>
              <Text color={isSelected ? 'cyan' : 'white'}>{truncate(t.name, 34)}</Text>
              {statusText && <Text color={statusColor}>{` [${statusText}]`}</Text>}
            </Box>
          );
        })}
      </Box>
    );
  }

  if (props.type === 'metrics') {
    return (
      <Box flexDirection="column" marginY={1} borderStyle="round" borderColor="gray" paddingX={1}>
        <Text dimColor>{results.length} metric{results.length !== 1 ? 's' : ''}</Text>
        {(results as { metric: RankingMetric; index: number }[]).slice(0, 10).map((hit, index) => {
          const isSelected = index === selectedIndex;
          const m = hit.metric;
          const rank = m.rank && m.rank > 0 ? `#${m.rank}` : '—';
          return (
            <Box key={`${m.name}-${hit.index}`}>
              <Text color={isSelected ? 'cyan' : 'white'}>{isSelected ? '> ' : '  '}</Text>
              <Text color={isSelected ? 'cyan' : 'white'}>{truncate(m.displayName, 32).padEnd(33)}</Text>
              <Text dimColor>{rank.padEnd(6)}</Text>
              <Text dimColor>{truncate(m.displayValue, 12)}</Text>
            </Box>
          );
        })}
      </Box>
    );
  }

  // Global search results
  return (
    <Box flexDirection="column" marginY={1} borderStyle="round" borderColor="gray" paddingX={1}>
      <Text dimColor>All players: {results.length} result{results.length !== 1 ? 's' : ''}</Text>
      {(results as SearchResult[]).slice(0, 10).map((player, index) => {
        const isSelected = index === selectedIndex;
        return (
          <Box key={player.id}>
            <Text color={isSelected ? 'cyan' : 'white'}>
              {isSelected ? '> ' : '  '}
            </Text>
            <Text color={isSelected ? 'cyan' : 'white'}>
              {player.name.padEnd(30)}
            </Text>
            {player.country && <Text dimColor>{player.country}</Text>}
          </Box>
        );
      })}
    </Box>
  );
}
