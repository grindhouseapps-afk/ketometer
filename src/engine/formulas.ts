import {
  FAT_SHARE_EMPTY,
  FAT_SHARE_FULL,
  KCAL_PER_G_CARB,
  KCAL_PER_LB_FAT,
  LB_PER_KG,
  MUSCLE_GLYCOGEN_G_PER_KG_LEAN,
  PROTEIN_G_PER_LB_LEAN,
} from './constants.ts';

export type Sex = 'male' | 'female';

export const lbToKg = (lb: number) => lb / LB_PER_KG;
export const inToCm = (inches: number) => inches * 2.54;

export function leanMassLb(weightLb: number, bodyFatPct: number): number {
  return weightLb * (1 - bodyFatPct / 100);
}

/** Mifflin-St Jeor, kcal/day. */
export function bmrMifflin(sex: Sex, weightLb: number, heightIn: number, ageYears: number): number {
  const base = 10 * lbToKg(weightLb) + 6.25 * inToCm(heightIn) - 5 * ageYears;
  return base + (sex === 'male' ? 5 : -161);
}

export function ageOn(birthDate: Date, on: Date): number {
  let age = on.getFullYear() - birthDate.getFullYear();
  const m = on.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && on.getDate() < birthDate.getDate())) age--;
  return age;
}

export function muscleCapKcal(weightLb: number, bodyFatPct: number): number {
  return lbToKg(leanMassLb(weightLb, bodyFatPct)) * MUSCLE_GLYCOGEN_G_PER_KG_LEAN * KCAL_PER_G_CARB;
}

/** Fat to burn to reach goal body fat %, kcal. Null if goal is not below current. */
export function fatToGoalKcal(weightLb: number, bodyFatPct: number, goalPct: number): number | null {
  if (!(goalPct < bodyFatPct) || goalPct <= 0) return null;
  const goalWeight = leanMassLb(weightLb, bodyFatPct) / (1 - goalPct / 100);
  return (weightLb - goalWeight) * KCAL_PER_LB_FAT;
}

export function proteinTargetG(weightLb: number, bodyFatPct: number): number {
  return Math.round(leanMassLb(weightLb, bodyFatPct) * PROTEIN_G_PER_LB_LEAN);
}

/** Fat share of total burn given how full the liver tank is (0..1). */
export function fatShare(liverFraction: number): number {
  const f = Math.min(1, Math.max(0, liverFraction));
  return FAT_SHARE_EMPTY - (FAT_SHARE_EMPTY - FAT_SHARE_FULL) * f;
}

/** Manual activity estimate: MET x kg x hours. */
export function metKcal(met: number, weightLb: number, minutes: number): number {
  return met * lbToKg(weightLb) * (minutes / 60);
}

/** Distance-based estimates (gross kcal). */
export const walkKcal = (weightLb: number, miles: number) => 0.53 * weightLb * miles;
export const runKcal = (weightLb: number, miles: number) => 0.72 * weightLb * miles;

/** Compendium-style MET values for the manual activity list. */
export const METS: Record<string, number> = {
  walk: 3.5,
  run: 9.8,
  bike: 7.5,
  row: 7.0,
  swim: 7.0,
  weights: 5.0,
  yoga: 2.5,
  hiit: 8.0,
};
