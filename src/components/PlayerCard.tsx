import React from 'react';
import { Box, Text } from 'ink';
import type { LeaderboardEntry } from '../api/types.js';
import { getScoreColor, getPositionColor } from '../utils/theme.js';
import { truncate, padString } from '../utils/format.js';

interface PlayerCardProps {
  entry: LeaderboardEntry;
  isSelected: boolean;
  showRounds?: boolean;
}

export function PlayerCard({ entry, isSelected, showRounds = true }: PlayerCardProps) {
  const { player, position, score, scoreNum, today, todayNum, thru, rounds, status } = entry;
  
  const isCut = status === 'cut' || status === 'wd' || status === 'dq';
  const dimmed = isCut;

  const posColor = getPositionColor(position);
  const scoreColor = getScoreColor(scoreNum);
  const todayColor = getScoreColor(todayNum);

  const selector = isSelected ? '>' : ' ';
  const name = truncate(player.name, 22);
  const amateur = player.amateur ? '(a)' : '';

  return (
    <Box>
      <Text color={isSelected ? 'cyan' : 'white'}>{selector}</Text>
      <Text color={dimmed ? 'gray' : posColor}>{padString(position, 4, 'right')}</Text>
      <Text> </Text>
      <Text dimColor={dimmed}>{padString(name + amateur, 24)}</Text>
      <Text color={dimmed ? 'gray' : scoreColor}>{padString(score, 6, 'right')}</Text>
      <Text color={dimmed ? 'gray' : todayColor}>{padString(today, 7, 'right')}</Text>
      <Text dimColor={dimmed}>{padString(thru, 5, 'right')}</Text>
      {showRounds && rounds.length > 0 && (
        <>
          <Text dimColor> │</Text>
          {rounds.map((r, i) => (
            <Text key={i} dimColor={dimmed}>{padString(r, 5, 'right')}</Text>
          ))}
        </>
      )}
    </Box>
  );
}
