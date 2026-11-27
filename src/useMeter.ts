import { useEffect, useMemo, useState } from 'react';
import { simulate, type EngineState } from './engine/simulate.ts';
import { useApp } from './store.ts';

/** Re-runs the engine from the store, refreshing every minute. Null until onboarding data exists. */
export function useMeter(): EngineState | null {
  const s = useApp();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  return useMemo(() => computeMeter(s), [s.readings, s.foods, s.activities, s.burns, s.startAt, s.goalBodyFatPct, s.sex, s.birthDate, s.heightIn, s.netCarbBudgetG, s.source, tick]);
}

export function computeMeter(s: ReturnType<typeof useApp.getState>, now = new Date()): EngineState | null {
  if (!s.startAt || s.readings.length === 0 || s.goalBodyFatPct == null) return null;
  try {
    return simulate({
      profile: { sex: s.sex, birthDate: new Date(s.birthDate), heightIn: s.heightIn, goalBodyFatPct: s.goalBodyFatPct, netCarbBudgetG: s.netCarbBudgetG },
      readings: s.readings.map((r) => ({ at: new Date(r.at), weightLb: r.weightLb, bodyFatPct: r.bodyFatPct })),
      startAt: new Date(s.startAt),
      now,
      burns: s.source === 'manual' ? [] : s.burns.map((b) => ({ start: new Date(b.start), end: new Date(b.end), totalKcal: b.totalKcal, activeKcal: b.activeKcal })),
      foods: s.foods.map((f) => ({ at: new Date(f.at), netCarbsG: f.netCarbsG, proteinG: f.proteinG, fatG: f.fatG, kcal: f.kcal })),
      activities: s.activities.map((a) => ({ at: new Date(a.at), minutes: a.minutes, grossKcal: a.grossKcal, countIt: a.countIt })),
      hasDevice: s.source !== 'manual',
    });
  } catch {
    return null;
  }
}
