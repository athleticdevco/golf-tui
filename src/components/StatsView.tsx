import React from 'react';
import { Box, Text } from 'ink';
import type { PlayerProfile, PlayerStat, RankingMetric } from '../api/types.js';
import { formatDate, truncate } from '../utils/format.js';

function bar(value: number, max: number, width = 18): string {
  if (!isFinite(value) || !isFinite(max) || max <= 0) return ''.padEnd(width, ' ');
  const filled = Math.max(0, Math.min(width, Math.round((value / max) * width)));
  return '█'.repeat(filled).padEnd(width, ' ');
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function sparkline(values: Array<number | null>, invert = false): string {
  const chars = ['.', ':', '-', '=', '+', '*', '#', '@'];
  const defined = values.filter((v): v is number => v !== null);
  if (defined.length < 2) return values.map(v => (v === null ? '·' : chars[chars.length - 1])).join('');

  const min = Math.min(...defined);
  const max = Math.max(...defined);
  const span = max - min || 1;

  return values
    .map(v => {
      if (v === null) return '·';
      const t = (v - min) / span;
      const idx = invert
        ? Math.round((1 - t) * (chars.length - 1))
        : Math.round(t * (chars.length - 1));
      return chars[clamp(idx, 0, chars.length - 1)]!;
    })
    .join('');
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

export function StatsView({
  player,
  metrics,
  selectedMetricIndex,
  sortMode,
}: {
  player: PlayerProfile | null;
  metrics: RankingMetric[];
  selectedMetricIndex: number;
  sortMode: 'rank' | 'name';
}) {
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

  const parseFinish = (position?: string | null) => {
    if (!position) return null;
    const m = String(position).match(/\d+/);
    return m ? Number(m[0]) : null;
  };

  const madeCut = (position?: string | null): boolean | null => {
    if (!position) return null;
    const p = String(position).toUpperCase();
    if (p.includes('MC') || p.includes('CUT')) return false;
    if (p.includes('WD') || p.includes('DQ')) return false;
    const n = parseFinish(position);
    if (n !== null) return true;
    return null;
  };

  const average = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null);

  const recent = player.recentResults ?? [];
  const finishNums = recent
    .map(r => parseFinish(r.position))
    .filter((n): n is number => n !== null);

  const parseScore = (score?: string | null) => {
    if (!score) return null;
    const s = String(score).trim().replace('−', '-');
    if (!s || s === '-' || s === '--') return null;
    if (s.toUpperCase() === 'E') return 0;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  const avg5 = average(finishNums.slice(0, 5));
  const avg10 = average(finishNums.slice(0, 10));
  const fmtAvg = (n: number | null) => (n === null ? '—' : n.toFixed(1));

  const last10 = recent.slice(0, 10);
  const finishLast10 = last10.map(r => parseFinish(r.position));
  const scoreLast10 = last10.map(r => parseScore(r.score));
  const finishSpark = sparkline(finishLast10, true);
  const scoreSpark = sparkline(scoreLast10, true);

  const fmtFinish = (r: (typeof last10)[number]) => truncate(String(r.position || '-'), 4).padStart(4);
  const fmtScore = (r: (typeof last10)[number]) => truncate(String(r.score || '-'), 4).padStart(4);
  const finishSeries = last10.map(fmtFinish).join('');
  const scoreSeries = last10.map(fmtScore).join('');

  let cutStreak = 0;
  for (const r of recent) {
    const ok = madeCut(r.position);
    if (ok === true) cutStreak += 1;
    else break;
  }

  const ranked = metrics.filter(m => (m.rank ?? 0) > 0);
  const byRankAsc = [...ranked].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  const strengths = byRankAsc.slice(0, 3);
  const weaknesses = [...byRankAsc].slice(-3).reverse();

  const metricSummary = (m: RankingMetric) => `${truncate(m.displayName, 18)} #${m.rank}`;
  const strengthsText = strengths.length ? strengths.map(metricSummary).join(' | ') : null;
  const weaknessesText = weaknesses.length ? weaknesses.map(metricSummary).join(' | ') : null;

  const seasonBits: string[] = [];
  if (player.events !== undefined) seasonBits.push(`Ev ${player.events}`);
  if (player.cutsMade !== undefined) seasonBits.push(`Cuts ${player.cutsMade}`);
  if (player.wins !== undefined) seasonBits.push(`Wins ${player.wins}`);
  if (player.topTens !== undefined) seasonBits.push(`Top10 ${player.topTens}`);
  const seasonLine = seasonBits.length ? `Season: ${seasonBits.join('  ')}` : null;

  const VISIBLE_METRICS = 8;
  const totalMetrics = metrics.length;
  const clampedIndex = totalMetrics === 0 ? 0 : clamp(selectedMetricIndex, 0, totalMetrics - 1);
  const startIndex = clampedIndex >= VISIBLE_METRICS ? clampedIndex - VISIBLE_METRICS + 1 : 0;
  const endIndex = Math.min(startIndex + VISIBLE_METRICS, totalMetrics);
  const visible = metrics.slice(startIndex, endIndex);
  const assumedField = 200;

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">{player.name}</Text>
        <Text dimColor>{`  - Stats  (metrics: ${totalMetrics}, sort: ${sortMode})`}</Text>
      </Box>

      {player.recentResults && player.recentResults.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="green">Recent Events</Text>
          <Text dimColor>{'─'.repeat(50)}</Text>
          {player.recentResults.slice(0, 4).map((r, idx) => (
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

      {seasonLine && (
        <Box marginBottom={1}>
          <Text dimColor>{seasonLine}</Text>
        </Box>
      )}

      <Box flexDirection="column" marginBottom={1}>
        <Text dimColor>
          Trend: avg5 {fmtAvg(avg5)}  avg10 {fmtAvg(avg10)}  |  cut streak {cutStreak}
        </Text>
        {last10.length > 0 && (
          <Box flexDirection="column">
            <Text dimColor>{`Finish:${finishSeries}`}</Text>
            <Text dimColor>{`      ${finishSpark}`}</Text>
            <Text dimColor>{`Score :${scoreSeries}`}</Text>
            <Text dimColor>{`      ${scoreSpark}`}</Text>
          </Box>
        )}
        {recent.length > 0 && (
          <Text dimColor>
            Last {Math.min(recent.length, 7)}: {recent
              .slice(0, 7)
              .map(r => String(r.position || '-'))
              .join('  ')}
          </Text>
        )}
      </Box>

      {(strengthsText || weaknessesText) && (
        <Box flexDirection="column" marginBottom={1}>
          {strengthsText && <Text dimColor>{`Strengths: ${strengthsText}`}</Text>}
          {weaknessesText && <Text dimColor>{`Weaknesses: ${weaknessesText}`}</Text>}
        </Box>
      )}

      <Box flexDirection="column">
        <Text bold color="green">All metrics</Text>
        <Text dimColor>{'Metric'.padEnd(34)} {'Val'.padEnd(10)} {'Rank'.padEnd(6)} {'G'.padEnd(2)} Bar</Text>
        <Text dimColor>{'─'.repeat(60)}</Text>

        {visible.map((m, idx) => {
          const absoluteIndex = startIndex + idx;
          const isSelected = absoluteIndex === clampedIndex;

          const pct = percentileFromRank(m.rank, assumedField);
          const grade = pct === null ? null : gradeFromPercentile(pct);

          return (
            <Text key={`${m.name}-${absoluteIndex}`}>
              <Text color={isSelected ? 'cyan' : 'white'}>{isSelected ? '> ' : '  '}</Text>
              <Text color={isSelected ? 'cyan' : 'white'}>{truncate(m.displayName, 32).padEnd(33)}</Text>
              <Text dimColor>{truncate(m.displayValue, 10).padEnd(11)}</Text>
              <Text dimColor>{formatRank(m.rank ?? undefined).padEnd(6)}</Text>
              {grade ? (
                <Text color={gradeColor(grade)} bold>{grade.padEnd(2)}</Text>
              ) : (
                <Text dimColor>{'—'.padEnd(2)}</Text>
              )}
              <Text dimColor>{` ${rankBar(m.rank ?? null, assumedField, 8)}`}</Text>
            </Text>
          );
        })}

        {totalMetrics === 0 && <Text dimColor>No ESPN season ranking metrics found for this player.</Text>}

        {totalMetrics > 0 && (
          <Box marginTop={1}>
            <Text dimColor>
              Showing {startIndex + 1}-{endIndex} of {totalMetrics} metrics
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
