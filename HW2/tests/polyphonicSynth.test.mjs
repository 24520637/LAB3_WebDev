import test from 'node:test';
import assert from 'node:assert/strict';
import { PolyphonicSynth } from '../src/audio/PolyphonicSynth.js';

function fakeAudio() {
  const oscillators = [];
  const gains = [];
  let closed = 0;
  const ctx = {
    state: 'running', currentTime: 2, destination: {},
    createOscillator() {
      const o = { frequency: { setValueAtTime(value) { o.hz = value; } },
        connect() { return o; }, disconnect() { o.disconnected = true; },
        start() { o.started = true; }, stop(time) { o.stopAt = time ?? ctx.currentTime; },
        onended: null };
      oscillators.push(o);
      return o;
    },
    createGain() {
      const commands = [];
      const param = { value: 0.12, commands,
        setValueAtTime(value, time) { commands.push(['set', value, time]); this.value = value; },
        exponentialRampToValueAtTime(value, time) { commands.push(['exp', value, time]); },
        cancelScheduledValues(time) { commands.push(['cancel', time]); },
      };
      const g = { gain: param, connect() { return g; }, disconnect() { g.disconnected = true; } };
      gains.push(g);
      return g;
    },
    async close() { closed++; this.state = 'closed'; },
  };
  return { ctx, oscillators, gains, get closeCount() { return closed; } };
}
const frequency = (midi) => 440 * 2 ** ((midi - 69) / 12);

test('eight independent notes overlap; ninth and tenth steal the oldest in FIFO order', async () => {
  const f = fakeAudio();
  const stolen = [];
  const synth = new PolyphonicSynth({ createContext: () => f.ctx, onVoiceStolen: (m) => stolen.push(m) });
  for (let midi = 60; midi < 68; midi++) assert.equal(synth.noteOn(midi, frequency(midi)), true);
  assert.equal(synth.voices.size, 8);
  assert.equal(f.oscillators.filter((o) => o.started).length, 8);
  assert.deepEqual([...synth.voices.keys()], [60,61,62,63,64,65,66,67]);
  synth.noteOn(68, frequency(68));
  synth.noteOn(69, frequency(69));
  assert.deepEqual(stolen, [60, 61]);
  assert.deepEqual([...synth.voices.keys()], [62,63,64,65,66,67,68,69]);
  assert.ok(f.oscillators[0].stopAt > f.ctx.currentTime);
  assert.equal(synth.releasing.size, 2);
  f.oscillators[0].onended();
  assert.equal(synth.releasing.size, 1);
  await synth.dispose();
});

test('note off performs a positive exponential 40 ms release before stopping oscillator', async () => {
  const f = fakeAudio();
  const synth = new PolyphonicSynth({ createContext: () => f.ctx });
  synth.noteOn(60, frequency(60));
  assert.equal(synth.noteOff(60), true);
  assert.equal(synth.noteOff(60), false);
  assert.ok(f.gains[1].gain.commands.some(([name, value, at]) => name === 'exp' && value === 0.0001 && Math.abs(at - 2.04) < 0.00001));
  assert.equal(f.oscillators[0].stopAt, 2.045);
  f.oscillators[0].onended();
  assert.equal(f.gains[1].disconnected, true);
  await synth.dispose();
});

test('duplicate MIDI does not start another voice; release and retrigger cleanup is identity-safe', async () => {
  const f = fakeAudio();
  const synth = new PolyphonicSynth({ createContext: () => f.ctx });
  assert.equal(synth.noteOn(60, frequency(60)), true);
  assert.equal(synth.noteOn(60, frequency(60)), false);
  assert.equal(f.oscillators.length, 1);
  synth.noteOff(60);
  synth.noteOn(60, frequency(60));
  f.oscillators[0].onended();
  assert.deepEqual([...synth.voices.keys()], [60]);
  await synth.dispose();
});

test('invalid input, unavailable audio, disposal and double disposal are handled', async () => {
  const f = fakeAudio();
  const synth = new PolyphonicSynth({ createContext: () => f.ctx });
  assert.throws(() => synth.noteOn(60, Number.NaN), RangeError);
  assert.throws(() => synth.noteOn(109, 400), RangeError);
  synth.noteOn(60, frequency(60));
  await synth.dispose();
  await synth.dispose();
  assert.equal(f.closeCount, 1);
  assert.equal(f.oscillators[0].disconnected, true);
  assert.equal(synth.noteOn(61, frequency(61)), false);
  const missing = new PolyphonicSynth({ createContext: () => { throw new Error('unsupported'); } });
  assert.throws(() => missing.noteOn(60, frequency(60)), /unsupported/);
});
