import test from 'node:test';
import assert from 'node:assert/strict';
import { PIANO_KEYS } from '../src/utils/generatePianoKeys.js';

// This checks the prop contract required by React.memo. It is NOT a substitute
// for a React DevTools Profiler measurement of actual committed renders.
function makeProps(pressed, onNoteOn, onNoteOff) {
  return PIANO_KEYS.map(({ midi, noteName, isBlack, whiteIndex }) => ({
    midi, noteName, isBlack, whiteIndex,
    isPressed: pressed.has(midi), onNoteOn, onNoteOff,
  }));
}

function shallowEqual(a, b) {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length &&
    keys.every((key) => Object.is(a[key], b[key]));
}

test('only one memoized PianoKey prop record changes when C4 is pressed', () => {
  const onNoteOn = () => {};
  const onNoteOff = () => {};
  const before = makeProps(new Set(), onNoteOn, onNoteOff);
  const after = makeProps(new Set([60]), onNoteOn, onNoteOff);
  const changed = after.filter((props, index) => !shallowEqual(before[index], props));
  assert.equal(before.length, 88);
  assert.deepEqual(changed.map(({ midi }) => midi), [60]);
  assert.equal(changed[0].isPressed, true);
});

test('chord updates affect only the keys whose pressed values changed', () => {
  const onNoteOn = () => {};
  const onNoteOff = () => {};
  const before = makeProps(new Set([60, 64]), onNoteOn, onNoteOff);
  const after = makeProps(new Set([64, 67]), onNoteOn, onNoteOff);
  assert.deepEqual(after.filter((props, index) => !shallowEqual(before[index], props))
    .map(({ midi }) => midi), [60, 67]);
});
