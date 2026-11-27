import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toBurnSamples } from './whoopSamples.ts';

test('workout is its own sample and the cycle remainder fills the gaps', () => {
  const kj = (kcal: number) => kcal * 4.184;
  const out = toBurnSamples(
    {
      cycles: [{ start: '2026-11-26T00:00:00Z', end: '2026-11-26T10:00:00Z', updated_at: '2026-11-26T10:00:00Z', score_state: 'SCORED', score: { kilojoule: kj(1000) } }],
      workouts: [{ start: '2026-11-26T04:00:00Z', end: '2026-11-26T05:00:00Z', score_state: 'SCORED', score: { kilojoule: kj(400) } }],
    },
    Date.parse('2026-11-27T00:00:00Z'),
  );
  assert.equal(out.length, 3);
  const total = out.reduce((s, b) => s + b.totalKcal, 0);
  assert.ok(Math.abs(total - 1000) < 0.01);
  // No overlaps.
  for (let i = 1; i < out.length; i++) assert.ok(out[i].start >= out[i - 1].end);
  // 600 kcal spread over 9 h: 4 h before, 5 h after.
  assert.ok(Math.abs(out[0].totalKcal - (600 * 4) / 9) < 0.01);
});

test('cycle in progress ends at its last update', () => {
  const out = toBurnSamples(
    { cycles: [{ start: '2026-11-26T00:00:00Z', end: null, updated_at: '2026-11-26T06:00:00Z', score_state: 'SCORED', score: { kilojoule: 4184 } }], workouts: [] },
    Date.parse('2026-11-26T08:00:00Z'),
  );
  assert.equal(out[0].end, Date.parse('2026-11-26T06:00:00Z'));
});
