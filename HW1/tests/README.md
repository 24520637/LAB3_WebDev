# HW1 automated tests — T-14

Run from `HW1` with Node.js compatible with the locked dependencies:

```text
npm ci
npm test
npm run test:unit
npm run test:integration
```

The existing `node:test` runner is retained. The only new direct dependency is
`jsdom` (development only), providing DOM events and React mounting. Vite's
existing JSX transformation loads the actual `App.jsx` and its imports; no
new test runner or application framework is introduced. jsdom 31 requires
Node ^22.22.2, ^24.15.0, or >=26.0.0; the recorded run used Node 26.8.2.

## Test layers and boundaries

- **Unit and module-contract tests (`test:unit`):** six pre-existing test files.
  Pure reducer/data/formatting tests are unit tests. Keyboard-controller tests
  also combine the real controller and reducer against a fake event host;
  audio tests combine the controller/engine against controlled Web Audio and
  fetch boundaries. Those checks are not mounted React or browser tests.
- **React DOM integration tests (`test:integration`):**
  `react.integration.test.mjs` renders the real App, components, hooks,
  reducer, keyboard controller, AudioEngine/controller, and meter sampler.
  It uses StrictMode as the application entry does. Assertions inspect
  rendered names, history, active classes, status text, meter values and
  signals reaching the audio boundary, rather than private React state.
- **Integration helper:** `helpers/reactHarness.mjs` supplies jsdom and
  controlled fetch, Web Audio and RAF boundaries. It does not replace app
  components, React hooks, reducers, input handlers, playback/error routing,
  the RMS calculation, or the meter sampler. Fixed sample amplitude makes
  the expected dBFS value deterministic. Network/decoding/playback failures
  are deliberately injected at external API boundaries.

## Coverage matrix

| Requested behavior | Existing unit/contract coverage | Mounted React integration coverage |
|---|---|---|
| Seven-pad data | Exact IDs, labels, codes, sound IDs, unique fields and URL references | Seven named native buttons, no initial hits/autoplay |
| Seven keyboard mappings | Each key maps to its pad | Each key updates visible history and starts its matching controlled buffer |
| Unknown codes | Ignored and not prevented | No new history or playback |
| Repeat protection | Repeat/held-key guards, fresh press after release | Repeated and duplicate held keydowns create only one rendered hit/play |
| INPUT/TEXTAREA/SELECT | Fake target cases | Focused real DOM elements prevent drum activation without cancelling input key events |
| contenteditable | Nested editable, roles, composed path, designMode | Nested span in a real editable ancestor is isolated |
| IME | Composition events and isComposing guard | Suppresses hits, resets active pad, permits new hit after composition |
| keyup/reset | Release and overlapping-key cases | Rendered active pad clears/restores correctly |
| Window blur | Held-key/composition reset | Both native pointer hold and physical hold clear |
| Cleanup | Listener removal and disposed audio contracts | StrictMode input is not duplicated; unmount/remount disposes resources and fresh input works once |
| Pointer/keyboard parity | Reducer contracts | Pointer, physical key and native-button event sequences reach the same history/audio paths |
| Duplicate prevention | Held/repeat guards | Pointer/key presentation events do not independently add hits before the click |
| History order/bounds | Newest-first, monotonic IDs, immutable state | 27 mixed hits display the newest 20 in the expected order |
| Audio failure resilience | Missing/decode/start/unlock errors, retry and recovery | Each failure shows status while history and release still work; unsupported Web Audio is also covered |
| Meter/fallback | RMS conversion, overlap, silence, missing analyser, RAF disposal | Actual measurement path updates meter text/value; final end resets it; unavailable analyser preserves playback/history |

## Limits — not browser end-to-end tests

- jsdom does not implement native Enter/Space-to-click default actions. The
  integration test dispatches keydown/keyup and explicitly supplies the
  corresponding click. It verifies the app event wiring and absence of an
  extra hit from key presentation handlers. Real browser default activation,
  pointer capture, focus visibility and hit testing require browser checks.
- Synthetic composition events verify routing; they do not verify Windows
  UniKey or another real IME. No actual screen-reader speech is tested.
- Web Audio boundaries are controlled: these runs do not prove remote WAV
  availability, decoding accuracy, overlapping acoustic output, browser
  gesture policy, device volume, or absence of memory leaks in a real browser.
- jsdom has no layout rendering. Responsive layout, zoom, contrast, reduced
  motion, accessibility-tree interoperability and WCAG conformance are not
  established by this suite. No Lighthouse score is inferred.
- The original T-14 tests did not resolve the accessibility issues in
  `AI_FAILURE_AUDIT.md`. A subsequent Failure 03 correction added a native
  shortcut-enable checkbox and two mounted regression tests: all seven keys
  are blocked when disabled, native/pointer actions still work, held state
  releases, and repeated re-enabling does not duplicate hits. The separate
  momentary-button semantics finding is not resolved by these tests.

## Execution results

Executed on 2026-11-09, Windows, Node.js 26.8.2:

| Command | Passed | Failed | Skipped | Result |
|---|---:|---:|---:|---|
| `npm run test:unit` | 59 | 0 | 0 | Passed (unit/module-contract group) |
| `npm run test:integration` | 22 | 0 | 0 | Passed (mounted React DOM, including Failure 03 regressions) |
| `npm test` | 81 | 0 | 0 | Passed (both groups together) |
| `npm run build` | — | — | — | Passed |

During setup, the first integration attempt could not load a dependency
because a OneDrive reparse point under `node_modules/whatwg-url` was invalid.
The original dependency directory was retained under the ignored
`.vite/node_modules-t14-backup`, and a clean `npm ci` succeeded. A subsequent
successful integration run exposed a Vite watcher diagnostic while scanning
that backup; disabling the unnecessary watcher for the test server removed
that diagnostic. Neither setup issue is an application bug. The final
commands in the table completed without those errors.
