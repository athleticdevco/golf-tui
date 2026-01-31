import React from 'react';
import { Box, Text } from 'ink';
import type { PlayerScorecard, RoundScorecard, HoleScore } from '../api/types.js';
import { Spinner } from './Spinner.js';
import { useBlink } from '../hooks/useBlink.js';

interface ScorecardDetailProps {
  scorecard: PlayerScorecard | null;
  isLoading: boolean;
  error: string | null;
  selectedRound: number;
}

function formatToPar(toPar: number | null): string {
  if (toPar === null) return '-';
  if (toPar === 0) return 'E';
  return toPar > 0 ? `+${toPar}` : `${toPar}`;
}

function getScoreColor(toPar: number): string {
  return toPar < 0 ? 'red' : 'white';
}

function EighteenHoleCard({
  holes,
  currentHole,
  blinkVisible,
}: {
  holes: HoleScore[];
  currentHole?: number | null;
  blinkVisible?: boolean;
}) {
  const frontNine = holes.filter(h => h.holeNumber <= 9);
  const backNine = holes.filter(h => h.holeNumber > 9);

  // Calculate totals
  const frontPar = frontNine.reduce((sum, h) => sum + h.par, 0);
  const frontScore = frontNine.reduce((sum, h) => sum + h.strokes, 0);
  const backPar = backNine.reduce((sum, h) => sum + h.par, 0);
  const backScore = backNine.reduce((sum, h) => sum + h.strokes, 0);
  const totalPar = frontPar + backPar;
  const totalScore = frontScore + backScore;

  const cellWidth = 3;
  const sumWidth = 4;

  return (
    <Box flexDirection="column">
      {/* Hole numbers row */}
      <Box>
        <Box width={6}><Text bold>HOLE</Text></Box>
        {[1,2,3,4,5,6,7,8,9].map(h => (
          <Box key={h} width={cellWidth} justifyContent="center"><Text>{h}</Text></Box>
        ))}
        <Box width={sumWidth} justifyContent="center"><Text dimColor>OUT</Text></Box>
        {[10,11,12,13,14,15,16,17,18].map(h => (
          <Box key={h} width={cellWidth} justifyContent="center"><Text>{h}</Text></Box>
        ))}
        <Box width={sumWidth} justifyContent="center"><Text dimColor>IN</Text></Box>
        <Box width={sumWidth} justifyContent="center"><Text bold>TOT</Text></Box>
      </Box>

      {/* Par row */}
      <Box>
        <Box width={6}><Text bold>PAR</Text></Box>
        {[1,2,3,4,5,6,7,8,9].map(h => {
          const hole = frontNine.find(ho => ho.holeNumber === h);
          return <Box key={h} width={cellWidth} justifyContent="center"><Text>{hole ? hole.par : '-'}</Text></Box>;
        })}
        <Box width={sumWidth} justifyContent="center"><Text dimColor>{frontNine.length > 0 ? frontPar : '-'}</Text></Box>
        {[10,11,12,13,14,15,16,17,18].map(h => {
          const hole = backNine.find(ho => ho.holeNumber === h);
          return <Box key={h} width={cellWidth} justifyContent="center"><Text>{hole ? hole.par : '-'}</Text></Box>;
        })}
        <Box width={sumWidth} justifyContent="center"><Text dimColor>{backNine.length > 0 ? backPar : '-'}</Text></Box>
        <Box width={sumWidth} justifyContent="center"><Text bold>{totalPar || '-'}</Text></Box>
      </Box>

      {/* Score row */}
      <Box>
        <Box width={6}><Text bold>SCORE</Text></Box>
        {[1,2,3,4,5,6,7,8,9].map(h => {
          const hole = frontNine.find(ho => ho.holeNumber === h);
          const isCurrentHole = currentHole === h;

          if (isCurrentHole && !hole) {
            return <Box key={h} width={cellWidth} justifyContent="center"><Text color="yellow">{blinkVisible ? '·' : ' '}</Text></Box>;
          }

          return (
            <Box key={h} width={cellWidth} justifyContent="center">
              <Text color={hole ? getScoreColor(hole.toPar) : 'white'}>{hole ? hole.strokes : '-'}</Text>
            </Box>
          );
        })}
        <Box width={sumWidth} justifyContent="center"><Text dimColor>{frontNine.length > 0 ? frontScore : '-'}</Text></Box>
        {[10,11,12,13,14,15,16,17,18].map(h => {
          const hole = backNine.find(ho => ho.holeNumber === h);
          const isCurrentHole = currentHole === h;

          if (isCurrentHole && !hole) {
            return <Box key={h} width={cellWidth} justifyContent="center"><Text color="yellow">{blinkVisible ? '·' : ' '}</Text></Box>;
          }

          return (
            <Box key={h} width={cellWidth} justifyContent="center">
              <Text color={hole ? getScoreColor(hole.toPar) : 'white'}>{hole ? hole.strokes : '-'}</Text>
            </Box>
          );
        })}
        <Box width={sumWidth} justifyContent="center"><Text dimColor>{backNine.length > 0 ? backScore : '-'}</Text></Box>
        <Box width={sumWidth} justifyContent="center"><Text bold>{holes.length > 0 ? totalScore : '-'}</Text></Box>
      </Box>
    </Box>
  );
}

function RoundCard({ round, playerName, currentHole, blinkVisible }: { round: RoundScorecard; playerName: string; currentHole?: number | null; blinkVisible?: boolean }) {
  const isLive = !round.isComplete;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      {/* Header */}
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold color="cyan">{playerName} - Round {round.round}</Text>
        <Box>
          <Text bold>
            {formatToPar(round.toPar)}
            <Text dimColor> ({round.totalStrokes ?? '-'}{isLive ? '*' : ''})</Text>
          </Text>
        </Box>
      </Box>

      {/* 18-hole scorecard */}
      {round.holes.length > 0 ? (
        <EighteenHoleCard holes={round.holes} currentHole={currentHole} blinkVisible={blinkVisible} />
      ) : (
        <Box paddingY={1}>
          <Text dimColor>No hole data available for this round</Text>
        </Box>
      )}
    </Box>
  );
}

export function ScorecardDetail({ scorecard, isLoading, error, selectedRound }: ScorecardDetailProps) {
  const blinkVisible = useBlink(500);

  if (isLoading) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Spinner label="Loading scorecard..." />
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="red">Error: {error}</Text>
      </Box>
    );
  }

  if (!scorecard) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text dimColor>No scorecard data available</Text>
      </Box>
    );
  }

  const currentRound = scorecard.rounds.find(r => r.round === selectedRound) || scorecard.rounds[0];

  if (!currentRound) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text dimColor>No round data available</Text>
      </Box>
    );
  }

  // Derive current hole: next unplayed hole (holes.length + 1)
  const currentHole = currentRound.isComplete ? null : currentRound.holes.length + 1;

  return (
    <Box flexDirection="column">
      {/* Event name */}
      <Box marginBottom={1}>
        <Text bold color="white">{scorecard.eventName}</Text>
      </Box>

      {/* Scorecard */}
      <RoundCard round={currentRound} playerName={scorecard.playerName} currentHole={currentHole} blinkVisible={blinkVisible} />

      {/* Round selector */}
      <Box marginTop={1}>
        {[1, 2, 3, 4].map(r => {
          const hasData = scorecard.rounds.some(rd => rd.round === r);
          const isSelected = r === selectedRound;
          const roundData = scorecard.rounds.find(rd => rd.round === r);
          const isComplete = roundData?.isComplete;
          const hasStarted = roundData && roundData.holes.length > 0;

          return (
            <Box key={r} marginRight={2}>
              <Text
                color={isSelected ? 'cyan' : hasData ? 'white' : 'gray'}
                bold={isSelected}
                dimColor={!hasData}
              >
                [{r}] Round {r}
                {isSelected && hasData ? '*' : ''}
                {hasData && !isComplete ? (hasStarted ? ' (in progress)' : ' (not started)') : ''}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
