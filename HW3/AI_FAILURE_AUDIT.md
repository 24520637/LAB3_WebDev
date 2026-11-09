# HW3 — AI Failure Audit

Reviewed 2026-11-09 after importing `HW3_PhaseC.zip`. Only one distinct
application defect has been confirmed in this check; no additional defects
are invented to meet a numerical quota.

## Failure 01 — Retrying a lost successful response consumes stock twice

**Severity:** High for claim/inventory correctness.

**Related implementation prompt:** Phase C - Optimistic Claim & 409 Rollback, Implement the ticket and G-Coin claim flow.  Support optimistic stock updates, duplicate-click protection, server conflict handling, and rollback on HTTP 409.  Build the claim interface using the existing project conventions. Add focused tests for success, conflict, and failure cases.

**Affected files:** `src/claims/createClaimController.js` (`claim`) and the
retry path exposed through `src/hooks/usePubgClaim.js` / `PubgClaimCard`.

### Original code and cause

```js
const claimId = createClaimId();
const response = await claimService.claim({ dropId, claimId, signal: token.controller.signal });
// ...
active = null;
publish(conflict ? 'conflict' : 'error', conflict
  ? 'Claim unavailable. Stock has been updated.'
  : 'Claim failed. Please retry.');
```

Each invocation generates a new claim ID. A network rejection is treated as
if the authority had not committed the claim: the optimistic deduction is
rolled back and the user is invited to retry. If the authority committed but
the response was lost, a retry with a new ID is a second distinct claim.
The mock authority's idempotency works for the same ID, but the controller
does not preserve that ID across this ambiguous outcome.

### Reproduction and actual evidence

The first reproduction used the imported, unchanged controller and
`createMockClaimService`, initialized with stock 2. A thin transport wrapper
awaited the real mock service's first successful claim, then threw
`Error('Response lost after authority committed')` instead of delivering its
receipt. Subsequent requests returned their actual receipts. This models a
lost successful response; it is not a real HTTP/network capture.

1. Claim once: the authority decrements 2 -> 1, but its response is lost.
2. Controller returns false, displays stock 2 and `Claim failed. Please retry.`.
3. Retry the same failed user operation.
4. A new claim ID is sent, the authority decrements 1 -> 0, and the controller
   reports success with stock 0.

Actual Node reproduction:

```text
first request: result false; UI stock 2; authority stock 1;
               claim ID logical-attempt-1
retry:         result true; UI stock 0; authority stock 0;
               claim ID logical-attempt-2
```

The sequence was also reproduced by mounting the real `PubgClaimCard` and
`usePubgClaim` under React StrictMode in a temporary browser diagnostic.
Native button clicks triggered the existing handlers. The service used the
real imported mock authority with the response-loss wrapper described above;
component state and controller logic were not replaced.

```text
After first click:
  authorityStock: 1
  request count: 1
  card: Remaining: 2; Claim failed. Please retry.
  button: enabled

After retry:
  authorityStock: 0
  request count: 2, with two different UUID claim IDs
  card: Remaining: 0; Claim confirmed
  button: disabled
```

Thus two authority-side claims were committed for one logical operation and
its retry. No production backend, payment or real stock was involved.

### Smallest appropriate correction

Retain a logical claim's idempotency key across ambiguous transport failures
and retry/reconcile that operation against the authority. Clear it only when
the outcome is definitive or a deliberately new operation begins. Do not
assume aborting a request or losing its response undoes an authority commit.
Define the idempotency receipt/stock-refresh contract so that retrying an old
receipt does not overwrite newer authoritative stock.

Add a regression that commits the first request, loses its response, retries
with the same logical ID, and verifies only one stock deduction. Preserve the
existing rapid-duplicate lock, 409 reconciliation and ordinary retry behavior.

### Repair and regression retest — 2026-11-09

**Status:** Repaired and regression-tested. See Git history for the commit
containing the Phase C implementation, this repair and its tests.

`createClaimController` now retains an unresolved logical claim ID and its
original stock revision across transport errors and canceled attempts. A retry
uses that same ID, allowing the authority to return the existing receipt.
Success clears the logical operation; a definitive 409 also ends it, so a
later new operation can get a new ID. A retried receipt cannot overwrite a
stock notification received since the logical operation began, including one
received between attempts. The synchronous in-flight lock remains in place.

Four focused controller regressions were added: lost committed response plus
new post-success claim; fresh stock received between attempts; new ID after
definitive 409; and canceled committed request followed by retry with the same
controller. Before the source repair, `npm run test:claim` reported **15 passed,
3 failed, 0 skipped** out of 18: the first, second and fourth new cases failed.
After the repair, `npm test` reported **29 passed, 0 failed, 0 skipped** across
the complete suite.

The browser reproduction was repeated with the actual card/hook under React
StrictMode and the same real mock authority/response-loss wrapper:

```text
first click:  request ID A; authority stock 1; UI stock 2; error/retry message
retry:       request ID A; authority stock 1; UI stock 1; Claim confirmed
new claim:   request ID B; authority stock 0; UI stock 0; Claim confirmed
```

The first two observed UUIDs were identical; the third was different. The
retry did not consume a second unit. A deliberately new claim after confirmed
success did consume the next unit. Browser warning/error logs were empty.
Temporary diagnostics/caches were removed. No build script or production
backend was added, and no production build is claimed.

The retained ID lives within a controller instance. Persistence across a real
controller replacement, page reload or another device is not implemented or
claimed. End-to-end safety also requires the authority to honor idempotency
keys and define receipt/stock-version reconciliation; only the supplied local
mock authority and injected response loss were exercised here. The existing
phase/zero-stock gates remain unchanged. The initial audit evidence below is
historical and describes the pre-repair import check.

## Verification performed

- Imported six new/changed code/test/manifest files from `HW3_PhaseC.zip`.
  Existing timer code, project rules and task plan matched and were preserved.
- `npm test`: **25 passed, 0 failed, 0 skipped**: 6 clock units, 5 timer
  lifecycle-harness tests and 14 claim/controller/service units. The supplied
  network-failure test rejects before an authority commit and does not cover
  the lost-success-response defect above.
- Real React StrictMode browser component checks passed for: one request after
  rapid double activation; immediate optimistic stock 2 -> 1; pending disabled
  and aria-busy states; successful confirmation; Space-key activation; 409
  rollback to 2; 409 authoritative stock 0 with disabled claim; network error
  rollback and an ordinary successful retry; EXPIRED phase disabling claims;
  and aborting a pending request on card unmount. A late response did not
  recreate the unmounted card.
- Price rendered as `499.000 ₫`. The component rendered role=alert for conflict/
  error and a status live region for success; actual screen-reader speech was
  not tested.
- The browser response-loss reproduction failed as recorded in Failure 01,
  even though all 25 supplied tests passed. Browser warning/error logs were
  empty; absence of console errors does not negate this behavior defect.
- No app entry, dev/build scripts or standalone React dependency setup are
  supplied. No production build was run or claimed. Temporary browser testing
  reused the already installed React/Vite from HW2; no dependencies were
  installed and no permanent application scaffold was added.
- Temporary diagnostic pages and generated caches were removed after testing.
  Full arena UI, a real HTTP service, distributed stock consistency, mobile/
  contrast auditing, real screen-reader behavior and physical tab-switch tests
  remain unverified.
