import test from 'node:test';
import assert from 'node:assert/strict';
import { DRUM_PADS } from '../src/data/pads.js';

test('exactly seven stable unique pads and physical keyboard codes', () => {
  assert.equal(DRUM_PADS.length, 7);
  assert.deepEqual(DRUM_PADS.map(({ code }) => code), [
    'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyJ', 'KeyK', 'KeyL',
  ]);
  for (const field of ['id', 'code', 'key', 'soundId', 'soundUrl']) {
    assert.equal(new Set(DRUM_PADS.map((pad) => pad[field])).size, 7, field);
  }
});

test('every pad has an accessible label and legacy WAV asset reference', () => {
  for (const pad of DRUM_PADS) {
    assert.ok(pad.label.trim());
    assert.equal(pad.key, pad.code.replace('Key', ''));
    assert.ok(pad.soundUrl.startsWith('https://raw.githubusercontent.com/24520637/drum-kit-engine/main/assets/sounds/'));
    assert.ok(pad.soundUrl.endsWith(`/${pad.soundId}.wav`));
    assert.ok(Object.isFrozen(pad));
  }
  assert.ok(Object.isFrozen(DRUM_PADS));
});
