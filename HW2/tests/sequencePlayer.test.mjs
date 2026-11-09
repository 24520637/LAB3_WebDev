import test from 'node:test';
import assert from 'node:assert/strict';
import { SequencePlayer } from '../src/sequencer/SequencePlayer.js';

function rig() {
  let time = 0;
  let seq = 0;
  const timers = new Map();
  const starts = [];
  const ends = [];
  const synth = {
    voices: new Map(),
    noteOn(midi) {
      if (this.voices.has(midi)) return false;
      this.voices.set(midi, { midi });
      starts.push([midi, time]);
      return true;
    },
    noteOff(midi) {
      if (!this.voices.has(midi)) return false;
      this.voices.delete(midi);
      ends.push([midi, time]);
      return true;
    },
  };
  const player = new SequencePlayer({
    synth, now: () => time,
    setTimer(fn, delay) { const id = ++seq; timers.set(id, { time: time + delay, fn }); return id; },
    clearTimer(id) { timers.delete(id); },
  });
  function advance(to) {
    while (true) {
      const next = [...timers.entries()].sort((a,b) => a[1].time - b[1].time || a[0] - b[0])[0];
      if (!next || next[1].time > to) break;
      timers.delete(next[0]);
      time = next[1].time;
      next[1].fn();
    }
    time = to;
  }
  return { player, synth, starts, ends, timers, advance };
}
const chord = [
  { midi:60, freqHz:261.63, deltaMs:0, durationMs:400 },
  { midi:64, freqHz:329.63, deltaMs:100, durationMs:450 },
  { midi:67, freqHz:392, deltaMs:0, durationMs:250 },
];

for (const speed of [0.5, 1, 2]) {
  test(`${speed}x: FIFO starts, scaled deadlines and overlapping chord`, async () => {
    const r = rig();
    const done = r.player.play(chord, speed);
    assert.deepEqual(r.starts, [[60,0]]);
    r.advance(100 / speed);
    assert.deepEqual(r.starts.map(([m]) => m), [60,64,67]);
    assert.equal(r.synth.voices.size, 3, 'voices must overlap');
    r.advance(550 / speed);
    assert.deepEqual(r.ends, [[67,350/speed],[60,400/speed],[64,550/speed]]);
    assert.deepEqual(await done, {status:'completed'});
    assert.equal(r.player.isPlaying, false);
    assert.equal(r.timers.size, 0);
  });
}

test('duplicate Play returns same promise and only one coordinator runs', async () => {
  const r = rig();
  const a = r.player.play(chord);
  const b = r.player.play(chord);
  assert.equal(a, b);
  r.advance(600);
  assert.equal((await a).status, 'completed');
  assert.equal(r.starts.length, 3);
});

test('Stop before future starts cancels timers and releases owned voices', async () => {
  const r = rig();
  const p = r.player.play(chord);
  r.advance(50);
  assert.equal(r.player.stop(), true);
  assert.equal(r.player.stop(), false);
  r.advance(900);
  assert.deepEqual(r.starts.map(([m])=>m), [60]);
  assert.deepEqual(r.ends.map(([m])=>m), [60]);
  assert.equal(r.timers.size, 0);
  assert.equal((await p).status,'stopped');
});

test('same-MIDI recording retriggers without releasing a newer voice from stale timeout', async () => {
  const r = rig();
  const p = r.player.play([
    {midi:60,freqHz:261.63,deltaMs:0,durationMs:400},
    {midi:60,freqHz:261.63,deltaMs:100,durationMs:500},
  ]);
  r.advance(100);
  assert.deepEqual(r.starts, [[60,0],[60,100]]);
  r.advance(400);
  assert.equal(r.synth.voices.has(60), true, 'old first-note timer cannot silence replacement');
  r.advance(600);
  assert.equal((await p).status,'completed');
  assert.equal(r.synth.voices.size,0);
});

test('reject invalid notes and speed before creating audio', () => {
  const r = rig();
  assert.throws(()=>r.player.play(chord,3),RangeError);
  assert.throws(()=>r.player.play([{midi:60,freqHz:261,deltaMs:-1,durationMs:10}]),RangeError);
  assert.equal(r.starts.length,0);
});

test('empty sequence completes immediately; dispose cancels active run', async () => {
  const r = rig();
  assert.deepEqual(await r.player.play([]), {status:'completed'});
  const p = r.player.play(chord);
  r.player.dispose();
  assert.equal((await p).status,'stopped');
  assert.throws(()=>r.player.play(chord),/disposed/);
});

test('external voice replacement is not silenced by playback note-off', async () => {
  const r = rig();
  const p = r.player.play([chord[0]]);
  const other = { external:true };
  r.synth.voices.set(60,other);
  r.advance(400);
  assert.equal(r.synth.voices.get(60),other);
  assert.equal((await p).status,'completed');
});

test('default global timers preserve the browser receiver for playback and Stop', async (t) => {
  let time = 0;
  let nextId = 0;
  let cancellations = 0;
  const timers = new Map();
  const events = [];
  t.mock.method(globalThis, 'setTimeout', function (callback, delay) {
    assert.equal(this, globalThis, 'Window timer must receive the global object');
    const id = ++nextId;
    timers.set(id, { callback, at: time + delay });
    return id;
  });
  t.mock.method(globalThis, 'clearTimeout', function (id) {
    assert.equal(this, globalThis, 'Window cancellation must receive the global object');
    cancellations++;
    timers.delete(id);
  });
  const synth = {
    voices: new Map(),
    noteOn(midi) {
      this.voices.set(midi, {});
      events.push(['on', midi, time]);
      return true;
    },
    noteOff(midi) {
      events.push(['off', midi, time]);
      return this.voices.delete(midi);
    },
  };
  // Do not inject setTimer/clearTimer: exercise the production defaults.
  const player = new SequencePlayer({ synth, now: () => time });
  const sequence = [{ midi: 60, freqHz: 261.63, deltaMs: 20, durationMs: 40 }];
  const done = player.play(sequence);
  while (timers.size) {
    const [id, task] = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
    timers.delete(id);
    time = task.at;
    task.callback();
  }
  assert.deepEqual(await done, { status: 'completed' });
  assert.deepEqual(events, [['on', 60, 20], ['off', 60, 60]]);

  const stopped = player.play(sequence);
  assert.equal(timers.size, 1);
  assert.equal(player.stop(), true);
  assert.deepEqual(await stopped, { status: 'stopped' });
  assert.equal(timers.size, 0);
  assert.equal(cancellations, 1);
  assert.equal(events.length, 2, 'stopped future note must not start');
});
