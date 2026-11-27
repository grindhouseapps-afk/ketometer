// KetoMeter engine: replays every event from the start point to `now`
// in 15-minute steps and returns what the Today screen shows.
import {
  ACTIVE_CARB_FROM_MUSCLE,
  DEFAULT_NET_CARB_BUDGET_G,
  FAT_BURN_AT_KCAL,
  KCAL_PER_G_CARB,
  LIVER_CAP_KCAL,
  LIVER_SHARE_OF_RESTING_CARB,
  PACE_WINDOW_HOURS,
  STEP_MINUTES,
} from './constants.ts';
import {
  ageOn,
  bmrMifflin,
  fatShare,
  fatToGoalKcal,
  muscleCapKcal,
  proteinTargetG,
  type Sex,
} from './formulas.ts';

export interface Profile {
  sex: Sex;
  birthDate: Date;
  heightIn: number;
  goalBodyFatPct: number;
  netCarbBudgetG?: number;
}
export interface Reading { at: Date; weightLb: number; bodyFatPct: number }
/** Calories burned from the primary source over an interval. activeKcal optional (derived from BMR if missing). */
export interface BurnSample { start: Date; end: Date; totalKcal: number; activeKcal?: number }
export interface FoodLog { at: Date; netCarbsG: number; proteinG: number; fatG: number; kcal: number }
/** Manual activity, gross kcal estimate (MET or distance based). */
export interface Activity { at: Date; minutes: number; grossKcal: number; countIt?: boolean }

export interface EngineInput {
  profile: Profile;
  readings: Reading[];
  /** Moment the tanks are assumed full (last carbs / onboarding start). */
  startAt: Date;
  now: Date;
  burns: BurnSample[];
  foods: FoodLog[];
  activities: Activity[];
  /** True when a burn source (WHOOP, Apple Health) is connected; manual activities then only count when countIt. */
  hasDevice: boolean;
}

export interface EngineState {
  stage: 1 | 2;
  liverKcal: number;
  liverCapKcal: number;
  muscleKcal: number;
  muscleCapKcal: number;
  /** Big gauge number in stage 1. */
  kcalToFatBurn: number;
  /** Fat share of burn right now, 0..1. */
  fatShareNow: number;
  fatToGoalKcal: number | null;
  goalReached: boolean;
  /** Fat count for the stage-2 gauge: remaining / starting at the latest reading. */
  fatGoalStartKcal: number | null;
  hoursToFatBurn: number | null;
  bmrPerDay: number;
  proteinTargetG: number;
  netCarbBudgetG: number;
  today: {
    eatenKcal: number;
    burnedKcal: number;
    fatBurnedKcal: number;
    proteinG: number;
    netCarbsG: number;
    fatG: number;
    restFilledHours: number;
  };
  latestReading: Reading;
}

const MIN = 60_000;

function overlapMin(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart)) / MIN;
}

function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

interface Tanks { liver: number; muscle: number; muscleCap: number }

/** One step of draining. Returns glycogen used and fat burned. */
function burnStep(t: Tanks, restKcal: number, activeKcal: number) {
  const fs = fatShare(t.liver / LIVER_CAP_KCAL);
  const carb = 1 - fs;
  let liverDraw = restKcal * carb * LIVER_SHARE_OF_RESTING_CARB + activeKcal * carb * (1 - ACTIVE_CARB_FROM_MUSCLE);
  let muscleDraw = activeKcal * carb * ACTIVE_CARB_FROM_MUSCLE;
  liverDraw = Math.min(liverDraw, t.liver);
  muscleDraw = Math.min(muscleDraw, t.muscle);
  t.liver -= liverDraw;
  t.muscle -= muscleDraw;
  const total = restKcal + activeKcal;
  return { glycogen: liverDraw + muscleDraw, fat: total - liverDraw - muscleDraw, total };
}

/** Food: net carbs refill liver first, then muscle. Overflow and non-carb calories add back to the fat count. */
function eat(t: Tanks, f: FoodLog): number {
  const carbKcal = Math.max(0, f.netCarbsG) * KCAL_PER_G_CARB;
  const toLiver = Math.min(carbKcal, LIVER_CAP_KCAL - t.liver);
  t.liver += toLiver;
  const toMuscle = Math.min(carbKcal - toLiver, t.muscleCap - t.muscle);
  t.muscle += toMuscle;
  const overflow = carbKcal - toLiver - toMuscle;
  const nonCarb = Math.max(0, f.kcal - carbKcal);
  return overflow + nonCarb;
}

export function simulate(input: EngineInput): EngineState {
  const { profile, now, hasDevice } = input;
  const readings = [...input.readings].sort((a, b) => +a.at - +b.at);
  if (readings.length === 0) throw new Error('At least one body reading is required');
  const foods = [...input.foods].sort((a, b) => +a.at - +b.at);
  const burns = [...input.burns].sort((a, b) => +a.start - +b.start);
  const countedActs = input.activities.filter((a) => !hasDevice || a.countIt);

  const readingAt = (ms: number) => {
    let r = readings[0];
    for (const x of readings) if (+x.at <= ms) r = x;
    return r;
  };
  const bmrAt = (ms: number) => {
    const r = readingAt(ms);
    return bmrMifflin(profile.sex, r.weightLb, profile.heightIn, ageOn(profile.birthDate, new Date(ms)));
  };

  const start = +input.startAt;
  const end = +now;
  const dayStart = startOfDay(now);

  let reading = readingAt(start);
  const tanks: Tanks = {
    liver: LIVER_CAP_KCAL,
    muscleCap: muscleCapKcal(reading.weightLb, reading.bodyFatPct),
    muscle: 0,
  };
  tanks.muscle = tanks.muscleCap;

  let anchor = fatToGoalKcal(reading.weightLb, reading.bodyFatPct, profile.goalBodyFatPct);
  let fatSinceAnchor = 0;

  const today = { eatenKcal: 0, burnedKcal: 0, fatBurnedKcal: 0, proteinG: 0, netCarbsG: 0, fatG: 0, restFilledHours: 0 };
  const history: { t: number; rest: number; active: number }[] = [];

  let fi = 0;
  const stepMs = STEP_MINUTES * MIN;
  for (let t = start; t < end; t += stepMs) {
    const t2 = Math.min(end, t + stepMs);
    const mins = (t2 - t) / MIN;

    // New body reading: resize tanks (never refill), re-anchor the fat count.
    const r = readingAt(t);
    if (r !== reading) {
      const drained = tanks.muscleCap - tanks.muscle;
      reading = r;
      tanks.muscleCap = muscleCapKcal(r.weightLb, r.bodyFatPct);
      tanks.muscle = Math.max(0, tanks.muscleCap - drained);
      anchor = fatToGoalKcal(r.weightLb, r.bodyFatPct, profile.goalBodyFatPct);
      fatSinceAnchor = 0;
    }

    // Food logged in this step.
    while (fi < foods.length && +foods[fi].at < t2) {
      const f = foods[fi++];
      if (+f.at < start) continue;
      fatSinceAnchor -= eat(tanks, f);
      if (+f.at >= dayStart) {
        today.eatenKcal += f.kcal;
        today.proteinG += f.proteinG;
        today.netCarbsG += f.netCarbsG;
        today.fatG += f.fatG;
      }
    }

    // Burn: source samples, BMR fill for uncovered minutes, counted manual activities.
    const bmrMin = bmrAt(t) / 1440;
    let total = 0;
    let active = 0;
    let covered = 0;
    for (const b of burns) {
      if (+b.start >= t2) break;
      const ov = overlapMin(t, t2, +b.start, +b.end);
      if (ov <= 0) continue;
      const dur = (+b.end - +b.start) / MIN;
      const share = ov / dur;
      const sampleTotal = b.totalKcal * share;
      const sampleActive = b.activeKcal != null ? b.activeKcal * share : Math.max(0, sampleTotal - bmrMin * ov);
      total += sampleTotal;
      active += Math.min(sampleActive, sampleTotal);
      covered += ov;
    }
    const filled = Math.max(0, mins - covered);
    total += bmrMin * filled;
    for (const a of countedActs) {
      const ov = overlapMin(t, t2, +a.at, +a.at + a.minutes * MIN);
      if (ov <= 0) continue;
      // Net of resting burn for the activity's duration, so nothing counts twice.
      const net = Math.max(0, a.grossKcal - bmrAt(+a.at) / 1440 * a.minutes) * (ov / a.minutes);
      total += net;
      active += net;
    }
    const rest = total - active;

    const res = burnStep(tanks, rest, active);
    fatSinceAnchor += res.fat;
    history.push({ t, rest, active });
    if (t >= dayStart) {
      today.burnedKcal += res.total;
      today.fatBurnedKcal += res.fat;
      today.restFilledHours += filled / 60;
    }
  }
  // Food logged in the future relative to the last step is ignored by design.

  const stage: 1 | 2 = tanks.liver <= FAT_BURN_AT_KCAL ? 2 : 1;
  const fatLeft = anchor == null ? null : Math.max(0, anchor - fatSinceAnchor);

  // "At your pace": recent burn rate, assume fasting, step forward until the liver tank is empty.
  let hoursToFatBurn: number | null = stage === 2 ? 0 : null;
  if (stage === 1) {
    const windowStart = end - PACE_WINDOW_HOURS * 60 * MIN;
    const recent = history.filter((h) => h.t >= windowStart);
    const span = recent.length * STEP_MINUTES;
    const bmrStep = bmrAt(end) / 1440 * STEP_MINUTES;
    const restStep = span > 0 ? recent.reduce((s, h) => s + h.rest, 0) / recent.length : bmrStep;
    const activeStep = span > 0 ? recent.reduce((s, h) => s + h.active, 0) / recent.length : 0;
    const sim: Tanks = { ...tanks };
    const maxSteps = (96 * 60) / STEP_MINUTES;
    for (let i = 1; i <= maxSteps; i++) {
      burnStep(sim, restStep, activeStep);
      if (sim.liver <= FAT_BURN_AT_KCAL) {
        hoursToFatBurn = (i * STEP_MINUTES) / 60;
        break;
      }
    }
  }

  const latest = readingAt(end);
  return {
    stage,
    liverKcal: tanks.liver,
    liverCapKcal: LIVER_CAP_KCAL,
    muscleKcal: tanks.muscle,
    muscleCapKcal: tanks.muscleCap,
    kcalToFatBurn: Math.max(0, tanks.liver - FAT_BURN_AT_KCAL),
    fatShareNow: fatShare(tanks.liver / LIVER_CAP_KCAL),
    fatToGoalKcal: fatLeft,
    goalReached: fatLeft != null && fatLeft <= 0,
    fatGoalStartKcal: anchor,
    hoursToFatBurn,
    bmrPerDay: bmrAt(end),
    proteinTargetG: proteinTargetG(latest.weightLb, latest.bodyFatPct),
    netCarbBudgetG: profile.netCarbBudgetG ?? DEFAULT_NET_CARB_BUDGET_G,
    today,
    latestReading: latest,
  };
}
