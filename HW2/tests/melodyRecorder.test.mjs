import test from 'node:test';
import assert from 'node:assert/strict';
import { MelodyRecorder } from '../src/sequencer/MelodyRecorder.js';

function setup() {
  let time = 0;
  const recorder = new MelodyRecorder({ now: () => time });
  return { recorder, setTime: (t) => { time = t; } };
}

test('C major chord preserves onset FIFO order even when releases happen out of order', () => {
  const { recorder, setTime } = setup();
  setTime(100); recorder.start();
  setTime(120); recorder.noteOn(60, 261.6256);
  setTime(120); recorder.noteOn(64, 329.6276);
  setTime(150); recorder.noteOn(67, 391.9954);
  setTime(180); recorder.noteOff(64);
  setTime(200); recorder.noteOff(67);
  setTime(300); recorder.noteOff(60);
  assert.deepEqual(recorder.stop().map(({ midi,durationMs,deltaMs }) => ({ midi,durationMs,deltaMs })), [
    { midi:60,durationMs:180,deltaMs:20 },
    { midi:64,durationMs:60,deltaMs:0 },
    { midi:67,durationMs:50,deltaMs:30 },
  ]);
});

test('repeated same MIDI is recorded as two distinct events', () => {
  const { recorder, setTime } = setup();
  recorder.start();
  recorder.noteOn(60, 260);
  assert.equal(recorder.noteOn(60, 260), false);
  setTime(30); recorder.noteOff(60);
  setTime(40); recorder.noteOn(60, 260);
  setTime(70); recorder.noteOff(60);
  assert.deepEqual(recorder.stop().map(({midi,durationMs,deltaMs}) => ({midi,durationMs,deltaMs})), [
    {midi:60,durationMs:30,deltaMs:0}, {midi:60,durationMs:30,deltaMs:40},
  ]);
});

test('stop closes held notes at the same instant and allows clear/empty takes', () => {
  const { recorder, setTime } = setup();
  assert.deepEqual(recorder.stop(), []);
  recorder.start();
  recorder.noteOn(60, 261);
  setTime(20); recorder.noteOn(64, 329);
  setTime(100);
  const notes = recorder.stop();
  assert.deepEqual(notes.map(({durationMs,deltaMs}) => ({durationMs,deltaMs})), [
    {durationMs:100,deltaMs:0},{durationMs:80,deltaMs:20},
  ]);
  assert.equal(recorder.noteOff(60), false);
  recorder.clear();
  assert.deepEqual(recorder.snapshot(), []);
  recorder.start();
  assert.deepEqual(recorder.stop(), []);
});

test('snapshot of pending notes includes overlapping durations without finalizing them', () => {
  const { recorder, setTime } = setup();
  recorder.start(); recorder.noteOn(60, 261);
  setTime(25);
  assert.equal(recorder.snapshot().length, 0);
  assert.equal(recorder.snapshot({includeHeld:true})[0].durationMs, 25);
  assert.equal(recorder.recording, true);
  setTime(40); recorder.noteOff(60);
  assert.equal(recorder.stop()[0].durationMs,40);
});
