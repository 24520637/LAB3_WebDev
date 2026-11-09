import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RelationshipPhase as P,
  RelationshipEvent as E,
  transitionRelationship,
  relationshipReducer,
} from '../src/domain/relationshipMachine.js';
import {
  EffortActor,
  EFFORT_MULTIPLIER,
  EffortAction,
  effortLogReducer,
} from '../src/domain/effortLog.js';

const phases = Object.values(P);
const events = Object.values(E);
const allowed = new Map([
  [`${P.FRIENDS}:${E.START_DATING}`, P.DATING_NO_LOVE],
  [`${P.DATING_NO_LOVE}:${E.CONFIRM_MUTUAL_COMMITMENT}`, P.OFFICIAL_LOVE],
  [`${P.DATING_NO_LOVE}:${E.EXIT}`, P.GHOSTED_EXIT],
]);

test('FSM has precisely the four canonical phases and three explicit events', () => {
  assert.deepEqual(phases, ['FRIENDS', 'DATING_NO_LOVE', 'OFFICIAL_LOVE', 'GHOSTED_EXIT']);
  assert.deepEqual(events, ['START_DATING', 'CONFIRM_MUTUAL_COMMITMENT', 'EXIT']);
});

test('FSM exhaustive valid/invalid transition matrix', () => {
  for (const phase of phases) {
    for (const event of events) {
      const expected = allowed.get(`${phase}:${event}`);
      if (expected) assert.equal(transitionRelationship(phase, event), expected);
      else assert.throws(() => transitionRelationship(phase, event), /Invalid relationship transition/);
    }
  }
});

test('GHOSTED_EXIT remains terminal; no implicit reset', () => {
  for (const event of events) assert.throws(() => transitionRelationship(P.GHOSTED_EXIT, event));
  assert.throws(() => transitionRelationship(P.FRIENDS, 'RESET'), TypeError);
});

test('FSM refuses unknown states, events, and invalid action objects', () => {
  assert.throws(() => transitionRelationship('LOVED', E.EXIT), TypeError);
  assert.throws(() => relationshipReducer(P.FRIENDS, null), TypeError);
  assert.equal(relationshipReducer(P.FRIENDS, { type: E.START_DATING }), P.DATING_NO_LOVE);
});

test('effort append creates fresh array, preserves order and does not mutate old entries', () => {
  const initial = Object.freeze([]);
  const first = Object.freeze({ id: 'em-1', actor: 'EM', steps: 100, multiplier: 0.1 });
  const afterFirst = effortLogReducer(initial, { type: EffortAction.APPEND_EFFORT, signal: first });
  const afterSecond = effortLogReducer(afterFirst, {
    type: EffortAction.APPEND_EFFORT,
    signal: { id: 'ai-1', actor: 'AI_DO', steps: 1, multiplier: 50 },
  });
  assert.notStrictEqual(afterFirst, initial);
  assert.notStrictEqual(afterSecond, afterFirst);
  assert.deepEqual(afterSecond.map(x => x.id), ['em-1', 'ai-1']);
  assert.deepEqual(initial, []);
  assert.deepEqual(afterFirst.map(x => x.id), ['em-1']);
  assert.notStrictEqual(afterFirst[0], first);
  assert.ok(Object.isFrozen(afterFirst[0]));
  assert.deepEqual(
    [afterSecond[0].steps * afterSecond[0].multiplier, afterSecond[1].steps * afterSecond[1].multiplier],
    [10, 50],
  );
});

test('duplicate IDs are rejected without changing existing log', () => {
  const log = effortLogReducer([], {
    type: EffortAction.APPEND_EFFORT,
    signal: { id: 'same', actor: 'EM', steps: 1, multiplier: 0.1 },
  });
  const snapshot = [...log];
  assert.throws(
    () => effortLogReducer(log, {
      type: EffortAction.APPEND_EFFORT,
      signal: { id: 'same', actor: 'AI_DO', steps: 1, multiplier: 50 },
    }),
    /Duplicate/,
  );
  assert.deepEqual(log, snapshot);
});

test('invalid IDs, actor, steps, multiplier, and overflow reject', () => {
  const base = { id: 'x', actor: 'EM', steps: 1, multiplier: 0.1 };
  const invalid = [
    { id: '' }, { id: 2 }, { actor: 'OTHER' }, { steps: -1 },
    { steps: NaN }, { steps: Infinity }, { steps: '1' },
    { multiplier: NaN }, { multiplier: -1 }, { multiplier: Infinity },
    { multiplier: 50 }, { actor: 'AI_DO' },
  ];
  for (const changes of invalid) {
    assert.throws(
      () => effortLogReducer([], {
        type: EffortAction.APPEND_EFFORT,
        signal: { ...base, ...changes },
      }),
      undefined,
      JSON.stringify(changes),
    );
  }
  assert.throws(
    () => effortLogReducer([], {
      type: EffortAction.APPEND_EFFORT,
      signal: { id: 'overflow', actor: 'AI_DO', steps: 1e308, multiplier: 50 },
    }),
    /finite/,
  );
  assert.throws(() => effortLogReducer([], {
    type: EffortAction.APPEND_EFFORT,
    signal: null,
  }));
  assert.throws(() => effortLogReducer([], { type: 'REMOVE', signal: base }));
  assert.throws(() => effortLogReducer(null, {
    type: EffortAction.APPEND_EFFORT,
    signal: base,
  }));
  assert.equal(EFFORT_MULTIPLIER[EffortActor.EM], 0.1);
  assert.equal(EFFORT_MULTIPLIER[EffortActor.AI_DO], 50);
});

test('zero and fractional nonnegative steps are accepted', () => {
  const zero = effortLogReducer([], {
    type: EffortAction.APPEND_EFFORT,
    signal: { id: 'zero', actor: 'EM', steps: 0, multiplier: 0.1 },
  });
  const partial = effortLogReducer(zero, {
    type: EffortAction.APPEND_EFFORT,
    signal: { id: 'part', actor: 'EM', steps: 0.5, multiplier: 0.1 },
  });
  assert.deepEqual(partial.map(x => x.steps), [0, 0.5]);
});
