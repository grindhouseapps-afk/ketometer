// App state, persisted on the phone (AsyncStorage). Health data never leaves the device,
// except WHOOP tokens, which live server-side keyed by an anonymous device id.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Sex } from './engine/formulas.ts';

export type BurnSource = 'whoop' | 'apple' | 'manual';

export interface ReadingRec { id: string; at: string; weightLb: number; bodyFatPct: number; source: 'manual' | 'apple' }
export interface FoodRec { id: string; at: string; name: string; netCarbsG: number; proteinG: number; fatG: number; kcal: number }
export interface PresetRec { id: string; name: string; netCarbsG: number; proteinG: number; fatG: number; kcal: number }
export interface ActivityRec { id: string; at: string; kind: string; minutes: number; miles?: number; grossKcal: number; countIt: boolean }
export interface BurnRec { start: string; end: string; totalKcal: number; activeKcal?: number }

export interface NotifPrefs {
  morning: boolean; protein: boolean; milestones: boolean; weighIn: boolean;
  quietStart: number; quietEnd: number;
}

export interface AppState {
  onboarded: boolean;
  sex: Sex;
  birthDate: string; // ISO
  heightIn: number;
  goalBodyFatPct: number | null;
  netCarbBudgetG: number;
  startAt: string | null; // tanks full at this moment
  source: BurnSource;
  readings: ReadingRec[];
  foods: FoodRec[];
  presets: PresetRec[];
  activities: ActivityRec[];
  burns: BurnRec[]; // cached from the connected source
  lastSyncAt: string | null;
  deviceId: string | null;
  deviceSecret: string | null;
  notif: NotifPrefs;
  onboardingAnswers: Record<string, number[]>;
  celebratedGoal: boolean;
  fatBurnCelebratedFor: string | null; // startAt/refill id of last fat-burn moment shown
  set: (p: Partial<AppState>) => void;
  addReading: (r: Omit<ReadingRec, 'id'>) => void;
  updateReading: (r: ReadingRec) => void;
  deleteReading: (id: string) => void;
  addFood: (f: Omit<FoodRec, 'id'>) => void;
  deleteFood: (id: string) => void;
  savePreset: (p: Omit<PresetRec, 'id'> & { id?: string }) => void;
  deletePreset: (id: string) => void;
  addActivity: (a: Omit<ActivityRec, 'id'>) => void;
  deleteActivity: (id: string) => void;
  reset: () => void;
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const DEFAULT_PRESETS: PresetRec[] = [
  { id: 'p1', name: 'Protein shake', proteinG: 25, netCarbsG: 2, fatG: 1, kcal: 117 },
  { id: 'p2', name: '3 eggs', proteinG: 18, netCarbsG: 1, fatG: 15, kcal: 215 },
  { id: 'p3', name: 'Steak', proteinG: 50, netCarbsG: 0, fatG: 30, kcal: 470 },
  { id: 'p4', name: 'Avocado', proteinG: 3, netCarbsG: 3, fatG: 22, kcal: 230 },
];

const initial = {
  onboarded: false,
  sex: 'male' as Sex,
  birthDate: '1990-01-01',
  heightIn: 70,
  goalBodyFatPct: null,
  netCarbBudgetG: 25,
  startAt: null,
  source: 'manual' as BurnSource,
  readings: [],
  foods: [],
  presets: DEFAULT_PRESETS,
  activities: [],
  burns: [],
  lastSyncAt: null,
  deviceId: null,
  deviceSecret: null,
  notif: { morning: true, protein: true, milestones: true, weighIn: true, quietStart: 21, quietEnd: 7 },
  onboardingAnswers: {},
  celebratedGoal: false,
  fatBurnCelebratedFor: null,
};

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      ...initial,
      set: (p) => set(p),
      addReading: (r) => set({ readings: [...get().readings, { ...r, id: uid() }].sort((a, b) => a.at.localeCompare(b.at)) }),
      updateReading: (r) => set({ readings: get().readings.map((x) => (x.id === r.id ? r : x)).sort((a, b) => a.at.localeCompare(b.at)) }),
      deleteReading: (id) => set({ readings: get().readings.filter((x) => x.id !== id) }),
      addFood: (f) => set({ foods: [...get().foods, { ...f, id: uid() }] }),
      deleteFood: (id) => set({ foods: get().foods.filter((x) => x.id !== id) }),
      savePreset: (p) => {
        const list = get().presets;
        if (p.id && list.some((x) => x.id === p.id)) set({ presets: list.map((x) => (x.id === p.id ? { ...x, ...p, id: x.id } : x)) });
        else set({ presets: [...list, { ...p, id: uid() }] });
      },
      deletePreset: (id) => set({ presets: get().presets.filter((x) => x.id !== id) }),
      addActivity: (a) => set({ activities: [...get().activities, { ...a, id: uid() }] }),
      deleteActivity: (id) => set({ activities: get().activities.filter((x) => x.id !== id) }),
      reset: () => set({ ...initial }),
    }),
    { name: 'ketometer-v1', storage: createJSONStorage(() => AsyncStorage), partialize: (s) => { const { set: _s, ...rest } = s as any; return rest; } },
  ),
);
