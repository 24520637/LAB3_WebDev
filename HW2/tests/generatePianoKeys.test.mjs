import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generatePianoKeys,
  PIANO_KEYS,
  LOWEST_MIDI,
  HIGHEST_MIDI,
  PIANO_KEY_COUNT,
} from '../src/utils/generatePianoKeys.js';

const approx = (actual, expected, tolerance = 1e-8) => {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
};

test('generates exactly 88 unique ascending MIDI notes from A0 through C8', () => {
  assert.equal(PIANO_KEY_COUNT, 88);
  assert.equal(LOWEST_MIDI, 21);
  assert.equal(HIGHEST_MIDI, 108);
  assert.equal(PIANO_KEYS.length, 88);
  assert.equal(PIANO_KEYS[0].noteName, 'A0');
  assert.equal(PIANO_KEYS.at(-1).noteName, 'C8');
  assert.deepEqual(PIANO_KEYS.map(({ midi }) => midi), Array.from({ length: 88 }, (_, i) => i + 21));
  assert.equal(new Set(PIANO_KEYS.map(({ midi }) => midi)).size, 88);
});

test('contains 52 white keys and 36 black keys in correct chromatic positions', () => {
  assert.equal(PIANO_KEYS.filter((key) => !key.isBlack).length, 52);
  assert.equal(PIANO_KEYS.filter((key) => key.isBlack).length, 36);
  for (const key of PIANO_KEYS) {
    assert.equal(key.isBlack, [1, 3, 6, 8, 10].includes(key.midi % 12));
  }
});

test('names octaves correctly, including C4, A4, B4 and C5', () => {
  for (const [midi, noteName] of [[21, 'A0'], [22, 'A#0'], [24, 'C1'], [60, 'C4'], [69, 'A4'], [71, 'B4'], [72, 'C5'], [108, 'C8']]) {
    assert.equal(PIANO_KEYS.find((key) => key.midi === midi)?.noteName, noteName);
  }
});

test('uses the equal-tempered MIDI frequency formula for every key', () => {
  for (const key of PIANO_KEYS) {
    approx(key.freqHz, 440 * 2 ** ((key.midi - 69) / 12));
    assert.ok(Number.isFinite(key.freqHz) && key.freqHz > 0);
  }
  approx(PIANO_KEYS[0].freqHz, 27.5);
  approx(PIANO_KEYS.find(({ midi }) => midi === 69).freqHz, 440);
  approx(PIANO_KEYS.at(-1).freqHz, 4186.009044809578, 1e-7);
});

test('white index supports correct ordered white positioning and black overlays', () => {
  let precedingWhites = 0;
  for (const key of PIANO_KEYS) {
    assert.equal(key.whiteIndex, precedingWhites);
    if (!key.isBlack) precedingWhites++;
  }
  assert.equal(precedingWhites, 52);
  assert.deepEqual(PIANO_KEYS.slice(0, 4).map(({ whiteIndex }) => whiteIndex), [0, 1, 1, 2]);
});

test('descriptors are immutable and separate generations are equivalent', () => {
  assert.ok(Object.isFrozen(PIANO_KEYS));
  assert.ok(PIANO_KEYS.every(Object.isFrozen));
  assert.deepEqual(generatePianoKeys(), PIANO_KEYS);
});
