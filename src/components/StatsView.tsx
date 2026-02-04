import React from 'react';
import { Box, Text } from 'ink';
import type { PlayerProfile, PlayerStat } from '../api/types.js';
import { formatDate, truncate } from '../utils/format.js';

function bar(value: number, max: number, width = 18): string {
  if (!isFinite(value) || !isFinite(max) || max <= 0) return ''.padEnd(width, ' ');
  const filled = Math.max(0, Math.min(width, Math.round((value / max) * width)));
  return '█'.repeat(filled).padEnd(width, ' ');
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function parseStatNumber(v?: string): number | null {
  if (!v) return null;
  const n = Number(String(v).replace(/[^0-9.+-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function isMissingStatValue(v?: string): boolean {
  if (!v) return true;
  const s = String(v).trim();
  if (!s || s === '--' || s === '-' || s.toLowerCase() === 'n/a') return true;
  if (s === '0' || s === '0.0' || s === '0.00') return true;
  return false;
}

function rankStrengthBar(rank?: number, assumedField = 200, width = 10): string {
  if (!rank || rank <= 0) return ''.padEnd(width, ' ');
  const r = clamp(rank, 1, assumedField);
  const strength = (assumedField - r) / (assumedField - 1);
  const filled = clamp(Math.round(strength * width), 0, width);
  return '■'.repeat(filled).padEnd(width, ' ');
}

function percentileFromRank(rank?: number, assumedField = 200): number | null {
  if (!rank || rank <= 0) return null;
  const r = clamp(rank, 1, assumedField);
  return ((assumedField - r) / (assumedField - 1)) * 100;
}

function normalizeValue(value: number | null, min: number, max: number, invert = false): number | null {
  if (value === null || !isFinite(value) || !isFinite(min) || !isFinite(max) || max <= min) return null;
  const t = clamp((value - min) / (max - min), 0, 1);
  return (invert ? 1 - t : t) * 100;
}

type Confidence = 'HIGH' | 'MED' | 'LOW';
type Direction = 'higher' | 'lower';

type Grade = 'A+' | 'A' | 'B' | 'C' | 'D';

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

function confColor(c: Confidence): string {
  if (c === 'HIGH') return 'green';
  if (c === 'MED') return 'yellow';
  return 'gray';
}

function directionGlyph(d: Direction): string {
  return d === 'higher' ? '↑' : '↓';
}

function bullet(pct: number | null, width = 10): string {
  if (pct === null || !isFinite(pct)) return ''.padEnd(width, ' ');
  const filled = clamp(Math.round((pct / 100) * width), 0, width);
  return '█'.repeat(filled).padEnd(width, ' ');
}

function formatRank(rank?: number): string {
  return rank && rank > 0 ? `#${rank}` : '—';
}

type MetricRow = {
  key: string;
  name: string;
  direction: Direction;
  valueText: string;
  rank: number | null;
  grade: Grade | null;
  confidence: Confidence;
};

function buildMetric(
  key: string,
  name: string,
  direction: Direction,
  stat: PlayerStat | undefined,
  opts: { assumedField: number; min?: number; max?: number; invert?: boolean; suffix?: string }
): MetricRow {
  const { assumedField, min, max, invert = false, suffix = '' } = opts;
  const rank = stat?.rank && stat.rank > 0 ? stat.rank : null;
  const raw = stat?.value ? String(stat.value) : '';
  const valueText = !isMissingStatValue(raw) ? `${raw}${suffix}` : '—';

  if (rank !== null) {
    const pct = percentileFromRank(rank, assumedField);
    return {
      key,
      name,
      direction,
      valueText,
      rank,
      grade: pct === null ? null : gradeFromPercentile(pct),
      confidence: 'HIGH',
    };
  }

  if (!isMissingStatValue(raw)) {
    const num = parseStatNumber(raw);
    if (num !== null && min !== undefined && max !== undefined) {
      const pct = normalizeValue(num, min, max, invert);
      return {
        key,
        name,
        direction,
        valueText,
        rank: null,
        grade: pct === null ? null : gradeFromPercentile(pct),
        confidence: 'MED',
      };
    }
  }

  return {
    key,
    name,
    direction,
    valueText,
    rank: null,
    grade: null,
    confidence: 'LOW',
  };
}

function rankBar(rank: number | null, assumedField = 200, width = 8): string {
  if (!rank || rank <= 0) return ''.padEnd(width, ' ');
  const r = clamp(rank, 1, assumedField);
  const strength = (assumedField - r) / (assumedField - 1);
  const filled = clamp(Math.round(strength * width), 0, width);
  return '='.repeat(filled).padEnd(width, '.');
}

function StatLine({ label, stat, max, invert = false }: { label: string; stat?: PlayerStat; max: number; invert?: boolean }) {
  if (!stat?.value || isMissingStatValue(stat.value)) return null;
  const n = parseStatNumber(stat.value);
  if (n === null) return null;

  const valueBar = bar(n ?? 0, max);
  const rbar = stat.rank ? rankStrengthBar(stat.rank) : '';
  const finalBar = invert ? valueBar.split('').reverse().join('') : valueBar;

  return (
    <Box>
      <Text dimColor>{label.padEnd(18)}</Text>
      <Text>{stat.value.toString().padEnd(10)}</Text>
      <Text dimColor>{finalBar}</Text>
      {stat.rank ? (
        <Text dimColor>
          {' '}
          {rbar} #{stat.rank}
        </Text>
      ) : null}
    </Box>
  );
}

export function StatsView({ player }: { player: PlayerProfile | null }) {
  if (!player) {
    return (
      <Box flexDirection="column" marginY={1}>
        <Text bold color="cyan">Stats</Text>
        <Text dimColor>{'─'.repeat(40)}</Text>
        <Text dimColor>
          No player selected. Go to <Text color="yellow">/players</Text> to search, then open a profile.
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">{player.name}</Text>
        <Text dimColor>  - Stats</Text>
      </Box>

      {player.recentResults && player.recentResults.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="green">Recent Events</Text>
          <Text dimColor>{'─'.repeat(50)}</Text>
          {player.recentResults.slice(0, 7).map((r, idx) => (
            <Box key={`${r.tournamentId}-${idx}`}>
              <Text dimColor>{formatDate(r.date).padEnd(8)}</Text>
              <Text>{String(r.position || '-').padEnd(5)}</Text>
              <Text dimColor>{String(r.score || '-').padEnd(6)}</Text>
              <Text>{truncate(r.tournamentName || '—', 28)}</Text>
            </Box>
          ))}
        </Box>
      )}

      {(!player.recentResults || player.recentResults.length === 0) && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="green">Recent Events</Text>
          <Text dimColor>{'─'.repeat(50)}</Text>
          <Text dimColor>No current-season PGA results found from ESPN scoreboards.</Text>
        </Box>
      )}

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="green">Season</Text>
        <Text dimColor>{'─'.repeat(50)}</Text>
        <Box>
          {player.events !== undefined && (
            <Text>
              <Text dimColor>Events </Text>
              <Text bold>{String(player.events).padEnd(4)}</Text>
            </Text>
          )}
          {player.cutsMade !== undefined && (
            <Text>
              <Text dimColor>  Cuts </Text>
              <Text bold>{String(player.cutsMade).padEnd(4)}</Text>
            </Text>
          )}
          {player.wins !== undefined && (
            <Text>
              <Text dimColor>  Wins </Text>
              <Text bold color={player.wins > 0 ? 'yellow' : 'white'}>{String(player.wins).padEnd(3)}</Text>
            </Text>
          )}
          {player.topTens !== undefined && (
            <Text>
              <Text dimColor>  Top10 </Text>
              <Text bold>{String(player.topTens).padEnd(3)}</Text>
            </Text>
          )}
        </Box>
      </Box>

      {(() => {
        const assumedField = 200;
        const rows: MetricRow[] = [
          buildMetric('SCR', 'Scoring Avg', 'lower', player.scoringAvg, { assumedField, min: 68, max: 74, invert: true }),
          buildMetric('DST', 'Driving Distance', 'higher', player.drivingDistance, { assumedField, min: 260, max: 330 }),
          buildMetric('ACC', 'Driving Accuracy', 'higher', player.drivingAccuracy, { assumedField, min: 45, max: 75 }),
          buildMetric('GIR', 'Greens in Reg', 'higher', player.greensInReg, { assumedField, min: 55, max: 75 }),
          buildMetric('PUT', 'Putts / GIR', 'lower', player.puttsPerGir, { assumedField, min: 1.6, max: 2.05, invert: true }),
          buildMetric('BRD', 'Birdies / Rd', 'higher', player.birdiesPerRound, { assumedField, min: 2.5, max: 5.2 }),
          buildMetric('SND', 'Sand Save %', 'higher', player.sandSaves, { assumedField, min: 35, max: 70 }),
        ];

        const ranked = rows.filter(r => r.rank !== null && r.grade !== null);
        if (ranked.length === 0) return null;

        const byRankAsc = [...ranked].sort((a, b) => (a.rank! - b.rank!));
        const strengths = byRankAsc.slice(0, 3);
        const weaknesses = [...byRankAsc].slice(-3).reverse();

        return (
          <Box flexDirection="column" marginBottom={1}>
            <Text bold color="green">Season profile</Text>
            <Text dimColor>{'─'.repeat(50)}</Text>

            <Box marginBottom={1}>
              <Box flexDirection="column" marginRight={4}>
                <Text bold>Strengths</Text>
                {strengths.map(r => (
                  <Box key={r.key}>
                    <Text dimColor>{r.name.padEnd(18)}</Text>
                    <Text color={gradeColor(r.grade!)} bold>{r.grade!.padEnd(2)}</Text>
                    <Text dimColor>  ({formatRank(r.rank ?? undefined)})</Text>
                  </Box>
                ))}
              </Box>

              <Box flexDirection="column">
                <Text bold>Weaknesses</Text>
                {weaknesses.map(r => (
                  <Box key={r.key}>
                    <Text dimColor>{r.name.padEnd(18)}</Text>
                    <Text color={gradeColor(r.grade!)} bold>{r.grade!.padEnd(2)}</Text>
                    <Text dimColor>  ({formatRank(r.rank ?? undefined)})</Text>
                  </Box>
                ))}
              </Box>
            </Box>

            <Box flexDirection="column">
              <Text bold>Profile table</Text>
              <Text dimColor>{'Metric'.padEnd(18)} {'Val'.padEnd(10)} {'Rank'.padEnd(6)} {'Dir'.padEnd(3)} {'Grade'.padEnd(5)} Bar</Text>
              <Text dimColor>{'─'.repeat(50)}</Text>
              {rows.map(r => {
                const gradeText = r.grade ?? '—';
                const line =
                  `${r.name.padEnd(18)}` +
                  `${r.valueText.padEnd(10)}` +
                  `${formatRank(r.rank ?? undefined).padEnd(6)}` +
                  `${directionGlyph(r.direction).padEnd(3)}` +
                  `${gradeText.padEnd(5)}` +
                  ` ${rankBar(r.rank, assumedField, 8)}`;

                return (
                  <Text key={r.key}>
                    <Text>{r.name.padEnd(18)}</Text>
                    <Text dimColor>{r.valueText.padEnd(10)}</Text>
                    <Text dimColor>{formatRank(r.rank ?? undefined).padEnd(6)}</Text>
                    <Text dimColor>{directionGlyph(r.direction).padEnd(3)}</Text>
                    {r.grade ? (
                      <Text color={gradeColor(r.grade)} bold>{gradeText.padEnd(5)}</Text>
                    ) : (
                      <Text dimColor>{gradeText.padEnd(5)}</Text>
                    )}
                    <Text dimColor>{` ${rankBar(r.rank, assumedField, 8)}`}</Text>
                  </Text>
                );
              })}
              <Box marginTop={1}>
                <Text dimColor>
                  Strengths/Weaknesses are best/worst ranks shown above. Bar shows rank strength (= better). Grades are rank buckets.
                </Text>
              </Box>
            </Box>
          </Box>
        );
      })()}

      {/* Hide the old mini-chart section; the profile table above is the primary visualization. */}
    </Box>
  );
}
