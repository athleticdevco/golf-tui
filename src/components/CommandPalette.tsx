import React from 'react';
import { Box, Text } from 'ink';

interface Command {
  name: string;
  description: string;
  shortcut?: string;
}

export const COMMANDS: Command[] = [
  { name: 'leaderboard', description: 'View live tournament leaderboard', shortcut: 'l' },
  { name: 'schedule', description: 'View tournament schedule', shortcut: 's' },
  { name: 'players', description: 'Search and browse players', shortcut: 'p' },
  { name: 'stats', description: 'View player stats', shortcut: 't' },
  { name: 'pga', description: 'Switch to PGA Tour' },
  { name: 'lpga', description: 'Switch to LPGA Tour' },
  { name: 'eur', description: 'Switch to DP World Tour' },
  { name: 'champions', description: 'Switch to Champions Tour' },
  { name: 'help', description: 'Show keyboard shortcuts', shortcut: '?' },
];

interface CommandPaletteProps {
  filter: string;
  selectedIndex: number;
}

export function filterCommands(commands: Command[], filter: string): Command[] {
  const q = filter.replace(/^\//, '').toLowerCase();
  if (!q) return commands;
  return commands.filter(cmd => 
    cmd.name.toLowerCase().includes(q) ||
    cmd.description.toLowerCase().includes(q)
  );
}

export function CommandPalette({ filter, selectedIndex }: CommandPaletteProps) {
  const filtered = filterCommands(COMMANDS, filter);

  if (filtered.length === 0) {
    return (
      <Box marginY={1}>
        <Text dimColor>No matching commands</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginY={1} borderStyle="round" borderColor="gray" paddingX={1}>
      {filtered.map((cmd, index) => {
        const isSelected = index === selectedIndex;
        return (
          <Box key={cmd.name}>
            <Text color={isSelected ? 'cyan' : 'white'}>
              {isSelected ? '> ' : '  '}
            </Text>
            <Text color="yellow">/{cmd.name}</Text>
            <Text dimColor>  {cmd.description}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
