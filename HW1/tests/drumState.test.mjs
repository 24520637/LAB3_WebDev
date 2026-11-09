import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_HIT_HISTORY,
  drumReducer,
  initialDrumState,
} from '../src/state/drumState.js';

const hit = (state, padId) => drumReducer(state, { type: 'HIT', padId });

test('one hit activates pad and creates one history entry', () => {
  const state = hit(initialDrumState, 'kick');
  assert.equal(state.activePadId, 'kick');
  assert.deepEqual(state.hitHistory, [{ id: 1, padId: 'kick' }]);
  assert.equal(state.nextHitId, 2);
  assert.equal(initialDrumState.hitHistory.length, 0);
});

test('rapid repeat hits are distinct, ordered events', () => {
  let state = initialDrumState;
  for (let i = 0; i < 5; i += 1) state = hit(state, 'kick');
  assert.deepEqual(state.hitHistory.map((event) => event.id), [5, 4, 3, 2, 1]);
  assert.equal(state.hitHistory.every((event) => event.padId === 'kick'), true);
});

test('different pads in quick succession preserve newest-first order', () => {
  let state = initialDrumState;
  for (const padId of ['kick', 'snare', 'tom']) state = hit(state, padId);
  assert.deepEqual(state.hitHistory.map((event) => event.padId), ['tom', 'snare', 'kick']);
  assert.equal(state.activePadId, 'tom');
});

test('history is bounded without resetting monotonically increasing IDs', () => {
  let state = initialDrumState;
  for (let i = 0; i < MAX_HIT_HISTORY + 15; i += 1) {
    state = hit(state, 'clap');
  }
  assert.equal(state.hitHistory.length, MAX_HIT_HISTORY);
  assert.equal(state.hitHistory[0].id, MAX_HIT_HISTORY + 15);
  assert.equal(state.hitHistory.at(-1).id, 16);
});

test('state and history are immutable across hits', () => {
  const first = hit(initialDrumState, 'kick');
  const before = first.hitHistory.slice();
  const next = hit(first, 'snare');
  assert.notStrictEqual(next, first);
  assert.notStrictEqual(next.hitHistory, first.hitHistory);
  assert.deepEqual(first.hitHistory, before);
  assert.equal(first.activePadId, 'kick');
});

test('release clears only the matching active pad, preserving history', () => {
  const state = hit(initialDrumState, 'kick');
  const untouched = drumReducer(state, { type: 'RELEASE', padId: 'snare' });
  assert.strictEqual(untouched, state);
  const released = drumReducer(state, { type: 'RELEASE', padId: 'kick' });
  assert.equal(released.activePadId, null);
  assert.strictEqual(released.hitHistory, state.hitHistory);
});

test('unknown pad is ignored with no state changes', () => {
  assert.strictEqual(hit(initialDrumState, 'invalid'), initialDrumState);
});


test('native click records one hit without latching the active pad', () => {
  const next = drumReducer(initialDrumState, { type: 'HIT', padId: 'kick', activate: false });
  assert.equal(next.activePadId, null);
  assert.deepEqual(next.hitHistory.map(hit => hit.padId), ['kick']);
});

test('native click while a physical key is held preserves active physical key', () => {
  const held = hit(initialDrumState, 'kick');
  const mixed = drumReducer(held, { type: 'HIT', padId: 'snare', activate: false });
  assert.equal(mixed.activePadId, 'kick');
  assert.deepEqual(mixed.hitHistory.map(hit => hit.padId), ['snare', 'kick']);
  const released = drumReducer(mixed, { type: 'SET_ACTIVE', padId: null });
  assert.equal(released.activePadId, null);
  assert.equal(released.hitHistory.length, 2);
});

test('rapid mixed input keeps each event once and respects bounded history', () => {
  let state = initialDrumState;
  for (let i = 0; i < MAX_HIT_HISTORY + 6; i += 1) {
    state = drumReducer(state, {
      type: 'HIT',
      padId: i % 2 === 0 ? 'kick' : 'snare',
      activate: i % 3 === 0,
    });
  }
  assert.equal(state.hitHistory.length, MAX_HIT_HISTORY);
  assert.deepEqual(state.hitHistory.map(hit => hit.id), Array.from({ length: MAX_HIT_HISTORY }, (_, i) => MAX_HIT_HISTORY + 6 - i));
  assert.equal(state.nextHitId, MAX_HIT_HISTORY + 7);
});

test('transient native press matches aria-pressed derivation and releases', () => {
  const down = drumReducer(initialDrumState, { type: 'SET_NATIVE_PRESSED', padId: 'kick' });
  assert.equal(down.nativePressedPadId, 'kick');
  assert.equal(down.hitHistory.length, 0, 'press state must not trigger a hit');
  const click = drumReducer(down, { type: 'HIT', padId: 'kick', activate: false });
  assert.equal(click.hitHistory.length, 1);
  const up = drumReducer(click, { type: 'RELEASE_NATIVE_PRESSED', padId: 'kick' });
  assert.equal(up.nativePressedPadId, null);
  assert.equal(up.hitHistory.length, 1);
});

test('native press does not overwrite held physical-key state', () => {
  const held = hit(initialDrumState, 'snare');
  const down = drumReducer(held, { type: 'SET_NATIVE_PRESSED', padId: 'kick' });
  assert.equal(down.activePadId, 'snare');
  assert.equal(down.nativePressedPadId, 'kick');
  const up = drumReducer(down, { type: 'RELEASE_NATIVE_PRESSED', padId: 'kick' });
  assert.equal(up.activePadId, 'snare');
  assert.equal(up.nativePressedPadId, null);
});

test('unrelated release cannot clear a different native pressed pad', () => {
  const held = drumReducer(initialDrumState, { type: 'SET_NATIVE_PRESSED', padId: 'kick' });
  assert.strictEqual(drumReducer(held, { type: 'RELEASE_NATIVE_PRESSED', padId: 'snare' }), held);
  const blurred = drumReducer(held, { type: 'SET_NATIVE_PRESSED', padId: null });
  assert.equal(blurred.nativePressedPadId, null);
  assert.strictEqual(drumReducer(blurred, { type: 'SET_NATIVE_PRESSED', padId: 'missing' }), blurred);
});
