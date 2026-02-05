import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

export type SpinnerType = 'default' | 'leaderboard' | 'player' | 'scorecard' | 'schedule' | 'search';

interface GolfSpinnerProps {
  type?: SpinnerType;
  label?: string;
}

const FRAME_INTERVAL = 150;

// Scoreboard filling in animation for leaderboard
const LEADERBOARD_FRAMES = [
  '┌───┐\n│   │\n└───┘',
  '┌───┐\n│ 1 │\n└───┘',
  '┌───┐\n│ 1 │\n│ 2 │\n└───┘',
  '┌───┐\n│ 1 │\n│ 2 │\n│ 3 │\n└───┘',
];

// Golfer walking animation for player profile
const PLAYER_FRAMES = [
  ' o    ',
  ' o    ',
  '  o   ',
  '  o   ',
  '   o  ',
  '   o  ',
  '   \\o/',
];

// Pencil writing scores animation for scorecard
const SCORECARD_FRAMES = [
  '✎ [   ]',
  '✎ [3  ]',
  '✎ [3 4]',
  '✎ [3 4]',
  '✎ [3 4]',
];

// Calendar pages flipping for schedule
const SCHEDULE_FRAMES = [
  '📅 ┌──┐',
  '📅 │Mo│',
  '📅 │Tu│',
  '📅 │We│',
  '📅 │Th│',
  '📅 │Fr│',
];

// Ball bouncing around searching
const SEARCH_FRAMES = [
  '( o    )',
  '(  o   )',
  '(   o  )',
  '(    o )',
  '(   o  )',
  '(  o   )',
  '( o    )',
  '(o     )',
];

// Default golf ball rolling
const DEFAULT_FRAMES = [
  'o····',
  '·o···',
  '··o··',
  '···o·',
  '····o',
  '···o·',
  '··o··',
  '·o···',
];

function getFrames(type: SpinnerType): string[] {
  switch (type) {
    case 'leaderboard':
      return LEADERBOARD_FRAMES;
    case 'player':
      return PLAYER_FRAMES;
    case 'scorecard':
      return SCORECARD_FRAMES;
    case 'schedule':
      return SCHEDULE_FRAMES;
    case 'search':
      return SEARCH_FRAMES;
    default:
      return DEFAULT_FRAMES;
  }
}

function getColor(type: SpinnerType): string {
  switch (type) {
    case 'leaderboard':
      return 'cyan';
    case 'player':
      return 'yellow';
    case 'scorecard':
      return 'white';
    case 'schedule':
      return 'magenta';
    case 'search':
      return 'green';
    default:
      return 'green';
  }
}

export function GolfSpinner({ type = 'default', label = 'Loading...' }: GolfSpinnerProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const frames = getFrames(type);
  const color = getColor(type);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrameIndex(prev => (prev + 1) % frames.length);
    }, FRAME_INTERVAL);

    return () => clearInterval(timer);
  }, [frames.length]);

  const frame = frames[frameIndex];
  const lines = frame.split('\n');
  const isMultiLine = lines.length > 1;

  if (isMultiLine) {
    return (
      <Box flexDirection="column">
        <Box flexDirection="column">
          {lines.map((line, i) => (
            <Text key={i} color={color}>{line}</Text>
          ))}
        </Box>
        <Text> {label}</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Text color={color}>{frame}</Text>
      <Text> {label}</Text>
    </Box>
  );
}
