import type { StoredBurn } from './store';

const KJ_PER_KCAL = 4.184;

interface Span { start: string; end: string | null }
interface WhoopCycle extends Span { updated_at: string; score_state: string; score?: { kilojoule?: number } | null }
interface WhoopWorkout extends Span { score_state: string; score?: { kilojoule?: number } | null }
export interface SyncResponse { cycles: WhoopCycle[]; workouts: WhoopWorkout[] }

/**
 * Turns WHOOP cycles and workouts into non-overlapping burn samples:
 * each workout is its own sample, and the rest of the cycle's calories are spread
 * over the cycle's time outside workouts. A cycle in progress ends at its last update,
 * so the engine fills the gap since then with resting burn.
 */
export function toBurnSamples(data: SyncResponse, now = Date.now()): StoredBurn[] {
  const kcal = (s?: { kilojoule?: number } | null) => (s?.kilojoule ?? 0) / KJ_PER_KCAL;
  const workouts = data.workouts
    .filter((w) => w.score_state === 'SCORED' && w.end)
    .map((w) => ({ start: Date.parse(w.start), end: Date.parse(w.end!), totalKcal: kcal(w.score) }))
    .filter((w) => w.end > w.start && w.totalKcal > 0);

  const out: StoredBurn[] = [...workouts];
  for (const c of data.cycles) {
    if (c.score_state !== 'SCORED') continue;
    const start = Date.parse(c.start);
    const end = Math.min(now, c.end ? Date.parse(c.end) : Date.parse(c.updated_at));
    if (!(end > start)) continue;
    const inside = workouts.filter((w) => w.start < end && w.end > start).sort((a, b) => a.start - b.start);
    // Gaps between workouts inside this cycle.
    const segs: [number, number][] = [];
    let cur = start;
    let workoutKcal = 0;
    for (const w of inside) {
      const ws = Math.max(start, w.start);
      const we = Math.min(end, w.end);
      if (ws > cur) segs.push([cur, ws]);
      cur = Math.max(cur, we);
      workoutKcal += w.totalKcal * ((we - ws) / (w.end - w.start));
    }
    if (end > cur) segs.push([cur, end]);
    const restKcal = Math.max(0, kcal(c.score) - workoutKcal);
    const restMs = segs.reduce((s, [a, b]) => s + (b - a), 0);
    if (restMs <= 0) continue;
    for (const [a, b] of segs) out.push({ start: a, end: b, totalKcal: restKcal * ((b - a) / restMs) });
  }
  return out.sort((a, b) => a.start - b.start);
}

