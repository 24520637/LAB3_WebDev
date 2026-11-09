import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_KILL_EVENTS as events } from '../src/data/pubgKillEvents.js';
import { selectKillFeed as select } from '../src/killfeed/selectKillFeed.js';
const ids = (rows) => rows.map((row) => row.id);
test('events sort newest-first regardless of original ordering', () => {
  assert.deepEqual(ids(select([...events].reverse())), ['demo-1', 'demo-2', 'demo-3', 'demo-4']);
});
test('filter by squad, type, and case-insensitive actor/target text', () => {
  assert.deepEqual(ids(select(events, { squadId: 'ge' })), ['demo-3']);
  assert.deepEqual(ids(select(events, { type: 'KNOCK' })), ['demo-2']);
  assert.deepEqual(ids(select(events, { query: ' roy ' })), ['demo-3', 'demo-4']);
});
test('combined filters are conjunctive and empty state is safe', () => {
  assert.deepEqual(ids(select(events, { squadId: 'te', type: 'KILL', query: 'ces' })), ['demo-1']);
  assert.deepEqual(select(events, { squadId: 'te', type: 'KNOCK' }), []);
  assert.deepEqual(select([]), []);
});
test('event data is not mutated, even when frozen', () => {
  const reversed = Object.freeze([...events].reverse());
  select(reversed);
  assert.deepEqual(ids(reversed), ['demo-4', 'demo-3', 'demo-2', 'demo-1']);
});
test('equal timestamps are deterministically ordered by event ID', () => {
  const sameTime = Object.freeze([
    Object.freeze({ ...events[0], id: 'b' }),
    Object.freeze({ ...events[1], id: 'a', occurredAtMs: events[0].occurredAtMs }),
  ]);
  assert.deepEqual(ids(select(sameTime)), ['a', 'b']);
});
test('duplicate IDs and invalid timestamp are rejected', () => {
  assert.throws(() => select([events[0], events[0]]), TypeError);
  assert.throws(() => select([{ ...events[0], occurredAtMs: NaN }]), TypeError);
});
