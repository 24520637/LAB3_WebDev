import test from 'node:test';
import assert from 'node:assert/strict';
import { createPianoKeyInteraction } from '../src/components/pianoKeyInteraction.js';

function fixture() {
  const events = [];
  const key = createPianoKeyInteraction(() => events.push('on'), () => events.push('off'));
  return { key, events };
}

test('one pointer activation triggers one note-on and exactly one note-off', () => {
  const { key, events } = fixture();
  assert.equal(key.pointerDown(17), true);
  assert.equal(key.pointerDown(17), false);
  assert.equal(key.pointerUp(999), false);
  assert.equal(key.pointerUp(17), true);
  assert.equal(key.pointerUp(17), false);
  assert.deepEqual(events, ['on', 'off']);
});

test('multiple simultaneous touch pointers retain note until last release', () => {
  const { key, events } = fixture();
  key.pointerDown(1); key.pointerDown(2);
  key.pointerUp(1);
  assert.equal(key.isHeld, true);
  key.pointerUp(2);
  assert.deepEqual(events, ['on', 'off']);
});

test('Enter and Space are held notes; repeats cannot retrigger', () => {
  const { key, events } = fixture();
  assert.equal(key.keyboardDown('A'), false);
  assert.equal(key.keyboardDown('Enter'), true);
  key.keyboardDown('Enter');
  key.keyboardDown(' ');
  key.keyboardUp('Enter');
  assert.deepEqual(events, ['on']);
  key.keyboardUp(' ');
  key.keyboardUp(' ');
  assert.deepEqual(events, ['on', 'off']);
});

test('overlapping pointer and keyboard input does not cut a held note short', () => {
  const { key, events } = fixture();
  key.pointerDown(8);
  key.keyboardDown(' ');
  key.pointerUp(8);
  assert.deepEqual(events, ['on']);
  key.keyboardUp(' ');
  assert.deepEqual(events, ['on', 'off']);
});

test('blur/cancel releases all input sources exactly once', () => {
  const { key, events } = fixture();
  key.pointerDown(3);
  key.keyboardDown('Enter');
  key.releaseAll();
  key.releaseAll();
  assert.deepEqual(events, ['on', 'off']);
  assert.equal(key.isHeld, false);
  key.keyboardDown('Enter');
  assert.deepEqual(events, ['on', 'off', 'on']);
});

test('external state reset clears input guard without duplicate callback', () => {
  const { key, events } = fixture();
  key.pointerDown(3);
  key.resetSilently();
  assert.deepEqual(events, ['on']);
  key.pointerDown(4);
  key.pointerUp(4);
  assert.deepEqual(events, ['on', 'on', 'off']);
});


test('click-only activation emits a visible on/off pulse', () => {
  const { key, events } = fixture();
  assert.equal(key.clickDown(), true);
  assert.deepEqual(events, ['on']);
  assert.equal(key.isHeld, true);
  assert.equal(key.clickUp(), true);
  assert.deepEqual(events, ['on', 'off']);
});

test('a pointer click after pointerdown/up does not retrigger the note', () => {
  const { key, events } = fixture();
  key.pointerDown(1);
  key.pointerUp(1);
  assert.equal(key.clickDown({ detail: 1, pointerId: 1 }), false);
  assert.deepEqual(events, ['on', 'off']);
  assert.equal(key.clickDown(), true); // Later independent click-only event.
  key.clickUp();
  assert.deepEqual(events, ['on', 'off', 'on', 'off']);
});

test('an interrupted pointer does not consume the next independent click', () => {
  const { key, events } = fixture();
  key.pointerDown(101);
  key.pointerUp(101); // The lostpointercapture handler releases this owner.
  assert.equal(key.clickDown({ detail: 0, pointerId: -1 }), true);
  assert.equal(key.isHeld, true);
  key.clickUp();
  assert.deepEqual(events, ['on', 'off', 'on', 'off']);
});

test('pointer click metadata prevents duplicates without retaining suppression state', () => {
  for (const metadata of [{ detail: 1 }, { detail: 0, pointerId: 42 }]) {
    const { key, events } = fixture();
    key.pointerDown(42);
    key.pointerUp(42);
    assert.equal(key.clickDown(metadata), false);
    assert.deepEqual(events, ['on', 'off']);
    assert.equal(key.clickDown(), true);
    key.clickUp();
    assert.deepEqual(events, ['on', 'off', 'on', 'off']);
  }
});

test('Space remains held after Enter releases, in either press order', () => {
  const { key, events } = fixture();
  key.keyboardDown(' ');
  key.keyboardDown('Enter');
  key.keyboardUp('Enter');
  assert.deepEqual(events, ['on']);
  assert.equal(key.isHeld, true);
  key.keyboardUp(' ');
  assert.deepEqual(events, ['on', 'off']);
  key.keyboardDown('Enter');
  key.keyboardDown(' ');
  key.keyboardUp('Enter');
  assert.equal(key.isHeld, true);
  key.keyboardUp(' ');
  assert.deepEqual(events, ['on', 'off', 'on', 'off']);
});
