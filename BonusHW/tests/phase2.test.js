import test from 'node:test';
import assert from 'node:assert/strict';
import { EffortAction, EFFORT_MULTIPLIER, effortLogReducer } from '../src/domain/effortLog.js';
import { RelationshipPhase as P } from '../src/domain/relationshipMachine.js';
import { calculateEffortScores, analyzeRelationship } from '../src/domain/effortAnalysis.js';

function append(log, id, actor, steps) {
  return effortLogReducer(log, {
    type: EffortAction.APPEND_EFFORT,
    signal: { id, actor, steps, multiplier: EFFORT_MULTIPLIER[actor] },
  });
}

test('empty log gives zero scores and no red flag', () => {
  assert.deepEqual(calculateEffortScores([]), { emScore: 0, rivalScore: 0 });
  assert.deepEqual(analyzeRelationship(P.DATING_NO_LOVE, []), {
    emScore: 0,
    rivalScore: 0,
    redFlagWarning: false,
  });
});

test('approved fixture EM 100x0.1=10, AI_DO 1x50=50 yields warning while dating', () => {
  const log = append(append([], 'em-1', 'EM', 100), 'ai-1', 'AI_DO', 1);
  assert.deepEqual(analyzeRelationship(P.DATING_NO_LOVE, log), {
    emScore: 10,
    rivalScore: 50,
    redFlagWarning: true,
  });
});

test('each actor accumulates multiple signal contributions, not only latest', () => {
  const log = append(
    append(append(append([], 'e1', 'EM', 100), 'a1', 'AI_DO', 1), 'e2', 'EM', 400),
    'a2',
    'AI_DO',
    0.5,
  );
  assert.deepEqual(analyzeRelationship(P.DATING_NO_LOVE, log), {
    emScore: 50,
    rivalScore: 75,
    redFlagWarning: true,
  });
});

test('red flag requires dating and strictly lower EM score', () => {
  const log = append(append([], 'e', 'EM', 100), 'a', 'AI_DO', 1);
  for (const phase of [P.FRIENDS, P.OFFICIAL_LOVE, P.GHOSTED_EXIT]) {
    assert.equal(analyzeRelationship(phase, log).redFlagWarning, false);
  }
  assert.equal(analyzeRelationship(P.DATING_NO_LOVE, append(log, 'e2', 'EM', 400)).redFlagWarning, false);
  assert.equal(analyzeRelationship(P.DATING_NO_LOVE, append(log, 'e3', 'EM', 500)).redFlagWarning, false);
});

test('new log and phase produce updated derived results without mutating earlier log', () => {
  const base = Object.freeze([]);
  const one = append(base, 'a', 'AI_DO', 1);
  const two = append(one, 'e', 'EM', 600);
  assert.deepEqual(analyzeRelationship(P.DATING_NO_LOVE, one), {
    emScore: 0,
    rivalScore: 50,
    redFlagWarning: true,
  });
  assert.deepEqual(analyzeRelationship(P.DATING_NO_LOVE, two), {
    emScore: 60,
    rivalScore: 50,
    redFlagWarning: false,
  });
  assert.deepEqual(analyzeRelationship(P.OFFICIAL_LOVE, one), {
    emScore: 0,
    rivalScore: 50,
    redFlagWarning: false,
  });
  assert.deepEqual(base, []);
  assert.deepEqual(one.map(x => x.id), ['a']);
  assert.deepEqual(two.map(x => x.id), ['a', 'e']);
});

test('selectors reject malformed log, unknown phase, wrong multipliers, and score overflow', () => {
  assert.throws(() => calculateEffortScores(null), TypeError);
  assert.throws(() => analyzeRelationship('NOT_A_PHASE', []), TypeError);
  assert.throws(() => calculateEffortScores([{ actor: 'OTHER', steps: 1, multiplier: 1 }]), TypeError);
  assert.throws(() => calculateEffortScores([{ actor: 'EM', steps: NaN, multiplier: 0.1 }]), TypeError);
  assert.throws(() => calculateEffortScores([{ actor: 'EM', steps: 1, multiplier: 50 }]), RangeError);
  assert.throws(() => calculateEffortScores([{ actor: 'AI_DO', steps: 1, multiplier: 0.1 }]), RangeError);
  assert.throws(() => calculateEffortScores([{ actor: 'AI_DO', steps: 1e308, multiplier: 50 }]), RangeError);
});
