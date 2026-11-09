import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// An isolated hook lifecycle harness, NOT a mounted React 19 integration test.
// Only replaces the React dispatcher; the production hook/effect code is run.
const hookPath = new URL('../src/hooks/usePubgAirdropTimer.js', import.meta.url);
const clockUrl = new URL('../src/utils/airdropClock.js', import.meta.url);
const original = await readFile(hookPath, 'utf8');
const testSource = original
  .replace("import { useEffect, useState } from 'react';", 'const useEffect = (...args) => globalThis.__hookHarness.useEffect(...args); const useState = (...args) => globalThis.__hookHarness.useState(...args);')
  .replace("from '../utils/airdropClock.js'", `from '${clockUrl.href}'`);
const hookModule = await import(`data:text/javascript;base64,${Buffer.from(testSource).toString('base64')}`);

function setup(startMs) {
  const clock = { now: startMs };
  const realNow = Date.now;
  Date.now = () => clock.now;
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousHarness = globalThis.__hookHarness;
  const listeners = new Set();
  const intervals = new Map();
  let nextTimerId = 0;
  const documentMock = {
    visibilityState: 'visible',
    addEventListener: (type, callback) => { assert.equal(type, 'visibilitychange'); listeners.add(callback); },
    removeEventListener: (type, callback) => { assert.equal(type, 'visibilitychange'); listeners.delete(callback); },
  };
  const windowMock = {
    setInterval: (cb, delay) => { assert.equal(delay, 200); const id = ++nextTimerId; intervals.set(id, cb); return id; },
    clearInterval: id => { intervals.delete(id); },
  };
  globalThis.window = windowMock;
  globalThis.document = documentMock;

  let state;
  let storedDeps;
  let cleanup;
  let pendingEffect;
  let didRunEffect = false;
  globalThis.__hookHarness = {
    useState: initializer => [state ??= initializer(), update => { state = typeof update === 'function' ? update(state) : update; }],
    useEffect: (effect, deps) => {
      if (!didRunEffect || deps.some((v, index) => !Object.is(v, storedDeps[index]))) {
        pendingEffect = effect;
        storedDeps = [...deps];
      }
    },
  };
  const render = (target, offset = 0) => {
    const value = hookModule.usePubgAirdropTimer(target, offset);
    if (pendingEffect) {
      cleanup?.();
      cleanup = pendingEffect();
      pendingEffect = undefined;
      didRunEffect = true;
    }
    return value;
  };
  return {
    clock, listeners, intervals, documentMock, render,
    tick() { for (const cb of [...intervals.values()]) cb(); },
    wake() { for (const cb of [...listeners]) cb(); },
    unmount() { cleanup?.(); cleanup = undefined; didRunEffect = false; },
    restore() {
      cleanup?.();
      Date.now = realNow;
      globalThis.window = previousWindow;
      globalThis.document = previousDocument;
      globalThis.__hookHarness = previousHarness;
    },
  };
}

test('hook synchronizes with an absolute deadline after delayed tick and visible wake', () => {
  const app = setup(10_000);
  try {
    assert.equal(app.render(30_000).remainingMs, 20_000);
    assert.equal(app.intervals.size, 1);
    assert.equal(app.listeners.size, 1);
    app.clock.now = 25_000;
    app.documentMock.visibilityState = 'hidden';
    app.wake(); // no resync in hidden state
    assert.equal(app.render(30_000).remainingMs, 20_000);
    app.documentMock.visibilityState = 'visible';
    app.wake();
    assert.equal(app.render(30_000).remainingMs, 5_000);
    app.clock.now = 40_000;
    app.tick();
    assert.deepEqual(app.render(30_000), {remainingMs: 0, hasReachedTarget: true, isLive: true});
  } finally { app.restore(); }
});

test('target and offset changes update immediately and replace subscriptions', () => {
  const app = setup(10_000);
  try {
    app.render(30_000);
    assert.equal(app.render(40_000, 5_000).remainingMs, 25_000);
    assert.equal(app.intervals.size, 1);
    assert.equal(app.listeners.size, 1);
    assert.equal(app.render(40_000, 5_000).remainingMs, 25_000);
    app.clock.now = 20_000;
    app.tick();
    assert.equal(app.render(40_000, 5_000).remainingMs, 15_000);
  } finally { app.restore(); }
});

test('unmount removes interval/listener and no callbacks remain', () => {
  const app = setup(10_000);
  try {
    app.render(30_000);
    app.unmount();
    assert.equal(app.intervals.size, 0);
    assert.equal(app.listeners.size, 0);
  } finally { app.restore(); }
});

test('effect cleanup works through a Strict Mode-like setup-cleanup-setup cycle', () => {
  const app = setup(10_000);
  try {
    app.render(30_000);
    app.unmount();
    app.render(30_000);
    assert.equal(app.intervals.size, 1);
    assert.equal(app.listeners.size, 1);
  } finally { app.restore(); }
});

test('invalid hook input throws before scheduling timers', () => {
  const app = setup(10_000);
  try {
    assert.throws(() => app.render(NaN), TypeError);
    assert.equal(app.intervals.size, 0);
  } finally { app.restore(); }
});
