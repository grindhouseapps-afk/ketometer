// Apple Health (HealthKit). iOS only; everything is a no-op elsewhere (web preview).
import { Platform } from 'react-native';
import type { BurnRec } from '../store.ts';

const ACTIVE = 'HKQuantityTypeIdentifierActiveEnergyBurned';
const BASAL = 'HKQuantityTypeIdentifierBasalEnergyBurned';
const MASS = 'HKQuantityTypeIdentifierBodyMass';
const FAT = 'HKQuantityTypeIdentifierBodyFatPercentage';

const hk = () => (Platform.OS === 'ios' ? require('@kingstinct/react-native-healthkit') : null);

export async function connectAppleHealth(): Promise<boolean> {
  const H = hk();
  if (!H || !H.isHealthDataAvailable()) return false;
  return H.requestAuthorization({ toRead: [ACTIVE, BASAL, MASS, FAT, 'HKWorkoutTypeIdentifier'], toShare: [MASS, FAT] });
}

async function hourly(H: any, id: string, start: Date, end: Date): Promise<Map<number, number>> {
  const rows = await H.queryStatisticsCollectionForQuantity(id, ['cumulativeSum'], start, { hour: 1 }, { filter: { date: { startDate: start, endDate: end } }, unit: 'kcal' });
  const m = new Map<number, number>();
  for (const r of rows) if (r.startDate && r.sumQuantity) m.set(+new Date(r.startDate), r.sumQuantity.quantity);
  return m;
}

/** Hourly total and active calories since `since`. Hours with no data are left out so the engine fills them with BMR. */
export async function fetchAppleBurns(since: Date): Promise<BurnRec[]> {
  const H = hk();
  if (!H) return [];
  const start = new Date(since); start.setMinutes(0, 0, 0);
  const now = new Date();
  const [active, basal] = await Promise.all([hourly(H, ACTIVE, start, now), hourly(H, BASAL, start, now)]);
  const out: BurnRec[] = [];
  for (let t = +start; t < +now; t += 3_600_000) {
    const b = basal.get(t) ?? 0;
    const a = active.get(t) ?? 0;
    if (b <= 0) continue; // no resting data (no watch worn): let the engine fill with BMR
    out.push({ start: new Date(t).toISOString(), end: new Date(Math.min(t + 3_600_000, +now)).toISOString(), totalKcal: a + b, activeKcal: a });
  }
  return out;
}

export async function latestAppleBody(): Promise<{ at: string; weightLb: number; bodyFatPct: number } | null> {
  const H = hk();
  if (!H) return null;
  const [m, f] = await Promise.all([H.getMostRecentQuantitySample(MASS, 'lb'), H.getMostRecentQuantitySample(FAT, '%')]);
  if (!m || !f) return null;
  const pct = f.quantity <= 1 ? f.quantity * 100 : f.quantity;
  const at = new Date(Math.max(+new Date(m.endDate), +new Date(f.endDate))).toISOString();
  return { at, weightLb: m.quantity, bodyFatPct: Math.round(pct * 10) / 10 };
}

export async function saveBodyToHealth(weightLb: number, bodyFatPct: number, at: Date) {
  const H = hk();
  if (!H) return;
  try {
    await H.saveQuantitySample(MASS, 'lb', weightLb, at, at);
    await H.saveQuantitySample(FAT, '%', bodyFatPct / 100, at, at);
  } catch {}
}
