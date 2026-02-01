import React from 'react';
import { Box, Text } from 'ink';
import type { View, Tour } from '../api/types.js';

interface StatusBarProps {
  view: View;
  tour: Tour;
  isSearchFocused: boolean;
  scorecardAvailable?: boolean;
  activeTours?: Tour[];
}

const TOUR_NAMES: Record<Tour, string> = {
  pga: 'PGA',
  lpga: 'LPGA',
  eur: 'EUR',
  'champions-tour': 'CHMP',
};

export function StatusBar({ view, tour, isSearchFocused, scorecardAvailable = true, activeTours }: StatusBarProps) {
  return (
    <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
      <Box flexGrow={1}>
        <Text dimColor>
          {isSearchFocused ? (
            <Text><Text color="yellow">Esc</Text> cancel</Text>
          ) : view === 'leaderboard' ? (
            <Text>
              <Text color="yellow">j/k</Text> nav
              {scorecardAvailable && <Text> • <Text color="yellow">c</Text> card</Text>}
              <Text> • <Text color="yellow">Tab</Text> tour • <Text color="yellow">q</Text> quit</Text>
            </Text>
          ) : view === 'schedule' ? (
            <Text>
              <Text color="yellow">j/k</Text> nav • <Text color="yellow">Esc</Text> back • <Text color="yellow">q</Text> quit
            </Text>
          ) : view === 'player' ? (
            <Text>
              <Text color="yellow">j/k</Text> nav • <Text color="yellow">Enter</Text> event • <Text color="yellow">Esc</Text> back • <Text color="yellow">q</Text> quit
            </Text>
          ) : view === 'event-leaderboard' ? (
            <Text>
              <Text color="yellow">j/k</Text> nav
              {scorecardAvailable && <Text> • <Text color="yellow">c</Text> card</Text>}
              <Text> • <Text color="yellow">Esc</Text> back • <Text color="yellow">q</Text> quit</Text>
            </Text>
          ) : view === 'scorecard' ? (
            <Text>
              <Text color="yellow">1-4</Text> round • <Text color="yellow">Esc</Text> back • <Text color="yellow">q</Text> quit
            </Text>
          ) : (
            <Text>
              <Text color="yellow">Esc</Text> close • <Text color="yellow">q</Text> quit
            </Text>
          )}
        </Text>
      </Box>
      <Box>
        {activeTours ? (
          activeTours.map((t, i) => (
            <Text key={t}>
              {i > 0 && <Text dimColor> </Text>}
              <Text color={t === tour ? 'green' : 'gray'}>{TOUR_NAMES[t]}</Text>
            </Text>
          ))
        ) : (
          <Text color="green">{TOUR_NAMES[tour]}</Text>
        )}
      </Box>
    </Box>
  );
}
