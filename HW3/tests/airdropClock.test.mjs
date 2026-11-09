import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRemainingMs } from '../src/utils/airdropClock.js';

test('time left uses absolute target, not ticks', () => {
  assert.equal(calculateRemainingMs(15_000, 0, 10_000), 5_000);
  assert.equal(calculateRemainingMs(15_000, 0, 14_800), 200);
});

test('past and exact target clamp to zero', () => {
  assert.equal(calculateRemainingMs(15_000, 0, 15_000), 0);
  assert.equal(calculateRemainingMs(15_000, 0, 200_000), 0);
});

test('server offset sign: positive server offset shortens remaining time', () => {
  assert.equal(calculateRemainingMs(15_000, 2_000, 10_000), 3_000);
  assert.equal(calculateRemainingMs(15_000, -2_000, 10_000), 7_000);
});

test('arbitrary background delay never accumulates tick drift', () => {
  const target = 130_000;
  assert.equal(calculateRemainingMs(target, 0, 100_000), 30_000);
  assert.equal(calculateRemainingMs(target, 0, 129_999), 1);
  assert.equal(calculateRemainingMs(target, 0, 181_000), 0);
});

test('changing target and offset computes new time from current epoch', () => {
  assert.equal(calculateRemainingMs(50_000, 0, 20_000), 30_000);
  assert.equal(calculateRemainingMs(80_000, 0, 20_000), 60_000);
  assert.equal(calculateRemainingMs(80_000, 5_000, 20_000), 55_000);
});

test('rejects invalid epochs and offsets', () => {
  for (const invalid of [NaN, Infinity, -Infinity, null, '1000', undefined]) {
    assert.throws(() => calculateRemainingMs(invalid, 0, 100), TypeError);
  }
  assert.throws(() => calculateRemainingMs(100, NaN, 0), TypeError);
  assert.throws(() => calculateRemainingMs(100, 0, Infinity), TypeError);
});
