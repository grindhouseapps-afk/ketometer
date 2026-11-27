import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bmrMifflin, fatToGoalKcal, muscleCapKcal, proteinTargetG, fatShare, walkKcal } from './formulas.ts';
import { simulate, type EngineInput } from './simulate.ts';
import { LIVER_CAP_KCAL } from './constants.ts';

const H = 3_600_000;
const near = (a: number, b: number, tol: number, msg?: string) =>
  assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} expected ${b} ±${tol}, got ${a}`);

const base = (over: Partial<EngineInput> = {}): EngineInput => {
  const start = new Date('2026-11-25T21:00:00');
  return {
    profile: { sex: 'male', birthDate: new Date('1990-03-01'), heightIn: 71, goalBodyFatPct: 9.9 },
    readings: [{ at: new Date('2026-11-25T07:00:00'), weightLb: 185.4, bodyFatPct: 13.6 }],
    startAt: start,
    now: new Date(+start + 6 * H),
    burns: [],
    foods: [],
    activities: [],
    hasDevice: false,
    ...over,
  };
};

test('brief worked example: fat to goal 185.4 lb, 13.6% -> 9.9% is ~26,640 kcal', () => {
  near(fatToGoalKcal(185.4, 13.6, 9.9)!, 26640, 15);
});

test('goal must be below current body fat', () => {
  assert.equal(fatToGoalKcal(185.4, 13.6, 13.6), null);
  assert.equal(fatToGoalKcal(185.4, 13.6, 15), null);
});

test('protein target is 1 g per lb lean mass', () => {
  assert.equal(proteinTargetG(185.4, 13.6), 160);
});

test('BMR is Mifflin-St Jeor', () => {
  // 84.1 kg, 180.3 cm, 36 y: 841 + 1127 - 180 + 5
  near(bmrMifflin('male', 185.4, 71, 36), 1793, 2);
  near(bmrMifflin('female', 185.4, 71, 36), 1793 - 166, 2);
});

test('muscle tank is 6 g per kg lean', () => {
  near(muscleCapKcal(185.4, 13.6), 1745, 2);
});

test('fuel mix: 45% fat when liver full, 90% when empty', () => {
  near(fatShare(1), 0.45, 1e-9);
  near(fatShare(0), 0.9, 1e-9);
});

test('walking burns ~100 kcal per mile at ~185 lb', () => {
  near(walkKcal(185.4, 1), 98, 1);
});

test('fasting at rest reaches fat burn in the 12-48 h range', () => {
  const s = simulate(base({ now: new Date('2026-11-25T21:15:00') }));
  assert.equal(s.stage, 1);
  assert.ok(s.hoursToFatBurn! >= 12 && s.hoursToFatBurn! <= 48, `got ${s.hoursToFatBurn} h`);
  const later = simulate(base({ now: new Date(+new Date('2026-11-25T21:00:00') + 50 * H) }));
  assert.equal(later.stage, 2);
  assert.equal(later.hoursToFatBurn, 0);
});

test('a weigh-in resizes tanks but never refills the liver', () => {
  const start = new Date('2026-11-25T21:00:00');
  const without = simulate(base({ now: new Date(+start + 10 * H) }));
  const withReading = simulate(base({
    now: new Date(+start + 10 * H),
    readings: [
      { at: new Date('2026-11-25T07:00:00'), weightLb: 185.4, bodyFatPct: 13.6 },
      { at: new Date(+start + 9 * H), weightLb: 184.6, bodyFatPct: 13.5 },
    ],
  }));
  near(withReading.liverKcal, without.liverKcal, 3, 'liver unchanged by weigh-in');
  assert.ok(withReading.liverKcal < LIVER_CAP_KCAL - 100);
});

test('carbs in stage 2 refill only by their calories (partial, not a restart)', () => {
  const start = new Date('2026-11-25T21:00:00');
  const at = new Date(+start + 50 * H);
  const s = simulate(base({
    now: new Date(+at + 15 * 60_000),
    foods: [{ at, netCarbsG: 10, proteinG: 0, fatG: 0, kcal: 40 }],
  }));
  assert.equal(s.stage, 1);
  assert.ok(s.liverKcal > 30 && s.liverKcal <= 40, `liver ${s.liverKcal}`);
  assert.ok(s.hoursToFatBurn! > 0 && s.hoursToFatBurn! < 8, `${s.hoursToFatBurn} h`);
});

test('protein and fat add back to the fat count, not the liver tank', () => {
  const start = new Date('2026-11-25T21:00:00');
  const now = new Date(+start + 4 * H);
  const a = simulate(base({ now }));
  const b = simulate(base({ now, foods: [{ at: new Date(+start + H), netCarbsG: 0, proteinG: 50, fatG: 30, kcal: 470 }] }));
  near(b.liverKcal, a.liverKcal, 1);
  near(b.fatToGoalKcal! - a.fatToGoalKcal!, 470, 1);
});

test('device sample plus BMR fill never double counts', () => {
  const start = new Date('2026-11-26T06:00:00');
  const now = new Date(+start + 4 * H);
  const s = simulate(base({
    startAt: start,
    now,
    hasDevice: true,
    burns: [{ start, end: new Date(+start + 2 * H), totalKcal: 300, activeKcal: 150 }],
  }));
  const bmrPerH = s.bmrPerDay / 24;
  near(s.today.burnedKcal, 300 + 2 * bmrPerH, 1);
  near(s.today.restFilledHours, 2, 1e-6);
});

test('manual activity counts net of resting burn; ignored with a device unless countIt', () => {
  const start = new Date('2026-11-26T06:00:00');
  const now = new Date(+start + 3 * H);
  const act = { at: new Date(+start + H), minutes: 60, grossKcal: 400 };
  const idle = simulate(base({ startAt: start, now }));
  const manual = simulate(base({ startAt: start, now, activities: [act] }));
  const bmrPerH = idle.bmrPerDay / 24;
  near(manual.today.burnedKcal - idle.today.burnedKcal, 400 - bmrPerH, 1);
  const dev = simulate(base({ startAt: start, now, hasDevice: true, activities: [act] }));
  near(dev.today.burnedKcal, idle.today.burnedKcal, 1);
  const counted = simulate(base({ startAt: start, now, hasDevice: true, activities: [{ ...act, countIt: true }] }));
  near(counted.today.burnedKcal, manual.today.burnedKcal, 1);
});

test('workouts drain muscle mostly, liver a little', () => {
  const start = new Date('2026-11-26T06:00:00');
  const now = new Date(+start + 2 * H);
  const s = simulate(base({ startAt: start, now, hasDevice: true, burns: [{ start, end: now, totalKcal: 900, activeKcal: 750 }] }));
  const muscleUsed = s.muscleCapKcal - s.muscleKcal;
  const liverUsed = LIVER_CAP_KCAL - s.liverKcal;
  assert.ok(muscleUsed > liverUsed, `muscle ${muscleUsed} vs liver ${liverUsed}`);
});
