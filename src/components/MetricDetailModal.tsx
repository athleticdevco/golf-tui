import React from 'react';
import { Box, Text } from 'ink';
import type { RankingMetric } from '../api/types.js';

type Grade = 'A+' | 'A' | 'B' | 'C' | 'D';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function percentileFromRank(rank?: number, assumedField = 200): number | null {
  if (!rank || rank <= 0) return null;
  const r = clamp(rank, 1, assumedField);
  return ((assumedField - r) / (assumedField - 1)) * 100;
}

function gradeFromPercentile(p: number): Grade {
  if (p >= 95) return 'A+';
  if (p >= 85) return 'A';
  if (p >= 70) return 'B';
  if (p >= 45) return 'C';
  return 'D';
}

function gradeColor(g: Grade): string {
  if (g === 'A+' || g === 'A') return 'green';
  if (g === 'B') return 'yellow';
  if (g === 'C') return 'white';
  return 'red';
}

export function MetricDetailModal({ metric }: { metric: RankingMetric }) {
  const assumedField = 200;
  const pct = percentileFromRank(metric.rank, assumedField);
  const grade = pct === null ? null : gradeFromPercentile(pct);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
      marginTop={1}
    >
      <Text bold color="cyan">{metric.displayName}</Text>
      <Text dimColor>Press any key to close</Text>

      <Box marginTop={1} flexDirection="column">
        {metric.abbreviation ? (
          <Text>
            <Text color="yellow">Abbr</Text>
            <Text>  {metric.abbreviation}</Text>
          </Text>
        ) : null}

        <Text>
          <Text color="yellow">Value</Text>
          <Text> {metric.displayValue}</Text>
        </Text>

        {metric.rank ? (
          <Text>
            <Text color="yellow">Rank</Text>
            <Text>  #{metric.rank}</Text>
          </Text>
        ) : null}

        {grade ? (
          <Text>
            <Text color="yellow">Grade</Text>
            <Text> </Text>
            <Text color={gradeColor(grade)} bold>{grade}</Text>
            <Text dimColor>{` (assumes ~${assumedField} field)`}</Text>
          </Text>
        ) : null}
      </Box>
    </Box>
  );
}
