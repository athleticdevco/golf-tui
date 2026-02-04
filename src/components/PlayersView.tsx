import React from 'react';
import { Box, Text } from 'ink';

interface PlayersViewProps {
  isSearchFocused: boolean;
}

export function PlayersView({ isSearchFocused }: PlayersViewProps) {
  if (isSearchFocused) return null;

  return (
    <Box flexDirection="column" marginY={1}>
      <Text bold color="cyan">Players</Text>
      <Text dimColor>{'─'.repeat(40)}</Text>
      <Text dimColor>
        Press <Text color="yellow">s</Text> to search players, then <Text color="yellow">Enter</Text> to open profile.
      </Text>
      <Text dimColor>
        Tip: type <Text color="yellow">/stats</Text> in command palette to view the Stats tab.
      </Text>
    </Box>
  );
}
