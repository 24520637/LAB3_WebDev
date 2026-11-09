import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioEngine } from '../src/audio/audioEngine.js';
import { createDrumAudioController } from '../src/audio/drumAudioController.js';
import { DRUM_PADS } from '../src/data/pads.js';

function mockAudio({ missing = [], decodeFailures = [], failStart = false, failResume = false, pendingFetch = false } = {}) {
  const oldContext = globalThis.AudioContext;
  const oldFetch = globalThis.fetch;
  const contexts = [];
  const fetches = [];
  class FakeAudioContext {
    constructor() {
      this.state = 'suspended';
      this.sources = [];
      this.destination = {};
      this.resumeCount = 0;
      this.closeCount = 0;
      contexts.push(this);
    }
    async resume() {
      this.resumeCount += 1;
      if (failResume) throw Error('resume denied');
      this.state = 'running';
    }
    async close() { this.closeCount += 1; this.state = 'closed'; }
    async decodeAudioData(bytes) {
      const name = new TextDecoder().decode(bytes);
      if (decodeFailures.includes(name)) throw Error('invalid WAV');
      return { name };
    }
    createBufferSource() {
      const node = {
        buffer: null, started: false, stopped: false, disconnected: false,
        onended: null,
        connect() {},
        start() {
          if (failStart) throw Error('start failed');
          this.started = true;
        },
        stop() { this.stopped = true; },
        disconnect() { this.disconnected = true; },
      };
      this.sources.push(node);
      return node;
    }
  }
  globalThis.AudioContext = FakeAudioContext;
  globalThis.fetch = async (url, options = {}) => {
    fetches.push({ url, signal: options.signal });
    if (pendingFetch) {
      return new Promise((resolve, reject) => {
        options.signal?.addEventListener('abort', () => reject(Object.assign(new Error('abort'), { name: 'AbortError' })), { once: true });
      });
    }
    const name = url.split('/').at(-1).replace('.wav', '');
    if (missing.includes(name)) return { ok: false, status: 404 };
    return { ok: true, arrayBuffer: async () => new TextEncoder().encode(name).buffer };
  };
  return {
    contexts, fetches,
    restore() {
      globalThis.AudioContext = oldContext;
      globalThis.fetch = oldFetch;
    },
  };
}

test('all seven configured sounds preload and play from one shared pad mapping', async () => {
  const env = mockAudio();
  try {
    const errors = [];
    const controller = createDrumAudioController({ onError: (message) => errors.push(message) });
    const loaded = await controller.preload();
    assert.deepEqual(new Set(loaded.loaded), new Set(DRUM_PADS.map((pad) => pad.soundId)));
    assert.deepEqual(loaded.failed, []);
    assert.equal(env.fetches.length, 7);
    for (const pad of DRUM_PADS) assert.equal(await controller.trigger(pad.id), true);
    assert.deepEqual(env.contexts[0].sources.map((source) => source.buffer.name), DRUM_PADS.map((pad) => pad.soundId));
    assert.deepEqual(errors, []);
    await controller.dispose();
  } finally { env.restore(); }
});

test('rapid hits produce independent overlapping sources', async () => {
  const env = mockAudio();
  try {
    const engine = new AudioEngine();
    await engine.preload({ kick: '/kick.wav', snare: '/snare.wav' });
    await engine.unlock();
    const sources = [engine.play('kick'), engine.play('snare'), engine.play('kick')];
    assert.equal(new Set(sources).size, 3);
    assert.equal(sources.every((source) => source.started && !source.stopped), true);
    assert.equal(engine.activeInstances.get('kick').length, 2);
    sources[0].onended();
    assert.equal(engine.activeInstances.get('kick').length, 1);
    await engine.dispose();
  } finally { env.restore(); }
});

test('preload does not unlock or autoplay; only a real trigger calls unlock', async () => {
  const env = mockAudio();
  try {
    const controller = createDrumAudioController();
    await controller.preload();
    assert.equal(env.contexts[0].resumeCount, 0);
    assert.equal(env.contexts[0].sources.length, 0);
    assert.equal(await controller.trigger('kick'), true);
    assert.equal(env.contexts[0].resumeCount, 1);
    await controller.dispose();
  } finally { env.restore(); }
});

test('missing assets report failure and do not block another pad', async () => {
  const env = mockAudio({ missing: ['kick'] });
  try {
    const errors = [];
    const controller = createDrumAudioController({ onError: (message) => errors.push(message) });
    const result = await controller.preload();
    assert.deepEqual(result.failed, ['kick']);
    assert.equal(await controller.trigger('kick'), false);
    assert.equal(await controller.trigger('snare'), true);
    assert.ok(errors.length >= 1);
    await controller.dispose();
  } finally { env.restore(); }
});

test('decode failure affects only its asset', async () => {
  const env = mockAudio({ decodeFailures: ['crash'] });
  try {
    const controller = createDrumAudioController();
    const result = await controller.preload();
    assert.deepEqual(result.failed, ['crash']);
    assert.equal(await controller.trigger('crash'), false);
    assert.equal(await controller.trigger('kick'), true);
    await controller.dispose();
  } finally { env.restore(); }
});

test('source.start playback error is nonfatal', async () => {
  const env = mockAudio({ failStart: true });
  try {
    const errors = [];
    const controller = createDrumAudioController({ onError: (message) => errors.push(message) });
    await controller.preload();
    assert.equal(await controller.trigger('kick'), false);
    assert.match(errors.at(-1), /could not play|unavailable/);
    assert.equal(env.contexts[0].sources[0].disconnected, true);
    await controller.dispose();
  } finally { env.restore(); }
});

test('unlock failure is nonfatal and cannot start a source', async () => {
  const env = mockAudio({ failResume: true });
  try {
    const errors = [];
    const controller = createDrumAudioController({ onError: (message) => errors.push(message) });
    await controller.preload();
    assert.equal(await controller.trigger('kick'), false);
    assert.equal(env.contexts[0].sources.length, 0);
    assert.match(errors.at(-1), /audio permissions/);
    await controller.dispose();
  } finally { env.restore(); }
});

test('unmount disposal stops all voices, closes context and ignores further hits', async () => {
  const env = mockAudio();
  try {
    const controller = createDrumAudioController();
    await controller.preload();
    await controller.trigger('kick');
    await controller.trigger('snare');
    await controller.dispose();
    assert.equal(env.contexts[0].closeCount, 1);
    assert.equal(env.contexts[0].sources.every((source) => source.stopped && source.disconnected), true);
    assert.equal(await controller.trigger('kick'), false);
    await controller.dispose();
    assert.equal(env.contexts[0].closeCount, 1);
  } finally { env.restore(); }
});

test('dispose cancels pending fetches and suppresses false abort errors', async () => {
  const env = mockAudio({ pendingFetch: true });
  try {
    const errors = [];
    const controller = createDrumAudioController({ onError: (message) => errors.push(message) });
    const pending = controller.preload();
    await controller.dispose();
    const result = await pending;
    assert.equal(result.loaded.length, 0);
    assert.equal(result.failed.length, 7);
    assert.equal(env.fetches.every((f) => f.signal?.aborted), true);
    assert.deepEqual(errors, []);
  } finally { env.restore(); }
});

test('unknown pad does not unlock or play', async () => {
  const env = mockAudio();
  try {
    const controller = createDrumAudioController();
    await controller.preload();
    assert.equal(await controller.trigger('unknown'), false);
    assert.equal(env.contexts[0].resumeCount, 0);
    await controller.dispose();
  } finally { env.restore(); }
});

test('an early hit error clears after the same sound loads and plays successfully', async () => {
  const env = mockAudio();
  let controller;
  try {
    const messages = [];
    controller = createDrumAudioController({ onError: (message) => messages.push(message) });
    assert.equal(await controller.trigger('kick'), false);
    assert.match(messages.at(-1), /Kick/);
    await controller.preload();
    assert.equal(await controller.trigger('kick'), true);
    assert.equal(messages.at(-1), '');
  } finally { await controller?.dispose(); env.restore(); }
});

test('recovering one pad preserves another pad error until that pad recovers', async () => {
  const env = mockAudio();
  let controller;
  try {
    const messages = [];
    controller = createDrumAudioController({ onError: (message) => messages.push(message) });
    await controller.trigger('kick');
    await controller.trigger('snare');
    await controller.preload();
    assert.equal(await controller.trigger('kick'), true);
    assert.match(messages.at(-1), /Snare/);
    assert.doesNotMatch(messages.at(-1), /Kick/);
    assert.equal(await controller.trigger('snare'), true);
    assert.equal(messages.at(-1), '');
  } finally { await controller?.dispose(); env.restore(); }
});

test('playing a healthy sound does not hide an unresolved missing asset', async () => {
  const missing = ['kick'];
  const env = mockAudio({ missing });
  let controller;
  try {
    const messages = [];
    controller = createDrumAudioController({ onError: (message) => messages.push(message) });
    await controller.preload();
    assert.equal(await controller.trigger('snare'), true);
    assert.match(messages.at(-1), /Unable to load 1/);
    missing.length = 0;
    await controller.preload();
    assert.equal(await controller.trigger('kick'), true);
    assert.equal(messages.at(-1), '');
  } finally { await controller?.dispose(); env.restore(); }
});
