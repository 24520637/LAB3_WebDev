import test, { before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { act, createElement, StrictMode } from 'react';
import { DRUM_PADS } from '../src/data/pads.js';
import { installBrowserEnvironment, installAudioBoundary, key, pointer } from './helpers/reactHarness.mjs';

const environment = installBrowserEnvironment();
const { window } = environment.dom;
const container = window.document.querySelector('#test-root');
let server;
let App;
let createRoot;
let root;
let audio;

before(async () => {
  ({ createRoot } = await import('react-dom/client'));
  server = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    server: { middlewareMode: true, watch: null }, logLevel: 'error',
  });
  ({ default: App } = await server.ssrLoadModule('/src/App.jsx'));
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null;
  container.replaceChildren();
});
after(async () => {
  await server?.close();
  environment.restore();
});

async function mount(options) {
  audio = installAudioBoundary(environment, options);
  root = createRoot(container);
  await act(async () => root.render(createElement(StrictMode, null, createElement(App))));
  return audio;
}
const pad = (id) => container.querySelector(`button[data-sound="${id}"]`);
const entries = () => [...container.querySelectorAll('.hit-history-list li')];
const labels = () => entries().map((item) => item.querySelector('span').textContent);
const active = () => [...container.querySelectorAll('.drum-pad.is-active')].map((item) => item.dataset.sound);
const reading = () => container.querySelector('.audio-level-reading').textContent;
async function physical(code, options = {}, target = window.document.body) {
  await act(async () => {
    key(window, target, 'keydown', code, options);
    key(window, target, 'keyup', code, options);
  });
}
async function pointerClick(button) {
  await act(async () => {
    pointer(window, button, 'pointerdown');
    pointer(window, button, 'pointerup');
    button.click();
  });
}

test('integration: actual App renders the seven named native buttons and does not autoplay', async () => {
  await mount();
  const buttons = [...container.querySelectorAll('button')];
  assert.equal(buttons.length, 7);
  assert.deepEqual(buttons.map((button) => button.dataset.sound), DRUM_PADS.map((item) => item.soundId));
  for (const [index, button] of buttons.entries()) {
    assert.equal(button.type, 'button');
    assert.equal(button.getAttribute('aria-label'), `${DRUM_PADS[index].label} drum, key ${DRUM_PADS[index].key}`);
  }
  assert.deepEqual(audio.startedSounds, []);
  assert.equal(audio.contexts.every((context) => context.resumeCount === 0), true);
  assert.equal(entries().length, 0);
  assert.equal(reading(), 'Silence (−∞ dBFS)');
});

test('integration: seven physical mappings update rendered history and reach their matching audio buffers', async () => {
  await mount();
  for (const item of DRUM_PADS) {
    await physical(item.code);
    assert.equal(labels()[0], item.label);
    assert.deepEqual(active(), []);
  }
  assert.deepEqual(labels(), DRUM_PADS.map((item) => item.label).reverse());
  assert.deepEqual(audio.startedSounds, DRUM_PADS.map((item) => item.soundId));
});

test('integration: unknown codes, repeat-only events and duplicate held keydowns produce no extra hit', async () => {
  await mount();
  await physical('KeyQ');
  await physical('KeyW', { repeat: true });
  assert.equal(entries().length, 0);
  await act(async () => {
    key(window, window.document.body, 'keydown', 'KeyW');
    key(window, window.document.body, 'keydown', 'KeyW', { repeat: true });
    key(window, window.document.body, 'keydown', 'KeyW');
  });
  assert.equal(entries().length, 1);
  assert.deepEqual(audio.startedSounds, ['kick']);
  assert.deepEqual(active(), ['kick']);
  await act(async () => key(window, window.document.body, 'keyup', 'KeyW'));
  assert.deepEqual(active(), []);
  await physical('KeyW');
  assert.equal(entries().length, 2);
});

for (const tag of ['input', 'textarea', 'select']) {
  test(`integration: a real focused ${tag} isolates shortcuts without cancelling typing`, async () => {
    await mount();
    const editor = window.document.createElement(tag);
    container.append(editor);
    editor.focus();
    let event;
    await act(async () => { event = key(window, editor, 'keydown', 'KeyW'); });
    assert.equal(event.defaultPrevented, false);
    assert.equal(entries().length, 0);
    assert.deepEqual(audio.startedSounds, []);
  });
}

test('integration: nested contenteditable targets are isolated by actual DOM ancestry', async () => {
  await mount();
  const editor = window.document.createElement('section');
  editor.setAttribute('contenteditable', 'true');
  const child = window.document.createElement('span');
  editor.append(child);
  container.append(editor);
  await physical('KeyW', {}, child);
  assert.equal(entries().length, 0);
  assert.deepEqual(audio.startedSounds, []);
});

test('integration: composition resets a held pad, suppresses hits and permits fresh hits afterward', async () => {
  await mount();
  await act(async () => key(window, window.document.body, 'keydown', 'KeyW'));
  assert.deepEqual(active(), ['kick']);
  await act(async () => window.dispatchEvent(new window.CompositionEvent('compositionstart')));
  assert.deepEqual(active(), []);
  await physical('KeyA');
  await act(async () => window.dispatchEvent(new window.CompositionEvent('compositionend')));
  await physical('KeyA', { isComposing: true });
  assert.equal(entries().length, 1);
  await physical('KeyA');
  assert.deepEqual(labels(), ['Snare', 'Kick']);
});

test('integration: releasing overlapping keys restores the remaining pad; blur clears native and physical holds', async () => {
  await mount();
  await act(async () => {
    key(window, window.document.body, 'keydown', 'KeyW');
    key(window, window.document.body, 'keydown', 'KeyA');
  });
  assert.deepEqual(active(), ['snare']);
  await act(async () => key(window, window.document.body, 'keyup', 'KeyA'));
  assert.deepEqual(active(), ['kick']);
  await act(async () => pointer(window, pad('tom'), 'pointerdown'));
  assert.deepEqual(new Set(active()), new Set(['kick', 'tom']));
  await act(async () => window.dispatchEvent(new window.Event('blur')));
  assert.deepEqual(active(), []);
  assert.equal(entries().length, 2, 'press/blur must not manufacture hits');
  await physical('KeyW');
  assert.equal(entries().length, 3);
});

test('integration: pointer, physical key and native keyboard event sequences each record one matching hit', async () => {
  await mount();
  await pointerClick(pad('kick'));
  await physical('KeyW');
  for (const activationKey of ['Enter', ' ']) {
    const button = pad('kick');
    await act(async () => {
      button.focus();
      key(window, button, 'keydown', activationKey === 'Enter' ? 'Enter' : 'Space', { key: activationKey });
    });
    assert.equal(entries().length, activationKey === 'Enter' ? 2 : 3, 'keydown must not separately dispatch a hit');
    await act(async () => {
      // Model browser default actions: Enter clicks on keydown; Space on keyup.
      // jsdom does not synthesize these default clicks itself.
      if (activationKey === 'Enter') button.click();
      key(window, button, 'keyup', activationKey === 'Enter' ? 'Enter' : 'Space', { key: activationKey });
      if (activationKey === ' ') button.click();
    });
    assert.deepEqual(active(), []);
  }
  assert.deepEqual(labels(), ['Kick', 'Kick', 'Kick', 'Kick']);
  assert.deepEqual(audio.startedSounds, ['kick', 'kick', 'kick', 'kick']);
});

test('integration: mixed pointer/keyboard hits preserve visible newest-first order and the 20-entry limit', async () => {
  await mount();
  const expected = [];
  for (let index = 0; index < 27; index++) {
    const item = DRUM_PADS[index % DRUM_PADS.length];
    if (index % 2) await pointerClick(pad(item.id));
    else await physical(item.code);
    expected.unshift(item.label);
  }
  assert.deepEqual(labels(), expected.slice(0, 20));
  assert.equal(audio.startedSounds.length, 27);
});

test('integration: separated same-pad hits update the mounted polite output with distinct event text', async () => {
  await mount();
  const output = container.querySelector('output');
  assert.equal(output.getAttribute('aria-live'), 'polite');
  assert.equal(output.textContent, '');
  await pointerClick(pad('kick'));
  await act(async () => new Promise((resolve) => setTimeout(resolve, 350)));
  assert.equal(output.textContent, 'Hit 1: Kick, key W.');
  await pointerClick(pad('kick'));
  await act(async () => new Promise((resolve) => setTimeout(resolve, 350)));
  assert.equal(output.textContent, 'Hit 2: Kick, key W.');
  assert.equal(entries().length, 2);
});

for (const [name, options] of [
  ['missing asset', { missing: ['kick'] }],
  ['decode failure', { decodeFailure: true }],
  ['playback failure', { failStart: true }],
  ['unlock failure', { failUnlock: true }],
  ['unsupported Web Audio', { noAudio: true }],
]) {
  test(`integration: ${name} displays feedback while pointer/keyboard history and release keep working`, async () => {
    await mount(options);
    await pointerClick(pad('kick'));
    await physical('KeyW');
    assert.deepEqual(labels(), ['Kick', 'Kick']);
    assert.deepEqual(active(), []);
    assert.ok(container.querySelector('[role="status"]')?.textContent.trim());
    assert.deepEqual(audio.startedSounds, []);
    assert.equal(reading(), options.noAudio ? 'Audio level unavailable' : 'Silence (−∞ dBFS)');
    if (options.missing) {
      await pointerClick(pad('snare'));
      assert.deepEqual(labels(), ['Snare', 'Kick', 'Kick']);
      assert.deepEqual(audio.startedSounds, ['snare']);
      assert.ok(container.querySelector('[role="status"]')?.textContent.trim(), 'healthy playback must not hide the missing Kick');
    }
  });
}

test('integration: measured samples reach meter text/value and reset when the final source ends', async () => {
  await mount();
  await pointerClick(pad('kick'));
  await act(async () => audio.advanceFrame(0));
  assert.equal(reading(), '-6.0 dBFS RMS');
  const meter = container.querySelector('meter');
  assert.ok(Math.abs(meter.value - 20 * Math.log10(0.5)) < 1e-6);
  assert.equal(meter.getAttribute('aria-valuetext'), reading());
  await act(async () => audio.current.sources[0].finish());
  assert.equal(reading(), 'Silence (−∞ dBFS)');
  assert.equal(meter.value, -60);
  assert.equal(audio.frames.size, 0);
});

test('integration: no analyser reports unavailable while real app playback and history continue', async () => {
  await mount({ noAnalyser: true });
  await pointerClick(pad('kick'));
  await act(async () => audio.advanceFrame(0));
  assert.equal(reading(), 'Audio level unavailable');
  assert.equal(container.querySelector('meter').getAttribute('aria-valuetext'), reading());
  assert.deepEqual(audio.startedSounds, ['kick']);
  assert.deepEqual(labels(), ['Kick']);
});

test('integration: StrictMode unmount/remount removes old keyboard callbacks and disposes audio/RAF', async () => {
  await mount();
  await physical('KeyW');
  assert.deepEqual(audio.startedSounds, ['kick'], 'StrictMode must not duplicate input callbacks');
  const retiredAudio = audio;
  assert.ok(retiredAudio.frames.size > 0);
  await act(async () => root.unmount());
  root = null;
  assert.equal(retiredAudio.frames.size, 0);
  assert.equal(retiredAudio.contexts.every((context) => context.closeCount === 1), true);
  assert.equal(retiredAudio.contexts.every((context) => context.analyser.disconnected), true);
  await physical('KeyA');
  assert.deepEqual(retiredAudio.startedSounds, ['kick']);
  await mount();
  await physical('KeyA');
  assert.deepEqual(labels(), ['Snare']);
  assert.deepEqual(audio.startedSounds, ['snare']);
  assert.deepEqual(retiredAudio.startedSounds, ['kick']);
});
