import { useEffect, useMemo, useState } from 'react';
import { simulate, type EngineInput, type EngineState } from '@/engine/simulate.ts';
import { useStore } from './store';

/** Ticks every minute so the meter drains on screen. */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function birthDateFromYear(year: number) {
  return new Date(year, 6, 1);
}

/** Builds the engine input from the store. Exported for one-off projections (onboarding plan, notifications). */
export function engineInput(s: ReturnType<typeof useStore.getState>, now: number): EngineInput | null {
  if (s.readings.length === 0) return null;
  const hasDevice = s.source === 'whoop' && s.whoopConnected;
  return {
    profile: {
      sex: s.profile.sex,
      birthDate: birthDateFromYear(s.profile.birthYear),
      heightIn: s.profile.heightIn,
      goalBodyFatPct: s.profile.goalBodyFatPct,
      netCarbBudgetG: s.profile.netCarbBudgetG,
    },
    readings: s.readings.map((r) => ({ at: new Date(r.at), weightLb: r.weightLb, bodyFatPct: r.bodyFatPct })),
    startAt: new Date(s.startAt),
    now: new Date(now),
    burns: hasDevice ? s.burns.map((b) => ({ start: new Date(b.start), end: new Date(b.end), totalKcal: b.totalKcal, activeKcal: b.activeKcal })) : [],
    foods: s.foods.map((f) => ({ at: new Date(f.at), netCarbsG: f.netCarbsG, proteinG: f.proteinG, fatG: f.fatG, kcal: f.kcal })),
    activities: s.activities.map((a) => ({ at: new Date(a.at), minutes: a.minutes, grossKcal: a.grossKcal, countIt: a.countIt })),
    hasDevice,
  };
}

export function computeMeter(now = Date.now()): EngineState | null {
  const input = engineInput(useStore.getState(), now);
  return input ? simulate(input) : null;
}

export function useMeter(): { state: EngineState | null; now: number } {
  const now = useNow();
  const profile = useStore((s) => s.profile);
  const readings = useStore((s) => s.readings);
  const startAt = useStore((s) => s.startAt);
  const foods = useStore((s) => s.foods);
  const activities = useStore((s) => s.activities);
  const burns = useStore((s) => s.burns);
  const source = useStore((s) => s.source);
  const whoopConnected = useStore((s) => s.whoopConnected);
  const state = useMemo(() => {
    try {
      return computeMeter(now);
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, profile, readings, startAt, foods, activities, burns, source, whoopConnected]);
  return { state, now };
}
