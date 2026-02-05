import React from 'react';
import { Box, Text } from 'ink';
import type { View, Tour } from '../api/types.js';
import { getHints, type Hint } from '../utils/keymap.js';

interface StatusBarProps {
  view: View;
  tour: Tour;
  isSearchFocused: boolean;
  scorecardAvailable?: boolean;
  activeTours?: Tour[];
  hasBreadcrumbs?: boolean;
  isCommandMode?: boolean;
  isSearchMode?: boolean;
}

const TOUR_NAMES: Record<Tour, string> = {
  pga: 'PGA',
  lpga: 'LPGA',
  eur: 'EUR',
  'champions-tour': 'CHMP',
};

export function StatusBar({
  view,
  tour,
  isSearchFocused,
  scorecardAvailable = true,
  activeTours,
  hasBreadcrumbs = false,
  isCommandMode = false,
  isSearchMode = false,
}: StatusBarProps) {
  const hints: Hint[] = getHints({
    view,
    tour,
    isSearchFocused,
    isCommandMode,
    isSearchMode,
    hasBreadcrumbs,
    scorecardAvailable,
  });

  return (
    <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1} flexWrap="nowrap">
      <Box flexGrow={1}>
        <Text dimColor>
          {hints.map((h, i) => (
            <Text key={`${h.key}-${h.label}`}>
              {i > 0 && <Text dimColor> • </Text>}
              <Text color="yellow">{h.key}</Text>
              <Text> {h.label}</Text>
            </Text>
          ))}
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
