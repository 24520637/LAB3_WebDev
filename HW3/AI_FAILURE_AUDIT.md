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

## Phase D import and verification — 2026-11-09

Imported eight new code/test files from `HW3_PhaseD.zip`: leaderboard and
kill-feed components, their two pure selectors, two demo-data modules and two
test files. The Phase C controller, service, hook and regression tests matched
the existing repaired versions and were preserved. Existing project rules,
task plan, package manifest and this audit were retained. `PHASE_D_NOTES.md`
was not added, following the user's no-new-document preference. No dependency
installation or further application fix was performed.

### Checks actually executed

- `npm test`: **42 passed, 0 failed, 0 skipped**. The 13 new tests cover squad
  identities, trimmed/case-insensitive search, all three metric/direction sorts,
  immutable frozen inputs, deterministic ties, empty results, event order,
  combined filters, duplicate IDs and invalid numeric values. The existing
  claim idempotency regressions also passed. These are unit/harness tests,
  not mounted component integration tests.
- A temporary browser page mounted the actual `PubgLeaderboard` and
  `PubgKillFeed` together under React StrictMode. It reused already installed
  workspace React/Vite without adding dependencies or a permanent scaffold.
- Initial UI: four squads with the required `te`, `ces`, `ge`, `agg` names
  (including `ge` = Roy Esports), four events, and visible notices that both
  datasets are illustrative/simulated rather than live results.
- Leaderboard search ` cErBeRus ` returned only Cerberus Esports; unmatched
  search displayed the empty state. Clearing search restored all four rows.
  Kill-point ascending order was AGG, Roy Esports, Cerberus Esports,
  The Expendables. Placement-point and WWCD descending controls restored
  The Expendables, Cerberus Esports, Roy Esports, AGG.
- Feed search ` roy ` returned Roy -> TE and AGG -> Roy events. Adding squad
  `ge` narrowed this to the Roy event. Adding KNOCK produced the empty state.
  With other filters cleared, KNOCK returned only CES -> AGG. Resetting all
  filters restored four events in visible newest-first order.
- The six native search/select controls had associated labels with distinct
  generated IDs. No duplicate IDs were found in this single-pair mount.
  Browser warning/error logs were empty. This is not a complete accessibility
  audit or a screen-reader speech test.

No new application defect was confirmed in these tested paths. The four-event
feed uses an ordinary semantic list; no virtual scroller or large-feed
performance claim is made. Temporary browser diagnostics and generated caches
were removed after testing.

There is still no application entry or build script, so no production build
was run or claimed. Full arena composition, real match data/backend services,
large/dynamic feed behavior, multiple simultaneous component instances,
mobile/contrast auditing and actual screen-reader interaction remain
unverified. See Git history for the Phase D implementation, tests and audit
commit.

## Failure 02 — JSX runtime configuration leaves the integrated app blank

**Reviewed:** 2026-11-10 after importing `HW3_PhaseE.zip`.

**Severity:** Critical for this integrated UI: the entry point cannot mount.

**Related implementation prompt:** Integrate the completed countdown, claim, leaderboard,
and kill-feed features into the PUBG VN Arena.
Follow the existing project architecture.
Ensure responsive layout, accessibility, and consistent state.
Do not introduce unrelated features.
Run focused integration checks.

**Affected files:** `src/main.jsx` and the JSX build/runtime configuration.
Other JSX modules also rely on an automatic JSX runtime without importing a
React namespace; fixing only the first reference is insufficient.

### Original code and cause

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// ...
createRoot(element).render(<StrictMode><App /></StrictMode>);
```

The imported app uses JSX without a `React` binding and supplies Vite scripts
but no automatic JSX runtime configuration or React build plugin. In the
actual dev and production outputs, the classic JSX transform refers to
`React`, which is not defined. This is a code/toolchain integration defect,
not a dependency installation failure. Both test and build commands complete
successfully without executing the mounted application.

### Reproduction and actual browser evidence

1. Install the dependencies declared in the imported manifest: `npm install`.
2. Run `npm run dev -- --host 127.0.0.1 --port 5186 --strictPort`.
3. Open the real application at `http://127.0.0.1:5186/`.
4. Build with `npm run build`, then run
   `npm run preview -- --host 127.0.0.1 --port 5187 --strictPort` and open it.

Observed in the in-app browser, without a diagnostic harness or substituted
components:

```text
Development:
  ReferenceError: React is not defined
  at /src/main.jsx:6:44
  main elements: 0; #root text: empty

Production preview:
  ReferenceError: React is not defined
  at /assets/index-eZ1sRY2X.js:9:65246
  main elements: 0; #root text: empty
```

The document title loads, but neither the arena, claim cards nor standings/
feed controls render. The failure blocks integrated UI interaction and
responsive/focus inspection; a successful bundle is not runtime proof.

### Smallest appropriate correction

Configure the existing Vite toolchain to use React's automatic JSX runtime
consistently for development and production, for example through an explicit
Vite esbuild JSX configuration. A separate React plugin is not technically
required for this minimal fix. Do not import the Lab 2 custom renderer or
patch only main.jsx while leaving other JSX modules with the same mismatch.
Then rerun tests/build and smoke-test both real entry points before checking
claims, expiry, filtering, keyboard behavior and actual viewport layout.

### Repair and actual browser retest — 2026-11-10

**Status:** Repaired and retested. See Git history for the Phase E integration
and JSX runtime fix.

Added `vite.config.js` using the existing Vite installation:

```js
export default defineConfig({
  esbuild: { jsx: 'automatic', jsxImportSource: 'react' },
});
```

This applies the React automatic runtime to JSX consistently in dev and build;
no additional dependency was introduced for the fix. The dev server was
restarted to load the newly added configuration. No JSX component was patched
with a global React variable or custom renderer.

Checks actually executed after the fix:

- `npm test`: **47 passed, 0 failed, 0 skipped**.
- `npm run build`: **passed**, Vite 7.3.8, 42 modules transformed.
- Real dev entry and rebuilt production preview both rendered the arena,
  two claim cards, four squad rows and four feed events. The fresh production
  browser run's warning/error log was empty.
- Production VIP claim changed stock 12 -> 11; Space activation on G-Coin
  changed its stock 20 -> 19 independently. Eleven further VIP activations
  reached stock 0, displayed LOOTED_OUT and disabled that claim button.
- Integrated squad search ` cErBeRus ` returned Cerberus Esports; selecting
  feed squad ge returned the Roy event. Clearing filters restored the lists.
- Native Tab exposed the skip link at x/y 16/16. Enter followed by Tab reached
  the first claim button with a visible yellow outline. At mobile width, the
  focused select had a visible outline and bounds y=463..505 within the
  812px-high viewport. This is a sampled keyboard/focus check, not a complete
  accessibility audit.
- Actual browser viewport measurements:

| Viewport width | Document clientWidth | Document scrollWidth | Layout |
| --- | --- | --- | --- |
| 375px | 360 | 360 | One card column |
| 768px | 753 | 753 | Two card columns |
| 1280px | 1265 | 1265 | Two card columns |

The document measurements account for the browser's scrollbar. No page-level
horizontal overflow was observed. The mobile standings container had its own
intentional horizontal scroll (clientWidth 327, scrollWidth 343). Temporary
viewport overrides were reset after testing.

A temporary page loaded the real `/src/main.jsx`, advanced its local Date.now
by sixteen minutes and dispatched a visible wake. The actual App displayed
00:00, Drop expired and EXPIRED on both cards, with both new-claim buttons
disabled and stock unchanged at 12/20. This was clock/event simulation, not a
physical background-tab wait. The diagnostic was removed afterward.

Production 409/network-loss UI, real backend consistency, screen-reader speech,
full contrast/zoom/reduced-motion auditing and all focus targets remain beyond
this retest. Earlier controller/component checks remain separately scoped.

## Phase E import verification before the JSX repair — 2026-11-10

- Imported nine new/changed code/test/manifest files: App, React entry point,
  CSS, claim card/controller, arena demo fixtures, index.html, arena tests and
  package.json. Preserved existing rules, task plan and audit; did not copy
  `PHASE_D_NOTES.md`, `INTEGRATION_NOTES.md` or replace this audit with the ZIP's
  version. No additional documentation file was created.
- Installed only manifest-declared React/React DOM/Vite dependencies:
  `npm install` added 17 packages and reported 0 vulnerabilities. Generated
  package-lock.json and a .gitignore for node_modules/dist/.vite. These install
  results are not a general security or compatibility certification.
- `npm test`: **47 passed, 0 failed, 0 skipped**. Five new arena integration
  tests compose pure/controller modules; they do not mount App or exercise JSX
  runtime behavior. Earlier tests include the Phase C retry regressions.
- `npm run build`: **passed**, Vite 7.3.8, 37 modules transformed.
- Browser dev and production preview: **failed to mount**, as in Failure 02.
- The updated claim controller retains the prior logical retry ID and now
  exposes unresolved state so a previous operation may be retried despite zero
  stock/expired phase. This path passed the supplied module-level test; it
  has not been verified through the integrated browser app.
- Actual 375px/768px/desktop layout, visible focus, complete claim/sold-out/
  expiry flows, filtering in the integrated UI, screen-reader behavior and
  countdown wake through this entry point remain unverified because mounting
  fails. CSS inspection alone is not responsive verification.
- Two distinct application defects have now been evidenced in this audit:
  Failure 01 repaired within its documented controller scope; Failure 02 was
  open at this initial check and was subsequently repaired as recorded above.
  No third defect is invented to meet the assignment's quota.
