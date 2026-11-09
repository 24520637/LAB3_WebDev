import test from 'node:test';
import assert from 'node:assert/strict';
import { DRUM_PADS } from '../src/data/pads.js';
import { createDrumKeyboardController } from '../src/hooks/drumKeyboardController.js';
import { drumReducer, initialDrumState } from '../src/state/drumState.js';

function setup() {
  const listeners = new Map();
  const hostWindow = {
    document: { designMode: 'off', activeElement: null },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
  };
  const padMap = new Map(DRUM_PADS.map(p => [p.code, p]));
  const hits = [];
  let state = initialDrumState;
  const cleanup = createDrumKeyboardController({
    hostWindow, padMap,
    onHit(id) { hits.push(id); state = drumReducer(state, { type: 'HIT', padId: id }); },
    onActiveChange(id) { state = drumReducer(state, { type: 'SET_ACTIVE', padId: id }); },
  });
  const emit = (type, options = {}) => {
    const event = {
      code: options.code,
      repeat: options.repeat ?? false,
      ctrlKey: options.ctrlKey ?? false,
      altKey: options.altKey ?? false,
      metaKey: options.metaKey ?? false,
      isComposing: options.isComposing ?? false,
      target: options.target ?? { tagName: 'BODY' },
      composedPath: options.composedPath,
      defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; },
    };
    for (const fn of [...(listeners.get(type) ?? [])]) fn(event);
    return event;
  };
  return { emit, hits, getState: () => state, cleanup, listeners, hostWindow };
}

test('all seven physical keys map to their exact configured pads', () => {
  const s = setup();
  for (const pad of DRUM_PADS) {
    const down = s.emit('keydown', { code: pad.code });
    assert.equal(down.defaultPrevented, true);
    assert.equal(s.getState().activePadId, pad.id);
    s.emit('keyup', { code: pad.code });
    assert.equal(s.getState().activePadId, null);
  }
  assert.deepEqual(s.hits, DRUM_PADS.map(p => p.id));
  s.cleanup();
});

test('unknown keys are ignored and not prevented', () => {
  const s = setup();
  assert.equal(s.emit('keydown', { code: 'KeyQ' }).defaultPrevented, false);
  assert.equal(s.emit('keyup', { code: 'KeyQ' }).defaultPrevented, false);
  assert.deepEqual(s.hits, []);
  s.cleanup();
});

test('repeat guard and held-key guard allow only one hit before release', () => {
  const s = setup();
  s.emit('keydown', { code: 'KeyW' });
  s.emit('keydown', { code: 'KeyW', repeat: true });
  s.emit('keydown', { code: 'KeyW' });
  assert.deepEqual(s.hits, ['kick']);
  s.emit('keyup', { code: 'KeyW' });
  s.emit('keydown', { code: 'KeyW' });
  assert.deepEqual(s.hits, ['kick', 'kick']);
  s.cleanup();
});

test('rapid switching preserves hits and restores remaining pressed pad', () => {
  const s = setup();
  s.emit('keydown', { code: 'KeyW' });
  s.emit('keydown', { code: 'KeyA' });
  s.emit('keydown', { code: 'KeyS' });
  assert.equal(s.getState().activePadId, 'hi-hat');
  s.emit('keyup', { code: 'KeyA' });
  assert.equal(s.getState().activePadId, 'hi-hat');
  s.emit('keyup', { code: 'KeyS' });
  assert.equal(s.getState().activePadId, 'kick');
  s.emit('keyup', { code: 'KeyW' });
  assert.equal(s.getState().activePadId, null);
  assert.deepEqual(s.hits, ['kick', 'snare', 'hi-hat']);
  assert.deepEqual(s.getState().hitHistory.map(h => h.padId), ['hi-hat', 'snare', 'kick']);
  s.cleanup();
});

for (const tag of ['INPUT', 'TEXTAREA', 'SELECT']) {
  test(`${tag} focus does not trigger physical shortcuts`, () => {
    const s = setup();
    const down = s.emit('keydown', { code: 'KeyW', target: { tagName: tag } });
    assert.equal(down.defaultPrevented, false);
    assert.deepEqual(s.hits, []);
    s.cleanup();
  });
}

test('contenteditable and nested editable targets are isolated', () => {
  const s = setup();
  s.emit('keydown', { code: 'KeyW', target: { tagName: 'DIV', isContentEditable: true } });
  s.emit('keydown', { code: 'KeyA', target: { tagName: 'SPAN', closest: sel => sel.includes('contenteditable') ? {} : null } });
  assert.deepEqual(s.hits, []);
  s.cleanup();
});

test('editable roles, shadow-DOM composed path and designMode are isolated', () => {
  const s = setup();
  s.emit('keydown', { code: 'KeyW', target: { tagName: 'DIV', getAttribute: k => k === 'role' ? 'textbox' : null } });
  s.emit('keydown', { code: 'KeyW', composedPath: () => [{ tagName: 'TEXTAREA' }] });
  s.hostWindow.document.designMode = 'on';
  s.emit('keydown', { code: 'KeyW' });
  assert.deepEqual(s.hits, []);
  s.cleanup();
});

test('IME composition prevents hits, and clears held keys safely', () => {
  const s = setup();
  s.emit('keydown', { code: 'KeyW', isComposing: true });
  s.emit('compositionstart');
  s.emit('keydown', { code: 'KeyW' });
  assert.deepEqual(s.hits, []);
  s.emit('compositionend');
  s.emit('keydown', { code: 'KeyW' });
  assert.deepEqual(s.hits, ['kick']);
  s.emit('compositionstart');
  assert.equal(s.getState().activePadId, null);
  s.emit('keyup', { code: 'KeyW' });
  s.cleanup();
});

test('window blur clears held keys and allows fresh hits on focus return', () => {
  const s = setup();
  s.emit('keydown', { code: 'KeyW' });
  s.emit('blur');
  assert.equal(s.getState().activePadId, null);
  s.emit('keydown', { code: 'KeyW' });
  assert.deepEqual(s.hits, ['kick', 'kick']);
  s.cleanup();
});

test('key release clears pressed state even after moving into editor', () => {
  const s = setup();
  s.emit('keydown', { code: 'KeyW' });
  const up = s.emit('keyup', { code: 'KeyW', target: { tagName: 'INPUT' } });
  assert.equal(up.defaultPrevented, false);
  assert.equal(s.getState().activePadId, null);
  s.cleanup();
});

test('unmount cleanup removes every listener; remount registers exactly once', () => {
  const s = setup();
  assert.deepEqual([...s.listeners.values()].map(v => v.size), [1, 1, 1, 1, 1]);
  s.cleanup();
  assert.deepEqual([...s.listeners.values()].map(v => v.size), [0, 0, 0, 0, 0]);
  s.emit('keydown', { code: 'KeyW' });
  assert.deepEqual(s.hits, []);
  const other = setup();
  other.emit('keydown', { code: 'KeyW' });
  assert.deepEqual(other.hits, ['kick']);
  other.cleanup();
});

test('active state reducer does not modify bounded hit history on release', () => {
  const s = setup();
  s.emit('keydown', { code: 'KeyW' });
  const history = s.getState().hitHistory;
  s.emit('keyup', { code: 'KeyW' });
  assert.strictEqual(s.getState().hitHistory, history);
  assert.equal(s.getState().activePadId, null);
  s.cleanup();
});


test('browser modifier shortcuts are not hijacked', () => {
  const s = setup();
  for (const key of ['ctrlKey', 'altKey', 'metaKey']) {
    const event = s.emit('keydown', { code: 'KeyW', [key]: true });
    assert.equal(event.defaultPrevented, false);
  }
  assert.deepEqual(s.hits, []);
  s.cleanup();
});

test('blur resets stale composition state before next focus', () => {
  const s = setup();
  s.emit('compositionstart');
  s.emit('blur');
  s.emit('keydown', { code: 'KeyW' });
  assert.deepEqual(s.hits, ['kick']);
  s.cleanup();
});
