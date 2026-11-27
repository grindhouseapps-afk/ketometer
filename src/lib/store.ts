import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Sex } from '@/engine/formulas.ts';

/** All times are epoch ms so the store serializes cleanly. */
export interface StoredProfile {
  sex: Sex;
  birthYear: number;
  heightIn: number;
  goalBodyFatPct: number;
  netCarbBudgetG: number;
}
export interface StoredReading { id: string; at: number; weightLb: number; bodyFatPct: number }
export interface StoredFood { id: string; at: number; name: string; netCarbsG: number; proteinG: number; fatG: number; kcal: number }
export interface StoredActivity { id: string; at: number; kind: string; minutes: number; grossKcal: number; countIt: boolean }
export interface StoredBurn { start: number; end: number; totalKcal: number; activeKcal?: number }
export interface Preset { id: string; name: string; netCarbsG: number; proteinG: number; fatG: number; kcal: number }

export type BurnSource = 'whoop' | 'manual';

export interface OnboardingAnswers {
  goal?: number;
  exp?: number;
  struggle?: number[];
}

interface State {
  onboarded: boolean;
  answers: OnboardingAnswers;
  profile: StoredProfile;
  readings: StoredReading[];
  startAt: number;
  foods: StoredFood[];
  activities: StoredActivity[];
  presets: Preset[];
  source: BurnSource;
  whoopConnected: boolean;
  whoopSyncedAt: number | null;
  burns: StoredBurn[];
  notificationsOn: boolean;
  /** Goal % already celebrated with the Supernova screen, so it plays once per goal. */
  celebratedGoal: number | null;
  /** Last known entitlement, used while RevenueCat loads. */
  proCached: boolean;

  set: (p: Partial<State>) => void;
  setProfile: (p: Partial<StoredProfile>) => void;
  addReading: (r: Omit<StoredReading, 'id'>) => void;
  addFood: (f: Omit<StoredFood, 'id'>) => void;
  addActivity: (a: Omit<StoredActivity, 'id'>) => void;
  addPreset: (p: Omit<Preset, 'id'>) => void;
  removePreset: (id: string) => void;
  removeEntry: (kind: 'food' | 'activity' | 'reading', id: string) => void;
  mergeBurns: (b: StoredBurn[], since: number) => void;
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const DEFAULT_PRESETS: Preset[] = [
  { id: 'p-shake', name: 'Protein shake', proteinG: 25, netCarbsG: 2, fatG: 1, kcal: 117 },
  { id: 'p-eggs', name: '3 eggs', proteinG: 18, netCarbsG: 1, fatG: 15, kcal: 215 },
  { id: 'p-steak', name: 'Steak', proteinG: 50, netCarbsG: 0, fatG: 30, kcal: 470 },
  { id: 'p-avocado', name: 'Avocado', proteinG: 3, netCarbsG: 3, fatG: 22, kcal: 230 },
];

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      onboarded: false,
      answers: {},
      profile: { sex: 'male', birthYear: 1990, heightIn: 71, goalBodyFatPct: 15, netCarbBudgetG: 25 },
      readings: [],
      startAt: Date.now(),
      foods: [],
      activities: [],
      presets: DEFAULT_PRESETS,
      source: 'manual',
      whoopConnected: false,
      whoopSyncedAt: null,
      burns: [],
      notificationsOn: false,
      celebratedGoal: null,
      proCached: false,

      set: (p) => set(p),
      setProfile: (p) => set({ profile: { ...get().profile, ...p } }),
      addReading: (r) => set({ readings: [...get().readings, { ...r, id: uid() }].sort((a, b) => a.at - b.at) }),
      addFood: (f) => set({ foods: [...get().foods, { ...f, id: uid() }].sort((a, b) => a.at - b.at) }),
      addActivity: (a) => set({ activities: [...get().activities, { ...a, id: uid() }].sort((x, y) => x.at - y.at) }),
      addPreset: (p) => set({ presets: [{ ...p, id: uid() }, ...get().presets] }),
      removePreset: (id) => set({ presets: get().presets.filter((p) => p.id !== id) }),
      removeEntry: (kind, id) => {
        const s = get();
        if (kind === 'food') set({ foods: s.foods.filter((x) => x.id !== id) });
        if (kind === 'activity') set({ activities: s.activities.filter((x) => x.id !== id) });
        // The first reading anchors the meter; it can be corrected in Settings but not deleted.
        if (kind === 'reading' && s.readings.length > 1) set({ readings: s.readings.filter((x) => x.id !== id) });
      },
      /** Replace every burn sample that starts at or after `since` with the fresh batch. */
      mergeBurns: (b, since) =>
        set({ burns: [...get().burns.filter((x) => x.start < since), ...b].sort((x, y) => x.start - y.start) }),
    }),
    {
      name: 'ketometer-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ set: _s, setProfile: _sp, addReading: _ar, addFood: _af, addActivity: _aa, addPreset: _ap, removePreset: _rp, removeEntry: _re, mergeBurns: _mb, ...rest }) => rest,
    },
  ),
);

/** Resolves once the persisted state has been read from disk. */
export function useHydrated() {
  const [h, setH] = useState(useStore.persist.hasHydrated());
  useEffect(() => {
    const unsub = useStore.persist.onFinishHydration(() => setH(true));
    if (useStore.persist.hasHydrated()) setH(true);
    return unsub;
  }, []);
  return h;
}
