import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GhostingAction as A,
  createGhostingState,
  ghostingReducer,
  REPLY_WINDOW_MS,
} from '../src/domain/ghostingState.js';
import { scheduleGhostingTimeout } from '../src/domain/ghostingTimer.js';
import { RelationshipEvent, RelationshipPhase } from '../src/domain/relationshipMachine.js';

function clock(start = 1000) {
  let now = start;
  let nextId = 1;
  const jobs = new Map();
  const api = {
    now: () => now,
    setTimer(fn, delay) {
      const id = nextId++;
      jobs.set(id, { fn, at: now + delay });
      return id;
    },
    clearTimer(id) {
      jobs.delete(id);
    },
  };

  return {
    api,
    pending: () => jobs.size,
    now: () => now,
    advance(ms) {
      const end = now + ms;
      while (true) {
        const ready = [...jobs]
          .filter(([, job]) => job.at <= end)
          .sort((a, b) => a[1].at - b[1].at || a[0] - b[0]);
        if (ready.length === 0) break;
        const [id, job] = ready[0];
        jobs.delete(id);
        now = job.at;
        job.fn();
      }
      now = end;
    },
    captureCallbacks: () => [...jobs.values()].map(job => job.fn),
  };
}

function harness(initial = RelationshipPhase.DATING_NO_LOVE) {
  let state = createGhostingState(initial);
  const time = clock();
  let cancel = () => {};
  let exits = 0;

  function dispatch(action) {
    const previous = state;
    state = ghostingReducer(state, action);
    if (previous.phase !== RelationshipPhase.GHOSTED_EXIT &&
        state.phase === RelationshipPhase.GHOSTED_EXIT) exits += 1;

    if (state.pendingMessage !== previous.pendingMessage || state.phase !== previous.phase) {
      cancel();
      cancel = () => {};
      if (state.pendingMessage && state.phase === RelationshipPhase.DATING_NO_LOVE) {
        cancel = scheduleGhostingTimeout(
          state.pendingMessage,
          identity => dispatch({ type: A.REPLY_TIMEOUT, ...identity }),
          time.api,
        );
      }
    }
    return state;
  }

  function send(id) {
    return dispatch({ type: A.SEND_MESSAGE, id, sentAt: time.now() });
  }

  function reply() {
    const pending = state.pendingMessage;
    return dispatch({
      type: A.RECEIVE_REPLY,
      id: pending.id,
      sequence: pending.sequence,
      receivedAt: time.now(),
    });
  }

  return {
    time,
    dispatch,
    send,
    reply,
    get state() { return state; },
    get exits() { return exits; },
    unmount() { cancel(); },
  };
}

test('mounting in dating does not start a timer; sending starts exactly one', () => {
  const app = harness();
  assert.equal(app.time.pending(), 0);
  app.send('m1');
  assert.equal(app.time.pending(), 1);
  assert.equal(app.state.pendingMessage.id, 'm1');
  assert.equal(
    app.state.pendingMessage.deadline - app.state.pendingMessage.sentAt,
    REPLY_WINDOW_MS,
  );
});

test('high-resolution fractional timestamps from performance.now are accepted', () => {
  const initial = createGhostingState();
  const state = ghostingReducer(initial, {
    type: A.SEND_MESSAGE,
    id: 'fractional',
    sentAt: 1000.25,
  });
  assert.equal(state.pendingMessage.sentAt, 1000.25);
  assert.equal(state.pendingMessage.deadline, 6000.25);
  assert.equal(state.pendingMessage.deadline - state.pendingMessage.sentAt, REPLY_WINDOW_MS);
});

test('4999ms remains dating; 5000ms exits exactly once', () => {
  const app = harness();
  app.send('m1');
  app.time.advance(4999);
  assert.equal(app.state.phase, RelationshipPhase.DATING_NO_LOVE);
  app.time.advance(1);
  assert.equal(app.state.phase, RelationshipPhase.GHOSTED_EXIT);
  assert.equal(app.state.pendingMessage, null);
  assert.equal(app.exits, 1);
  app.time.advance(20000);
  assert.equal(app.exits, 1);
});

test('reply before deadline cancels timeout; late or mismatched reply does not', () => {
  const app = harness();
  app.send('m1');
  const pending = app.state.pendingMessage;
  app.dispatch({
    type: A.RECEIVE_REPLY,
    id: 'wrong',
    sequence: pending.sequence,
    receivedAt: app.time.now(),
  });
  assert.equal(app.time.pending(), 1);
  app.time.advance(4999);
  app.reply();
  assert.equal(app.time.pending(), 0);
  app.time.advance(10000);
  assert.equal(app.state.phase, RelationshipPhase.DATING_NO_LOVE);

  const late = harness();
  late.send('m');
  const latePending = late.state.pendingMessage;
  late.dispatch({
    type: A.RECEIVE_REPLY,
    id: 'm',
    sequence: latePending.sequence,
    receivedAt: latePending.deadline,
  });
  assert.notEqual(late.state.pendingMessage, null);
});

test('Stop immediately exits and cancels the pending timeout', () => {
  const app = harness();
  app.send('m1');
  const staleCallback = app.time.captureCallbacks()[0];
  app.dispatch({ type: A.STOP });
  assert.equal(app.state.phase, RelationshipPhase.GHOSTED_EXIT);
  assert.equal(app.time.pending(), 0);
  app.time.advance(6000);
  staleCallback();
  assert.equal(app.exits, 1);
});

test('replacement cancels the old timer and stale callbacks cannot exit', () => {
  const app = harness();
  app.send('m1');
  const old = app.state.pendingMessage;
  const staleCallback = app.time.captureCallbacks()[0];
  app.time.advance(3000);
  app.send('m2');
  assert.equal(app.time.pending(), 1);

  app.dispatch({
    type: A.REPLY_TIMEOUT,
    id: old.id,
    sequence: old.sequence,
    now: old.deadline + 100,
  });
  staleCallback();
  assert.equal(app.state.phase, RelationshipPhase.DATING_NO_LOVE);
  app.time.advance(2000);
  assert.equal(app.state.phase, RelationshipPhase.DATING_NO_LOVE);
  app.time.advance(3000);
  assert.equal(app.state.phase, RelationshipPhase.GHOSTED_EXIT);
  assert.equal(app.exits, 1);
});

test('changing to official love clears the timer and blocks the old callback', () => {
  const app = harness();
  app.send('m1');
  const staleCallback = app.time.captureCallbacks()[0];
  app.dispatch({
    type: A.RELATIONSHIP_EVENT,
    event: RelationshipEvent.CONFIRM_MUTUAL_COMMITMENT,
  });
  assert.equal(app.state.phase, RelationshipPhase.OFFICIAL_LOVE);
  assert.equal(app.time.pending(), 0);
  app.time.advance(7000);
  staleCallback();
  assert.equal(app.state.phase, RelationshipPhase.OFFICIAL_LOVE);
});

test('unmount clears timeout; captured callback cannot update state', () => {
  const app = harness();
  app.send('m1');
  const staleCallback = app.time.captureCallbacks()[0];
  app.unmount();
  assert.equal(app.time.pending(), 0);
  app.time.advance(7000);
  staleCallback();
  assert.equal(app.state.phase, RelationshipPhase.DATING_NO_LOVE);
  assert.equal(app.exits, 0);
});

test('StrictMode-like setup-cleanup-setup keeps one active timeout', () => {
  const time = clock();
  let state = createGhostingState();
  state = ghostingReducer(state, {
    type: A.SEND_MESSAGE,
    id: 'm',
    sentAt: time.now(),
  });
  let exits = 0;
  const onTimeout = identity => {
    const previous = state;
    state = ghostingReducer(state, { type: A.REPLY_TIMEOUT, ...identity });
    if (previous.phase !== state.phase) exits += 1;
  };
  const cleanupFirst = scheduleGhostingTimeout(state.pendingMessage, onTimeout, time.api);
  cleanupFirst();
  const cleanupSecond = scheduleGhostingTimeout(state.pendingMessage, onTimeout, time.api);
  assert.equal(time.pending(), 1);
  time.advance(5000);
  assert.equal(exits, 1);
  assert.equal(state.phase, RelationshipPhase.GHOSTED_EXIT);
  cleanupSecond();
  assert.equal(time.pending(), 0);
});

test('unrelated state changes cannot restart a message timer', () => {
  const app = harness();
  app.send('m1');
  app.time.advance(3000);
  app.time.advance(2000);
  assert.equal(app.state.phase, RelationshipPhase.GHOSTED_EXIT);
});

test('invalid sends reject, ineligible sends are ignored, and ghosted state stays terminal', () => {
  const app = harness();
  assert.throws(() => app.send(''), TypeError);
  assert.throws(
    () => app.dispatch({ type: A.SEND_MESSAGE, id: 'x', sentAt: Infinity }),
    RangeError,
  );
  app.send('m1');
  assert.throws(() => app.send('m1'), /new ID/);
  app.dispatch({ type: A.STOP });
  const previous = app.state;
  assert.equal(app.dispatch({
    type: A.SEND_MESSAGE,
    id: 'm2',
    sentAt: app.time.now(),
  }), previous);
  assert.equal(app.dispatch({ type: A.STOP }), previous);
  assert.throws(() => app.dispatch({
    type: A.RELATIONSHIP_EVENT,
    event: RelationshipEvent.START_DATING,
  }), /Invalid relationship transition/);
});

test('premature timeout for the current message is ignored', () => {
  const app = harness();
  app.send('m1');
  const pending = app.state.pendingMessage;
  app.dispatch({
    type: A.REPLY_TIMEOUT,
    id: pending.id,
    sequence: pending.sequence,
    now: pending.deadline - 1,
  });
  assert.equal(app.state.phase, RelationshipPhase.DATING_NO_LOVE);
});

test('timeout expires at its monotonic deadline even if the wall clock moves backwards', () => {
  let monotonicNow = 10;
  let wallClockNow = 1000;
  let callback;
  let state = createGhostingState();
  state = ghostingReducer(state, {
    type: A.SEND_MESSAGE,
    id: 'monotonic',
    sentAt: monotonicNow,
  });
  let scheduledDelay;
  const cancel = scheduleGhostingTimeout(
    state.pendingMessage,
    identity => {
      state = ghostingReducer(state, { type: A.REPLY_TIMEOUT, ...identity });
    },
    {
      now: () => monotonicNow,
      setTimer(fn, delay) {
        callback = fn;
        scheduledDelay = delay;
        return 1;
      },
      clearTimer() {},
    },
  );
  assert.equal(scheduledDelay, 5000);
  monotonicNow = 5010;
  wallClockNow = 500;
  callback();
  assert.equal(wallClockNow, 500);
  assert.equal(state.phase, RelationshipPhase.GHOSTED_EXIT);
  assert.equal(state.pendingMessage, null);
  cancel();
});
