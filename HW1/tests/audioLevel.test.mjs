import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioEngine } from '../src/audio/audioEngine.js';
import { createDrumAudioController } from '../src/audio/drumAudioController.js';
import { createAudioLevelSampler } from '../src/audio/audioLevelSampler.js';
import { describeAudioLevel } from '../src/audio/audioLevelFormat.js';

function mockAnalyserAudio({ failStart = false, decodeFailure = false, noAnalyser = false } = {}) {
  const oldContext = globalThis.AudioContext;
  const oldFetch = globalThis.fetch;
  const contexts = [];
  class FakeContext {
    constructor() {
      this.destination = { name: 'speakers' };
      this.state = 'suspended';
      this.sources = [];
      this.analyser = null;
      this.closeCount = 0;
      contexts.push(this);
    }
    createAnalyser() {
      const analyser = {
        fftSize: 1024, connectedTo: null, disconnected: false,
        samples: new Float32Array(1024),
        connect(node) { this.connectedTo = node; },
        disconnect() { this.disconnected = true; },
        getFloatTimeDomainData(target) { target.set(this.samples); },
      };
      this.analyser = analyser;
      return analyser;
    }
    createBufferSource() {
      const source = {
        buffer: null, output: null, onended: null, started: false, stopped: false,
        connect(node) { this.output = node; },
        disconnect() { this.output = null; },
        start() { if (failStart) throw Error('start failed'); this.started = true; },
        stop() { this.stopped = true; },
      };
      this.sources.push(source);
      return source;
    }
    async decodeAudioData(bytes) {
      if (decodeFailure) throw Error('decode failed');
      return { bytes };
    }
    async resume() { this.state = 'running'; }
    async close() { this.closeCount++; this.state = 'closed'; }
  }
  if (noAnalyser) FakeContext.prototype.createAnalyser = undefined;
  globalThis.AudioContext = FakeContext;
  globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
  return {
    contexts,
    restore() { globalThis.AudioContext = oldContext; globalThis.fetch = oldFetch; },
  };
}

test('analyser samples the actual mixed time-domain signal in RMS dBFS', async () => {
  const env = mockAnalyserAudio();
  try {
    const engine = new AudioEngine();
    const ctx = env.contexts[0];
    assert.strictEqual(ctx.analyser.connectedTo, ctx.destination);
    assert.equal(engine.readDbfs(), -Infinity);
    ctx.analyser.samples.fill(0.5);
    assert.ok(Math.abs(engine.readDbfs() - 20 * Math.log10(0.5)) < 1e-6);
    ctx.analyser.samples.fill(0);
    assert.equal(engine.readDbfs(), -Infinity);
    await engine.dispose();
    assert.equal(ctx.analyser.disconnected, true);
    assert.equal(engine.readDbfs(), null);
  } finally { env.restore(); }
});

test('overlapping playback mixes multiple source nodes through the same analyser', async () => {
  const env = mockAnalyserAudio();
  try {
    const engine = new AudioEngine();
    await engine.preload({ kick: '/kick.wav', snare: '/snare.wav' });
    await engine.unlock();
    const activity = [];
    engine.setActivityListener((active) => activity.push(active));
    const first = engine.play('kick');
    const second = engine.play('snare');
    assert.equal(first.started && second.started, true);
    assert.strictEqual(first.output, env.contexts[0].analyser);
    assert.strictEqual(second.output, env.contexts[0].analyser);
    assert.deepEqual(activity, [true, true]);
    first.onended();
    assert.equal(engine.activeInstances.size, 1);
    second.onended();
    assert.equal(engine.activeInstances.size, 0);
    assert.equal(activity.at(-1), false);
    await engine.dispose();
    assert.equal(env.contexts[0].closeCount, 1);
  } finally { env.restore(); }
});

test('missing analyser keeps playback functional and reports level unavailable', async () => {
  const env = mockAnalyserAudio({ noAnalyser: true });
  try {
    const engine = new AudioEngine();
    await engine.preload({ kick: '/kick.wav' });
    assert.equal(engine.readDbfs(), null);
    await engine.unlock();
    const voice = engine.play('kick');
    assert.strictEqual(voice.output, env.contexts[0].destination);
    await engine.dispose();
  } finally { env.restore(); }
});

test('audio decode and playback failures do not produce false nonzero meter readings', async () => {
  for (const opts of [{ decodeFailure: true }, { failStart: true }]) {
    const env = mockAnalyserAudio(opts);
    try {
      const engine = new AudioEngine();
      const result = await engine.preload({ kick: '/kick.wav' });
      if (opts.decodeFailure) assert.deepEqual(result.failed, ['kick']);
      await engine.unlock();
      assert.equal(engine.play('kick'), null);
      assert.equal(engine.activeInstances.size, 0);
      assert.equal(engine.readDbfs(), -Infinity);
      await engine.dispose();
    } finally { env.restore(); }
  }
});

test('controller exposes analyser measurement without autoplaying', async () => {
  const env = mockAnalyserAudio();
  try {
    const controller = createDrumAudioController();
    await controller.preload();
    assert.equal(env.contexts[0].sources.length, 0);
    assert.equal(controller.readDbfs(), -Infinity);
    env.contexts[0].analyser.samples.fill(0.25);
    assert.ok(controller.readDbfs() < -12 && controller.readDbfs() > -13);
    await controller.dispose();
    assert.equal(controller.readDbfs(), null);
  } finally { env.restore(); }
});

test('sampler runs only during active audio, samples at bounded rate, stops and cleans up', () => {
  let nextId = 0;
  const frames = new Map();
  const levels = [];
  let dbfs = -20;
  const monitor = createAudioLevelSampler({
    readDbfs: () => dbfs,
    onLevel: (value) => levels.push(value),
    requestFrame: (callback) => { const id = ++nextId; frames.set(id, callback); return id; },
    cancelFrame: (id) => frames.delete(id),
  });
  const flush = (time) => {
    const pending = [...frames.values()];
    frames.clear();
    for (const callback of pending) callback(time);
  };
  assert.equal(frames.size, 0);
  monitor.setActive(true);
  assert.equal(frames.size, 1);
  flush(0);
  assert.deepEqual(levels, [-20]);
  dbfs = -6;
  flush(10);
  assert.deepEqual(levels, [-20]);
  flush(60);
  assert.deepEqual(levels, [-20, -6]);
  dbfs = 0;
  monitor.setActive(false);
  assert.deepEqual(levels, [-20, -6, -Infinity]);
  assert.equal(frames.size, 0);
  monitor.setActive(true);
  monitor.dispose();
  assert.equal(frames.size, 0);
  monitor.setActive(true);
  assert.equal(frames.size, 0);
});

test('sampler reports missing analyser as unavailable; accessible text distinguishes dBFS and silence', () => {
  const levels = [];
  const monitor = createAudioLevelSampler({ readDbfs: () => null, onLevel: (v) => levels.push(v), requestFrame: () => 1, cancelFrame: () => {} });
  monitor.setActive(true);
  monitor.setActive(false);
  assert.deepEqual(levels, [null]);
  assert.equal(describeAudioLevel(null), 'Audio level unavailable');
  assert.equal(describeAudioLevel(-Infinity), 'Silence (−∞ dBFS)');
  assert.equal(describeAudioLevel(-6.020599913), '-6.0 dBFS RMS');
  monitor.dispose();
});
