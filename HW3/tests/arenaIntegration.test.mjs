import test from 'node:test';
import assert from 'node:assert/strict';
import { createArenaDemoState } from '../src/data/arenaDemo.js';
import { calculateRemainingMs } from '../src/utils/airdropClock.js';
import { createMockClaimService } from '../src/claims/claimService.js';
import { createClaimController } from '../src/claims/createClaimController.js';
import { selectSquadStandings } from '../src/leaderboard/standings.js';
import { selectKillFeed } from '../src/killfeed/selectKillFeed.js';
import { DEMO_SQUAD_STANDINGS } from '../src/data/pubgVnSquads.js';
import { DEMO_KILL_EVENTS } from '../src/data/pubgKillEvents.js';

test('arena integration: both drop cards use a shared authoritative stock service, but independent claims', async () => {
  const { drops } = createArenaDemoState(100000);
  const service = createMockClaimService(drops);
  const controllers = drops.map((drop, i) => createClaimController({
    dropId: drop.id,
    initialStock: drop.remainingStock,
    claimService: service,
    createClaimId: () => `integration-claim-${i}`,
  }));
  const [vip, gcoin] = controllers;
  const claimVip = vip.claim();
  assert.equal(vip.getSnapshot().pending, true);
  assert.equal(vip.getSnapshot().remainingStock, drops[0].remainingStock - 1);
  assert.equal(gcoin.getSnapshot().remainingStock, drops[1].remainingStock);
  assert.equal(await vip.claim(), false, 'a duplicate click is blocked synchronously');
  assert.equal(await claimVip, true);
  assert.equal(await gcoin.claim(), true);
  assert.equal(service.getStock(drops[0].id), drops[0].remainingStock - 1);
  assert.equal(service.getStock(drops[1].id), drops[1].remainingStock - 1);
});

test('arena integration: deadline changes from live to expired under controlled clock', () => {
  const { deadline, drops } = createArenaDemoState(100000);
  assert.equal(drops.length, 2);
  assert.ok(drops.every(drop => drop.dropEpochMs === deadline));
  assert.equal(calculateRemainingMs(deadline, 0, deadline - 3000), 3000);
  assert.equal(calculateRemainingMs(deadline, 0, deadline + 60000), 0);
});

test('arena integration: standings and feed filters preserve shared source data', () => {
  const squadBefore = JSON.stringify(DEMO_SQUAD_STANDINGS);
  const feedBefore = JSON.stringify(DEMO_KILL_EVENTS);
  const selected = selectSquadStandings(DEMO_SQUAD_STANDINGS, { query: 'cerberus', sortBy: 'killPts', direction: 'desc' });
  assert.deepEqual(selected.map(s => s.squadId), ['ces']);
  const feed = selectKillFeed(DEMO_KILL_EVENTS, { squadId: 'ces', query: '', type: 'all' });
  assert.ok(feed.length > 0);
  assert.ok(feed.every(e => e.squadId === 'ces'));
  assert.equal(JSON.stringify(DEMO_SQUAD_STANDINGS), squadBefore);
  assert.equal(JSON.stringify(DEMO_KILL_EVENTS), feedBefore);
});

test('arena integration: expired phase prevents a new claim, no stock mutation', async () => {
  const { drops } = createArenaDemoState(5000);
  const service = createMockClaimService(drops);
  const controller = createClaimController({ dropId: drops[0].id, initialStock: drops[0].remainingStock, claimService: service, canClaim: () => false });
  assert.equal(await controller.claim(), false);
  assert.equal(service.getStock(drops[0].id), drops[0].remainingStock);
});

test('arena integration: ambiguous failure with no local stock can retry same operation', async () => {
  const service = createMockClaimService([{ id: 'one', remainingStock: 1 }]);
  let attempts = 0;
  let ids = 0;
  const losingResponseService = { async claim(request) {
    attempts++;
    const receipt = await service.claim(request);
    if (attempts === 1) throw new Error('Lost response');
    return receipt;
  }};
  const controller = createClaimController({ dropId: 'one', initialStock: 1, claimService: losingResponseService, createClaimId: () => `unique-${++ids}` });
  assert.equal(await controller.claim(), false);
  assert.equal(controller.getSnapshot().unresolved, true);
  controller.updateAuthoritativeStock(0);
  assert.equal(await controller.claim(), true);
  assert.equal(ids, 1);
  assert.equal(service.getStock('one'), 0);
  assert.equal(controller.getSnapshot().unresolved, false);
});
