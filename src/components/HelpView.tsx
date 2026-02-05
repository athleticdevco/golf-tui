import React from 'react';
import { Box, Text } from 'ink';
import { COMMANDS } from './CommandPalette.js';

export function HelpView() {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1}>
      <Text bold color="cyan">Commands</Text>
      <Text dimColor>Press any key to close</Text>
      
      <Box marginTop={1} flexDirection="column">
        {COMMANDS.map(cmd => (
          <Text key={cmd.name}>
            <Text color="yellow">/{cmd.name}</Text>
            <Text>  {cmd.description}</Text>
            {cmd.shortcut ? <Text dimColor>{`  (${cmd.shortcut})`}</Text> : null}
          </Text>
        ))}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold color="cyan">Navigation</Text>
        <Text><Text color="yellow">/</Text>          Command palette</Text>
        <Text><Text color="yellow">?</Text>          Help</Text>
        <Text><Text color="yellow">q</Text>          Quit</Text>
        <Text><Text color="yellow">Esc</Text>        Back / cancel</Text>
        <Text><Text color="yellow">s</Text>          Search / filter (leaderboard, players, schedule, stats)</Text>
        <Text><Text color="yellow">j/k</Text>        Navigate lists</Text>
        <Text><Text color="yellow">↑/↓</Text>        Navigate search results</Text>
        <Text><Text color="yellow">Enter</Text>      Select / drill down</Text>
        <Text><Text color="yellow">o</Text>          Sort (schedule, stats)</Text>
        <Text><Text color="yellow">Tab</Text>        Tour (leaderboard) / breadcrumbs (when available)</Text>
        <Text><Text color="yellow">r</Text>          Refresh (leaderboard)</Text>
        <Text><Text color="yellow">c</Text>          Scorecard (leaderboard, event leaderboard)</Text>
        <Text><Text color="yellow">1-4</Text>        Round (scorecard)</Text>
        <Text><Text color="yellow">t</Text>          Stats (player)</Text>
      </Box>
    </Box>
  );
}
