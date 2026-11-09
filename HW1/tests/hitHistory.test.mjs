import test from 'node:test';
import assert from 'node:assert/strict';
import { DRUM_PADS } from '../src/data/pads.js';
import { drumReducer, initialDrumState, MAX_HIT_HISTORY } from '../src/state/drumState.js';
import { getVisibleHits, getLatestHitAnnouncement } from '../src/state/hitHistoryView.js';

const hit = (state, padId) => drumReducer(state, { type: 'HIT', padId, activate: false });

test('one hit shows correct sound/key and one concise announcement', () => {
  const state = hit(initialDrumState, 'kick');
  assert.deepEqual(getVisibleHits(state.hitHistory, DRUM_PADS), [{ id: 1, label: 'Kick', key: 'W' }]);
  assert.equal(getLatestHitAnnouncement(state.hitHistory, DRUM_PADS), 'Hit 1: Kick, key W.');
});

test('rapid hits remain separate entries in newest-first order', () => {
  let state = initialDrumState;
  for (let i = 0; i < 7; i += 1) state = hit(state, 'kick');
  assert.deepEqual(getVisibleHits(state.hitHistory, DRUM_PADS).map((entry) => entry.id), [7, 6, 5, 4, 3, 2, 1]);
  assert.equal(getLatestHitAnnouncement(state.hitHistory, DRUM_PADS), 'Hit 7: Kick, key W.');
});

test('different pads show correct sound names in hit order', () => {
  let state = initialDrumState;
  for (const padId of ['kick', 'snare', 'ride']) state = hit(state, padId);
  assert.deepEqual(getVisibleHits(state.hitHistory, DRUM_PADS).map(({ label }) => label), ['Ride', 'Snare', 'Kick']);
  assert.equal(getLatestHitAnnouncement(state.hitHistory, DRUM_PADS), 'Hit 3: Ride, key L.');
});

test('history stays bounded to existing reducer limit', () => {
  let state = initialDrumState;
  for (let i = 0; i < MAX_HIT_HISTORY + 10; i += 1) state = hit(state, 'clap');
  assert.equal(getVisibleHits(state.hitHistory, DRUM_PADS).length, MAX_HIT_HISTORY);
  assert.equal(state.hitHistory[0].id, MAX_HIT_HISTORY + 10);
});

test('empty history produces no announcement', () => {
  assert.deepEqual(getVisibleHits([], DRUM_PADS), []);
  assert.equal(getLatestHitAnnouncement([], DRUM_PADS), '');
});

test('hit history updates independently of audio result', () => {
  const before = initialDrumState;
  const after = hit(before, 'tom'); // no audio engine in reducer pathway
  assert.equal(getVisibleHits(after.hitHistory, DRUM_PADS)[0].label, 'Tom');
  assert.equal(before.hitHistory.length, 0);
});

// Regression: two isolated presses of the same pad must change live-region text.
test('repeated identical pad hits produce distinct screen-reader text', () => {
  const first = hit(initialDrumState, 'kick');
  const second = hit(first, 'kick');

  assert.equal(getLatestHitAnnouncement(first.hitHistory, DRUM_PADS), 'Hit 1: Kick, key W.');
  assert.equal(getLatestHitAnnouncement(second.hitHistory, DRUM_PADS), 'Hit 2: Kick, key W.');
  assert.notEqual(
    getLatestHitAnnouncement(first.hitHistory, DRUM_PADS),
    getLatestHitAnnouncement(second.hitHistory, DRUM_PADS),
  );
  assert.equal(first.hitHistory.length, 1);
  assert.equal(second.hitHistory.length, 2);
});

test('bounded history does not reuse announcement sequence numbers', () => {
  let state = initialDrumState;
  for (let i = 0; i < MAX_HIT_HISTORY + 2; i += 1) state = hit(state, 'kick');
  assert.equal(
    getLatestHitAnnouncement(state.hitHistory, DRUM_PADS),
    `Hit ${MAX_HIT_HISTORY + 2}: Kick, key W.`,
  );
});
