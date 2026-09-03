import { Hit, Zone } from '@/store/types';

/** USPSA-style zone values. Miss carries the −10 penalty. */
export const ZONE_PTS: Record<Zone, number> = { A: 5, C: 3, D: 1, miss: -10 };

export interface ZoneCounts {
  A: number;
  C: number;
  D: number;
  miss: number;
}

export function countZones(hits: Hit[]): ZoneCounts {
  const c: ZoneCounts = { A: 0, C: 0, D: 0, miss: 0 };
  for (const h of hits) c[h.zone]++;
  return c;
}

/** Raw points; may be negative before clamping. */
export function totalPoints(hits: Hit[]): number {
  return hits.reduce((s, h) => s + h.pts, 0);
}

/** Scoring rounds — hits on paper. Misses don't count as rounds. */
export function scoringRounds(hits: Hit[]): number {
  return hits.filter((h) => h.zone !== 'miss').length;
}

/** Hit factor = clamped points ÷ time. 0 when time is not positive. */
export function hitFactor(points: number, timeSec: number): number {
  if (timeSec <= 0) return 0;
  return Math.max(points, 0) / timeSec;
}

export function breakdownString(c: ZoneCounts): string {
  return `${c.A}A ${c.C}C ${c.D}D ${c.miss}M`;
}

/** Target-space anchors for quick-fill clusters (viewBox 450×750) */
const QF_ANCHORS: Record<Exclude<Zone, 'miss'>, { x: number; y: number; cols: number; dx: number; dy: number }> = {
  A: { x: 225, y: 320, cols: 4, dx: 30, dy: 32 },
  C: { x: 100, y: 300, cols: 2, dx: 26, dy: 36 },
  D: { x: 34, y: 340, cols: 1, dx: 0, dy: 40 },
};

/**
 * Drop N expected hits in a neat cluster inside the chosen zone. The
 * shooter then corrects only the exceptions. Positions are synthetic and
 * flagged `prefilled` so placement analytics can exclude them.
 */
export function quickFill(n: number, zone: Exclude<Zone, 'miss'>): Hit[] {
  const count = Math.max(1, Math.min(32, n));
  const a = QF_ANCHORS[zone];
  const out: Hit[] = [];
  for (let i = 0; i < count; i++) {
    const col = i % a.cols;
    const row = Math.floor(i / a.cols);
    out.push({
      zone,
      pts: ZONE_PTS[zone],
      prefilled: true,
      x: a.x + (col - (a.cols - 1) / 2) * a.dx,
      y: a.y + row * a.dy,
    });
  }
  return out;
}

/** Parse "12 rds · ..." style meta into a round count, if present. */
export function parseRoundCount(meta: string | undefined): number | null {
  if (!meta) return null;
  const m = meta.match(/(\d+)\s*rds?/i);
  return m ? Math.min(parseInt(m[1], 10), 32) : null;
}

export const avg = (a: number[]): number =>
  a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
