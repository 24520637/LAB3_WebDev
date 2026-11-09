import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_SQUAD_STANDINGS as data } from '../src/data/pubgVnSquads.js';
import { selectSquadStandings as select } from '../src/leaderboard/standings.js';
const ids = (rows) => rows.map((row) => row.squadId);
test('the four assignment IDs map to the specified names', () => {
  assert.deepEqual(Object.fromEntries(data.map((s) => [s.squadId, s.squadName])), {
    te: 'The Expendables', ces: 'Cerberus Esports', ge: 'Roy Esports', agg: 'AGG',
  });
});
test('case-insensitive, trimmed squad search', () => {
  assert.deepEqual(ids(select(data, { query: ' cErBeRus ' })), ['ces']);
});
test('each supported metric sorts descending and ascending', () => {
  for (const sortBy of ['wwcdCount', 'placementPts', 'killPts']) {
    assert.deepEqual(ids(select(data, { sortBy })), ['te', 'ces', 'ge', 'agg']);
    assert.deepEqual(ids(select(data, { sortBy, direction: 'asc' })), ['agg', 'ge', 'ces', 'te']);
  }
});
test('sorting is immutable even for frozen input', () => {
  const input = Object.freeze([Object.freeze({ ...data[1] }), Object.freeze({ ...data[0] })]);
  const output = select(input);
  assert.deepEqual(ids(output), ['te', 'ces']);
  assert.deepEqual(ids(input), ['ces', 'te']);
  assert.notStrictEqual(output, input);
});
test('ties break deterministically by squadId', () => {
  const tied = data.map((s) => ({ ...s, wwcdCount: 1 }));
  assert.deepEqual(ids(select(tied)), ['agg', 'ces', 'ge', 'te']);
});
test('empty and no-match results return empty lists', () => {
  assert.deepEqual(select([]), []);
  assert.deepEqual(select(data, { query: 'not found' }), []);
});
test('invalid sorting parameters and numeric values fail explicitly', () => {
  assert.throws(() => select(data, { sortBy: '__proto__' }), RangeError);
  assert.throws(() => select(data, { direction: 'random' }), RangeError);
  assert.throws(() => select([{ ...data[0], wwcdCount: NaN }]), TypeError);
});
