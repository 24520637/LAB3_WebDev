import test from 'node:test';
import assert from 'node:assert/strict';
import { ClaimError, createMockClaimService, createHttpClaimService, formatVnd } from '../src/claims/claimService.js';
import { createClaimController } from '../src/claims/createClaimController.js';

function deferred() { let resolve; let reject; const promise = new Promise((a,b)=>{resolve=a;reject=b;}); return {promise,resolve,reject}; }
const make = (service, stock = 2, extra = {}) => createClaimController({dropId:'vip', initialStock:stock, claimService:service, createClaimId:()=> 'fixed-1',...extra});

test('success decreases stock immediately and confirms exactly once', async () => {
  const d=deferred(); let calls=0;
  const c=make({claim:()=>{calls++;return d.promise;}});
  const pending=c.claim();
  assert.deepEqual([c.getSnapshot().remainingStock,c.getSnapshot().pending,c.getSnapshot().status],[1,true,'pending']);
  d.resolve({remainingStock:1});
  assert.equal(await pending,true);
  assert.equal(c.getSnapshot().remainingStock,1);
  assert.equal(c.getSnapshot().status,'success');
  assert.equal(calls,1);
});

test('duplicate rapid click cannot issue second request', async () => {
  const d=deferred(); let calls=0;
  const c=make({claim:()=>{calls++;return d.promise;}});
  const first=c.claim();
  assert.equal(await c.claim(),false);
  assert.equal(calls,1);
  d.resolve({remainingStock:1});
  await first;
  assert.equal(c.getSnapshot().remainingStock,1);
});

test('HTTP 409 rolls back optimistic deduction and exposes conflict', async () => {
  const d=deferred(); const c=make({claim:()=>d.promise});
  const p=c.claim();
  assert.equal(c.getSnapshot().remainingStock,1);
  d.reject(new ClaimError('Conflict',409));
  assert.equal(await p,false);
  assert.deepEqual([c.getSnapshot().remainingStock,c.getSnapshot().pending,c.getSnapshot().status],[2,false,'conflict']);
});

test('409 with authoritative zero reconciles rather than restoring stale stock', async () => {
  const c=make({claim:async()=>{throw new ClaimError('Looted out',409,0);}});
  assert.equal(await c.claim(),false);
  assert.equal(c.getSnapshot().remainingStock,0);
  assert.equal(await c.claim(),false);
});

test('network failure rolls back and permits retry', async () => {
  let calls=0;
  const c=make({claim:async()=>{if(++calls===1)throw new Error('offline');return {remainingStock:1};}});
  assert.equal(await c.claim(),false);
  assert.equal(c.getSnapshot().remainingStock,2);
  assert.equal(c.getSnapshot().status,'error');
  assert.equal(await c.claim(),true);
  assert.equal(c.getSnapshot().remainingStock,1);
});

test('claim is not attempted for out-of-phase or zero-stock drops', async () => {
  let calls=0;
  const service={claim:async()=>{calls++;return {};}};
  const c=make(service, 2, {canClaim:()=>false});
  assert.equal(await c.claim(),false);
  assert.equal(await make(service,0).claim(),false);
  assert.equal(calls,0);
});

test('cancel aborts and ignores late success; no stock is spent', async () => {
  const d=deferred(); let signal;
  const c=make({claim:({signal:s})=>{signal=s;return d.promise;}});
  const p=c.claim(); c.cancelPending();
  assert.equal(signal.aborted,true);
  d.resolve({remainingStock:0});
  assert.equal(await p,false);
  assert.equal(c.getSnapshot().remainingStock,2);
});

test('newer stock update is not overwritten by stale success', async () => {
  const d=deferred(); const c=make({claim:()=>d.promise});
  const p=c.claim();
  c.updateAuthoritativeStock(5);
  assert.equal(c.getSnapshot().remainingStock,4);
  d.resolve({remainingStock:1});
  await p;
  assert.equal(c.getSnapshot().remainingStock,5);
});

test('mock authority is idempotent and enforces sold-out conflict', async () => {
  const s=createMockClaimService([{id:'vip',remainingStock:1}]);
  const a=await s.claim({dropId:'vip',claimId:'a'});
  assert.deepEqual(await s.claim({dropId:'vip',claimId:'a'}),a);
  assert.equal(s.getStock('vip'),0);
  await assert.rejects(s.claim({dropId:'vip',claimId:'b'}),e=>e.status===409 && e.remainingStock===0);
});

test('HTTP adapter sends idempotency and parses 409 authoritative stock', async () => {
  let req;
  const api=createHttpClaimService({endpoint:'/claims',fetchImpl:async(url,options)=>{req={url,options};return {ok:false,status:409,json:async()=>({remainingStock:0})};}});
  await assert.rejects(api.claim({dropId:'vip',claimId:'claim-1'}),e=>e.status===409 && e.remainingStock===0);
  assert.equal(req.url,'/claims');
  assert.equal(req.options.headers['Idempotency-Key'],'claim-1');
  assert.deepEqual(JSON.parse(req.options.body),{dropId:'vip',claimId:'claim-1'});
});

test('HTTP adapter success and malformed response', async () => {
  const ok=createHttpClaimService({endpoint:'/claims',fetchImpl:async()=>({ok:true,json:async()=>({remainingStock:3})})});
  assert.equal((await ok.claim({dropId:'vip',claimId:'a'})).remainingStock,3);
  const bad=createHttpClaimService({endpoint:'/claims',fetchImpl:async()=>({ok:true,json:async()=>({})})});
  await assert.rejects(bad.claim({dropId:'vip',claimId:'a'}),/Invalid authoritative/);
});

test('VND formatted through Intl and invalid stock values rejected', () => {
  assert.equal(formatVnd(499000),new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(499000));
  assert.throws(()=>formatVnd(-1));
  assert.throws(()=>make({claim:async()=>({})},-1));
});


test('late 409 cannot overwrite newer stock notification', async () => {
  const d=deferred();
  const c=make({claim:()=>d.promise});
  const p=c.claim();
  c.updateAuthoritativeStock(4);
  d.reject(new ClaimError('conflict',409,0));
  await p;
  assert.equal(c.getSnapshot().remainingStock,4);
  assert.equal(c.getSnapshot().status,'conflict');
});

test('subscribers receive immutable pending and settled snapshots', async () => {
  const d=deferred(); const c=make({claim:()=>d.promise});
  const events=[];
  const unsubscribe=c.subscribe(()=>events.push(c.getSnapshot()));
  const p=c.claim();
  d.resolve({remainingStock:1}); await p;
  unsubscribe();
  assert.deepEqual(events.map(x=>x.status),['pending','success']);
  assert.equal(Object.isFrozen(events[0]),true);
});

test('lost committed response retries the same operation; next confirmed claim gets a new ID', async () => {
  const authority = createMockClaimService([{ id: 'vip', remainingStock: 2 }]);
  const ids = [];
  let generated = 0;
  const c = make({ async claim(request) {
    ids.push(request.claimId);
    const receipt = await authority.claim(request);
    if (ids.length === 1) throw new Error('Response lost after commit');
    return receipt;
  } }, 2, { createClaimId: () => `operation-${++generated}` });

  assert.equal(await c.claim(), false);
  assert.equal(authority.getStock('vip'), 1);
  assert.equal(c.getSnapshot().remainingStock, 2);
  assert.equal(await c.claim(), true);
  assert.equal(authority.getStock('vip'), 1, 'retry must not spend another unit');
  assert.equal(c.getSnapshot().remainingStock, 1);
  assert.deepEqual(ids, ['operation-1', 'operation-1']);

  assert.equal(await c.claim(), true);
  assert.equal(authority.getStock('vip'), 0);
  assert.deepEqual(ids, ['operation-1', 'operation-1', 'operation-2']);
});

test('retried receipt cannot overwrite an authoritative update received between attempts', async () => {
  const authority = createMockClaimService([{ id: 'vip', remainingStock: 2 }]);
  let attempts = 0;
  let generated = 0;
  const c = make({ async claim(request) {
    const receipt = await authority.claim(request);
    if (++attempts === 1) throw new Error('Lost receipt');
    return receipt;
  } }, 2, { createClaimId: () => `operation-${++generated}` });

  await c.claim();
  c.updateAuthoritativeStock(5);
  assert.equal(await c.claim(), true);
  assert.equal(authority.getStock('vip'), 1);
  assert.equal(c.getSnapshot().remainingStock, 5, 'old receipt must not replace fresh stock');
});

test('definitive 409 ends the operation so a later claim uses a new ID', async () => {
  const ids = [];
  let generated = 0;
  const c = make({ async claim({ claimId }) {
    ids.push(claimId);
    if (ids.length === 1) throw new ClaimError('Rejected', 409);
    return { remainingStock: 1 };
  } }, 2, { createClaimId: () => `operation-${++generated}` });

  assert.equal(await c.claim(), false);
  assert.equal(await c.claim(), true);
  assert.deepEqual(ids, ['operation-1', 'operation-2']);
});

test('canceling an already committed request retains its ID for reconciliation', async () => {
  const authority = createMockClaimService([{ id: 'vip', remainingStock: 2 }]);
  const lost = deferred();
  const ids = [];
  let generated = 0;
  let firstReceipt;
  const c = make({ async claim(request) {
    ids.push(request.claimId);
    const receipt = await authority.claim(request);
    if (ids.length === 1) { firstReceipt = receipt; return lost.promise; }
    return receipt;
  } }, 2, { createClaimId: () => `operation-${++generated}` });

  const first = c.claim();
  await Promise.resolve();
  c.cancelPending();
  assert.equal(await c.claim(), true);
  lost.resolve(firstReceipt);
  assert.equal(await first, false, 'late first attempt must not publish');
  assert.deepEqual(ids, ['operation-1', 'operation-1']);
  assert.equal(authority.getStock('vip'), 1);
  assert.equal(c.getSnapshot().remainingStock, 1);
});
