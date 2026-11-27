import { useApp } from '../store.ts';
import { fetchAppleBurns, latestAppleBody } from './health.ts';
import { syncWhoop, type WhoopSync } from './whoop.ts';

export let lastWhoopWorkouts: WhoopSync['workouts'] = [];

/** Pull burn data from the one connected source, plus the newest Apple Health body reading. */
export async function syncNow(): Promise<boolean> {
  const s = useApp.getState();
  if (!s.startAt) return false;
  const since = new Date(Math.min(+new Date(s.startAt), Date.now() - 14 * 864e5));
  let ok = true;
  try {
    if (s.source === 'apple') {
      const burns = await fetchAppleBurns(since);
      useApp.getState().set({ burns, lastSyncAt: new Date().toISOString() });
    } else if (s.source === 'whoop') {
      const r = await syncWhoop(since);
      if (r) {
        lastWhoopWorkouts = r.workouts;
        useApp.getState().set({ burns: r.burns, lastSyncAt: new Date().toISOString() });
      } else ok = false;
    }
    const body = await latestAppleBody().catch(() => null);
    if (body && !useApp.getState().readings.some((r) => Math.abs(+new Date(r.at) - +new Date(body.at)) < 60_000)) {
      const latest = useApp.getState().readings.at(-1);
      if (!latest || body.at > latest.at) useApp.getState().addReading({ ...body, source: 'apple' });
    }
  } catch {
    ok = false;
  }
  return ok;
}

export function syncAgo(iso: string | null): string {
  if (!iso) return 'not synced yet';
  const m = Math.round((Date.now() - +new Date(iso)) / 60_000);
  if (m < 1) return 'synced just now';
  if (m < 60) return `synced ${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `synced ${h} h ago` : `synced ${Math.round(h / 24)} d ago`;
}

export const sourceName = (s: string) => (s === 'whoop' ? 'WHOOP' : s === 'apple' ? 'Apple Health' : 'Manual');
