// Web preview only: ?demo=1 (stage 1), ?demo=2 (fat burn), ?demo=onb (fresh onboarding).
import { Platform } from 'react-native';
import { useApp } from './store.ts';

export function maybeSeedDemo() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const p = new URLSearchParams(window.location.search).get('demo');
  if (!p) return;
  const s = useApp.getState();
  if (p === 'onb') { s.reset(); return; }
  const seedPaywall = p === 'paywall';
  const H = 3_600_000;
  const now = Date.now();
  const hoursSinceStart = p === '2' ? 40 : 11;
  const today = new Date(); today.setHours(7, 2, 0, 0);
  s.reset();
  useApp.getState().set({
    onboarded: true,
    sex: 'male',
    birthDate: '1990-03-01',
    heightIn: 71,
    goalBodyFatPct: 9.9,
    startAt: new Date(now - hoursSinceStart * H).toISOString(),
    source: 'whoop',
    lastSyncAt: new Date(now - 4 * 60_000).toISOString(),
    readings: [{ id: 'r1', at: new Date(+today - (p === '2' ? 0 : 0)).toISOString(), weightLb: 185.4, bodyFatPct: 13.6, source: 'manual' }],
    burns: Array.from({ length: hoursSinceStart }, (_, i) => {
      const start = now - (hoursSinceStart - i) * H;
      const active = i % 7 === 3 ? 260 : 18;
      return { start: new Date(start).toISOString(), end: new Date(start + H).toISOString(), totalKcal: 80 + active, activeKcal: active };
    }),
    foods: [
      { id: 'f1', at: new Date(now - 3 * H).toISOString(), name: 'Protein shake', proteinG: 25, netCarbsG: 2, fatG: 1, kcal: 117 },
      { id: 'f2', at: new Date(now - 2 * H).toISOString(), name: '3 eggs', proteinG: 18, netCarbsG: 1, fatG: 15, kcal: 215 },
      { id: 'f3', at: new Date(now - 1 * H).toISOString(), name: 'Bacon', proteinG: 19, netCarbsG: p === '2' ? 0 : 3, fatG: 32, kcal: 508 },
    ],
  });
}
