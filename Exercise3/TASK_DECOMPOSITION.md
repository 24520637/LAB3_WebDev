# TASK DECOMPOSITION — LAB 3 Exercise 3: KRAFTON PUBG Vietnam Series Live Telemetry

> **T-10 update — 2026-10-25:** Added four parsed-CSS regression tests for
> 220px border-box reservation, responsive declarations, reduced motion,
> selection/focus and control heights; added a full-state selected-name test
> and strengthened six-metric term/value association assertions. Existing
> deterministic skeleton, alert, keyboard Retry, repeated failure and
> abort-no-alert tests remain in the suite. A selected accessible-name
> concatenation bug was reproduced and fixed in SquadSelector; see
> `AI_FAILURE_AUDIT.md` for related prompts and actual failure/retest evidence.
> Initial run: 91 passed / 5 failed (four CSS test-loader failures and one
> accessible-name failure). Intermediate run: 91 passed / one test failed /
> one suite failed (file-URL loading). Corrected file reading and text spacing;
> final `npm test`: 96 passed across 7 files. CSS checks inspect declarations,
> not browser geometry or active media emulation. No new browser/CLS/screen-reader
> verification in T-10; T-11/T-12 remain pending. Only P2 source/test files are
> selected for staging; audit and planning documents remain unstaged. No commit.

> **Setup update — 2026-10-25:** Following T-00, the user authorized React setup.
> A JavaScript/JSX starter now exists: React 19.3.1, Vite 8.3.5,
> Vitest 5.0.5, jsdom, React Testing Library, and ESLint 10.
> Actual entry: `index.html` → `src/main.jsx` → `src/App.jsx`;
> stylesheet: `src/index.css`; configuration: `vite.config.js`,
> `eslint.config.js`; test setup: `src/test/setup.js`.
> Scripts: `npm run dev`, `npm run build`, `npm run preview`,
> `npm run lint`, `npm test`, and `npm run test:watch`.
> Verified: production build, lint, one real-entry mounting test, and HTTP
> responses from the development server at `http://127.0.0.1:5173/`.
> The first test attempt failed because its ESM spy was unsupported; the test
> setup was corrected and the test passed on rerun. No application defect was
> established. Browser layout/accessibility checks have not been run.
> At setup completion, T-01 through T-12 were pending; no telemetry feature or commit was created.
> Archive observations and proposed feature paths below are the original plan;
> the starter paths listed here are now present. See `README.md` for setup commands.

> **T-01/T-02 update — 2026-10-25:** Implemented in order under user authorization.
> T-01: `src/data/pubg-vn-telemetry-spec.js` exports the exact three sample
> records and an exact-ID lookup returning `null` for unknown IDs. Its 10 tests
> passed before T-02 implementation began. WWCD values are percentages, not
> live predictions.
> T-02: `src/state/telemetry-state.js` defines the initial
> `{ status: 'IDLE', data: null, error: null }` and pure LOAD/RESOLVE/REJECT
> transitions. LOAD clears data/error from every status, including LOADING;
> settlement is accepted only while LOADING. Request identity guards remain
> T-04 work. `src/components/PubgMatchTelemetry.jsx` uses this reducer and
> receives `selectedSquadId` separately (default `te`). It is mounted by
> `src/App.jsx` with only neutral IDLE text. Dispatch wiring and a separate
> retryTick will be added with the later request/retry tasks.
> Verified: `npm test` (23 tests across 4 files), `npm run lint`, and
> `npm run build` all passed. Tests cover exact records, unknown IDs,
> state shape, transitions, clearing stale output, immutable updates, invalid
> payloads, Strict Mode, and IDLE rendering through the real entry point.
> No fetching, timers, selector, final dashboard, skeleton, retry UI,
> dependency installation, or commit was added. Browser layout/accessibility
> checks were not run; at this stage T-03 onward remained pending.

> **T-03 update — 2026-10-25:** Implemented only the simulated service in
> `src/services/fetchKraftonPubgTelemetry.js` and its colocated test file.
> Signature: `fetchKraftonPubgTelemetry(squadId, { signal, delayMs = 1200,
> random = Math.random } = {})`. Native timers can be mocked with Vitest;
> delay and randomness are configurable. Valid attempts sample once after
> the delay and fail when the sample is below 0.35. Success returns the exact
> existing dataset record; unknown IDs reject without allocating resources.
> Already-aborted signals and cancellation during the wait reject AbortError,
> even with custom abort reasons. Settlement clears the timer and removes
> the abort listener; a settlement guard prevents repeated completion.
> Verified: `npm test` passed 50 tests across 5 files (27 service tests),
> `npm run lint` passed after replacing a single-assignment let with const,
> and `npm run build` passed. Tests cover delay, exact data, threshold bounds,
> invalid IDs/options, abort before/during/after completion, cleanup, and
> throwing/invalid random sources. No application behavior defect was found.
> No UI, state module, dependencies, or commits were changed. UI integration
> and browser verification were not run; at this stage T-04 onward remained pending.
> This is a local timer simulation and produces no HTTP Network request.

> **T-04 update — 2026-10-25:** `PubgMatchTelemetry` now synchronizes the
> existing service in an effect depending on `[selectedSquadId, retryTick]`.
> Both are controlled props (defaults `te` and `0`), separate from the one
> `{ status, data, error }` reducer object. Each attempt creates a new
> AbortController and unique request identity, then enters LOADING. Cleanup
> invalidates identity before aborting. Both completion paths check current
> identity and the signal; AbortError is ignored. Non-abort failures show a
> fixed safe message. Minimal plain text reflects current status and, on
> success, the squad name; selectors, retry controls, metrics, and styling
> remain later UI tasks. A parent will increment retryTick for the retry UI.
> Updated the component tests and real-entry mounting assertion.
> Verified: `npm test` passed 65 tests across 5 files (17 component tests),
> `npm run lint`, `npm run build`, and scope review. Tests cover rapid
> CES → TE → GE changes using controlled prop rerenders, stale success/failure
> before and after the latest result, same-squad retry while pending,
> identity protection when abort is deliberately disabled, safe failure/retry,
> unmount, and Strict Mode setup/cleanup. A real-service fake-timer test
> verifies only one pending timer after switching and zero after unmount.
> No browser click test was run: selector buttons are T-05 work. No final
> styling, dependencies, or commit was added. At this stage T-05 onward remained pending.

> **T-05 update — 2026-10-25:** Added the functional dashboard shell in
> `src/App.jsx`, with page heading, sample-data notice, and separate squad
> selection state (initial TE). `src/components/SquadSelector.jsx` renders
> three native buttons with stable IDs, aria-pressed, visible Selected text,
> and a selected style. `src/components/TelemetryCard.jsx` renders squad name
> and six labeled metrics using article, heading, and definition-list markup.
> `PubgMatchTelemetry` shows this card only during SUCCESS; existing plain
> IDLE/LOADING/ERROR text remains. Basic mobile-first layout, flexible button
> widths, 44px minimum targets, and focus styles use `src/index.css`.
> Updated the page title and real-entry test; added `src/App.test.jsx`.
> Verified: `npm test` passed 72 tests across 6 files, `npm run lint` and
> `npm run build` passed. New tests check all three squads' exact six metrics,
> keyboard and click selection, clearing old cards, selecting after errors,
> pressed states, controls during loading, and markup-like content as text.
> Browser verification at 375×812: Tab/Shift+Tab, Enter, and Space select CES,
> TE, and GE with visible focus and updated pressed state. SUCCESS (CES and
> initial TE), LOADING, and ERROR were observed. All CES metrics were checked
> visually and in the DOM; the card can be reached with normal vertical
> scrolling. At the final SUCCESS check, innerWidth, clientWidth, and
> scrollWidth were each 375px; LOADING and ERROR also measured 375/375 for
> clientWidth/scrollWidth. No horizontal overflow was observed. Initial
> button height measurements were 52px unselected and 73px selected.
> Screenshots were saved outside the repository in the task visualization
> directory as `t05-mobile-375.png` and `t05-mobile-metrics-375.png`.
> No final Blue-Zone theme, skeleton, retry control, dependency, or commit was
> added. Touch-device testing, screen-reader announcements, larger viewports,
> contrast auditing, and CLS measurement were not run. At this stage T-06 onward remained pending.

> **T-06 update — 2026-10-25:** Reviewed existing dataset, reducer, service,
> component, and dashboard tests. Added eight deterministic cases across
> `src/components/PubgMatchTelemetry.test.jsx`, `src/App.test.jsx`, and
> `src/services/fetchKraftonPubgTelemetry.test.js`: all three squads through
> the real service/component, real packet-loss/retry recovery, real invalid-ID
> handling, rapid dashboard clicks with stale success/failure, and abort after
> packet loss. The real-entry test now uses fake timers and controlled
> randomness to verify LOADING → SUCCESS and timer cleanup in Strict Mode.
> No production application code or dependency was changed during T-06.
> `npm test` passed 80 tests across 6 files, `npm run lint` passed, and
> `npm run build` passed. No check failed and no application-code bug was
> established; no audit defect was invented from the attachment's examples.
> The user authorized Commit 1 only if all relevant checks pass, with the
> exact planned subject and no body. Its scope is Phase P1 source/tests and
> the previously untracked build/test prerequisites. Planning documents,
> archives, and unrelated Exercise2 changes are excluded from staging.
> Browser/DevTools, screen-reader, and CLS checks were not rerun for this
> test-only task; their remaining requirements belong to later tasks.
> Commit outcome: `c7e67b2`, exactly one commit after `295b553`, with subject
> `feat(ex3): implement PUBG VN 4-state telemetry & AbortController` and no body.
> Verified from the raw commit object and commit count; the index is empty.
> The first command-line message attempt failed due to argument quoting and
> created no commit; the successful command used a temporary message file.
> This tooling issue is excluded from the application-bug audit by project rules.
> This planning document remains untracked and outside the P1 commit.
> At this stage T-07 onward remained pending.

> **T-07 update — 2026-10-25:** Added `src/components/TelemetrySkeleton.jsx`
> and `src/styles/telemetry.css`; integrated LOADING in `PubgMatchTelemetry`
> and added four component tests. The border-box skeleton reserves exactly
> 220px, uses a Blue-Zone navy/cyan palette, and pulses only aria-hidden
> decorative placeholders (1.5s opacity animation). Visible loading text is
> present, and the existing single polite live status stays outside the
> aria-busy telemetry panel. Busy is true only while LOADING and false on
> SUCCESS/ERROR; the skeleton is removed on settlement. The panel and success
> card also reserve at least 220px; taller real content can grow normally.
> Read `Exercises/css/skeleton.css` and `Exercises/js/data-view.js` directly
> from the user-provided LAB2_EXERCISES.zip. Reused opacity pulse, hidden
> decoration, flexible widths, and reduced-motion ideas, without copying the
> duplicate CSS blocks or legacy DOM rendering code. A single reduced-motion
> media rule disables the animation.
> Verified: `npm test` passed 84 tests across 6 files; `npm run lint` and
> `npm run build` passed. Browser at 375×812 measured skeleton height 220px,
> width approximately 343.33px, and document clientWidth/scrollWidth both
> 375px while loading. Observed pulse opacity 0.899049 with infinite 1.5s
> animation, readable loading caption, decorative aria-hidden content, and
> status outside the busy region. Switching squads preserved loading UI;
> settlement removed it and cleared busy. Success measured 360/360px with
> the native scrollbar consuming 15px of the 375px viewport; no horizontal
> overflow was observed. Screenshot: task visualization directory,
> `t07-skeleton-375.png`. Viewport override was reset afterward.
> The loaded browser CSSOM contains the reduced-motion animation:none rule;
> reduced-motion emulation was not available through the current browser API
> and was not run. No screen-reader announcement audit or CLS measurement
> was performed. No Retry, dependency installation, staging, commit, or push.
> At this stage T-08 onward remained pending.

> **T-08 update — 2026-10-25:** Added `TelemetryError.jsx`: a section with
> role=alert, a useId-linked heading, safe text, and a native Reconnect Satellite
> button. `App` now owns retryTick and increments it with a functional update
> through onRetry; `PubgMatchTelemetry` passes that callback to the error panel.
> Each increment reruns the existing effect for the currently selected squad
> with a new controller/identity. The alert exists only during ERROR; starting
> Retry removes it and shows the existing LOADING skeleton. The separate status
> live region is off during ERROR to avoid duplicating the alert announcement.
> Known packet loss maps to a fixed safe packet-timeout explanation; other
> exceptions retain a generic message and expose no private exception details.
> AbortError handling and stale-request guards remain intact. Scoped styles
> add a wrapping, minimum-44px Retry button, visible focus, and a minimum-220px
> error panel. No unrelated production file or dependency was changed.
> Verified: `npm test` passed 91 tests across 6 files, `npm run lint` passed,
> and `npm run build` passed. Seven new tests cover alert semantics, Enter/Space
> Retry, repeated loss, current-squad requests, no AbortError alert, safe
> unexpected failures/no window.alert, and two real-service losses followed
> by success through the button. One new test initially timed out due to
> userEvent/fake-timer coordination; its real-service test now uses a direct
> click event, while separate userEvent keyboard cases verify Enter/Space.
> The corrected full suite passed; no application bug was established.
> Browser at 375×812: one alert section, busy=false, visible focused Retry
> (approximately 174×52px), alert width approximately 343.33px, and measured
> clientWidth/scrollWidth 375/375px. Four Tab presses reached Retry; Enter
> produced LOADING with busy=true and no alert, then SUCCESS for the same TE
> squad with busy=false. Screenshot: `t08-error-375.png` in the task's external
> visualization directory. Viewport override reset. Actual screen-reader
> announcements were not tested; no universal accessibility claim is made.
> No staging, commit, or push. At this stage T-09 onward remained pending.

> **T-09 update — 2026-10-25:** Applied a coherent Blue-Zone dashboard theme
> using shared navy/slate, cyan, neutral text, danger, and amber focus tokens.
> `src/index.css` styles the page/header, simulation notice, and squad controls;
> `src/styles/telemetry.css` styles state indicators, metrics, the 220px
> skeleton, alert, and Retry. Defaults target phones; min-width 768px changes
> selectors and metric layout to three columns, while min-width 1024px adds
> laptop header columns, spacing, and larger statistics. `App.jsx` adds only
> presentation classes and a PUBG/Vietnam Series caption. `TelemetryCard.jsx`
> groups each dt/dd pair for the metric grid; `PubgMatchTelemetry.jsx` adds
> presentation classes/data-status. Request/state behavior is unchanged.
> No overflow-x:hidden or other overflow masking was introduced.
> Verified: `npm test` passed 91 tests across 6 files; `npm run lint`,
> `npm run build`, and whitespace/scope review passed. Browser checked the
> header/selector, all six SUCCESS metrics, LOADING, and ERROR/Retry at each
> requested width. At 375px the selectors stack and metrics use two columns;
> 768px/1280px use three columns. All loading skeletons measured exactly
> 220px tall. No overflowing descendants were detected in these checks.
>
> | Viewport width | LOADING client/scroll width | SUCCESS client/scroll width | ERROR client/scroll width |
> | --- | --- | --- | --- |
> | 375px | 360/360px | 360/360px | 360/360px |
> | 768px | 768/768px | 753/753px | 768/768px |
> | 1280px | 1280/1280px | 1265/1265px | 1280/1280px |
>
> Native vertical scrollbars account for the 15px differences; no horizontal
> overflow was observed. Squad targets measured 88px high at 375px and 112px
> at 768/1280px. Retry measured 52px high at each width. Tab reached Retry,
> its amber focus ring remained visible at every width, and Space triggered
> a new request followed by success. Computed text/background colors were
> checked with the WCAG relative-luminance formula: sampled header, labels,
> controls, metrics, skeleton caption, and error text pairs were all at least
> 8.37:1. Focus token contrast against page/panel/selected/error surfaces
> calculated at least 7.93:1. These sampled checks are not a full WCAG audit.
> Loaded reduced-motion rules disable the pulse and selector transitions;
> active reduced-motion emulation and screen-reader testing were not run.
> CLS was not measured and no zero-CLS claim is made. Screenshots for 375,
> 768, and 1280px plus `t09-responsive-measurements.json` were saved in the
> external task visualization directory. Viewport override reset after checks.
> No dependencies, staging, commit, or push. T-10 onward remain pending.

## 0. Purpose, scope, and evidence

**Goal:** Build a mobile-first React application that shows simulated telemetry for three PUBG Vietnam squads. It must handle loading, network-like failures, fast squad switching, and retry without showing old data or false errors. Start with small phone screens, then progressively adapt to tablet and laptop sizes.

**This is a plan, not an implementation report.** No application code, tests, Git commits, CLS measurement, or browser audits are claimed to be complete.

### What was actually inspected

- **LAB 3 Exercise 3 archive:** contains `Exercise3/PROJECT_RULES.md` only. No React source, `package.json`, test configuration, or existing `TASK_DECOMPOSITION.md` was present in that archive. The project rules are named `PROJECT_RULES.md` (plural), not `PROJECT_RULE.md`.
- **LAB 2 archive:** `Exercises/PROJECT_RULE.md`, `FSM_CONTRACT.md`, `DATA_LOADER_CONTRACT.md`, `js/lifecycle-state.js`, `js/load-data.js`, `js/data-view.js`, `css/skeleton.css`, and tests including `lifecycle-state.test.js`, `load-data.test.js`, and `data-view.test.js`.
- **LAB 2 ideas to reuse:** four explicit lifecycle states; keeping data/error separate; request identity guards; aborting work on cleanup; loading/success/error display patterns; pulsing skeleton, reduced-motion styles; success, error, retry, stale-result, and lifecycle test cases.
- **Do not copy:** LAB 2 `mini-react.js`, manual DOM renderer, or `createDataLoader()` unchanged. The LAB 2 loader deduplicates calls during `LOADING`, whereas LAB 3 must supersede the old request when the selected squad changes. Its generic cancellation/error behavior also needs an explicit `AbortError` path.

### File convention

- **Existing, confirmed for LAB 3:** `PROJECT_RULES.md` (within the `Exercise3/` folder in the uploaded archive).
- **This planned document:** `TASK_DECOMPOSITION.md` at the Exercise 3 repository root.
- All source paths in the tasks below are **PROPOSED, NOT YET PRESENT**. Before implementing, inspect the actual repository and use its existing entry point, tooling, style convention, and test locations. Do not create duplicate entry points or install dependencies without approval.
- If the project has not yet been scaffolded, first agree on a React build setup; no working Vite/npm scripts are assumed here.

### Constraints from PROJECT_RULES.md

Use real React function components and hooks, not mini-React or class components. Follow the installed React version and existing build setup; use `createRoot` for a new React 18/19 entry point if needed. Avoid `var`, implicit globals, inline HTML handlers, `innerHTML`, `dangerouslySetInnerHTML` with untrusted input, `eval`, `window.alert`, state mutation, effect-based derived state, missing effect cleanup, and unsupported claims of test/audit success. Use semantic HTML, safe text rendering, keyboard-accessible controls, mobile-first responsive CSS, and reduced-motion support. Do not add dependencies without approval. Record only confirmed application-code defects in `AI_FAILURE_AUDIT.md` if that separate project-rule requirement applies; never invent defects or create that audit as part of this planning-only task.

## 1. Contracts to agree on before coding

### Data contract

Use the assignment's supplied simulated data (not a claimed real-time KRAFTON API):

| ID | Squad | Map | Phase | Alive | Kills | WWCD probability | Status |
| --- | --- | --- | --- | ---: | ---: | --- | --- |
| `ces` | Cerberus Esports | Erangel | Phase 6 | 4 | 14 | 68% | In Safe Zone |
| `te` | The Expendables | Miramar | Phase 7 | 4 | 18 | 82% | Holding High Ground |
| `ge` | Genius Esports | Taego | Phase 5 | 3 | 9 | 41% | Rotating Blue Zone |

Use stable squad IDs for selection and keys. Do not describe WWCD percentages as live predictions; they are sample values. Initial selected squad: `te`, following the reference component's `squadId = 'te'` default.

### UI state contract

One state object: `{ status, data, error }`, where `status` is exactly `IDLE | LOADING | SUCCESS | ERROR`. A separate `selectedSquadId` and `retryTick` are allowed; request identity and the `AbortController` are coordination details, **not extra UI states**.

| Event or condition | Expected behavior |
| --- | --- |
| Initial render | `IDLE` before the effect begins; initial request moves to `LOADING` |
| Start a request or change squad | `LOADING`, clear old data and error |
| Current request resolves | `SUCCESS`, show matching squad data |
| Current request rejects (not abort) | `ERROR`, show safe message |
| Retry after failure | Increment `retryTick`; run a new request for the currently selected squad |
| Earlier request aborts or finishes late | No stale data, no false error; latest selection wins |
| Unmount | Cancel pending request and prevent later state changes |

LAB 2's pure FSM uses `LOAD`, `RESOLVE`, `REJECT`, `RETRY` and rejects duplicate `LOAD` while loading. For LAB 3, a **new squad selection during LOADING is a superseding request**, not an invalid user action or a deduplicated request. Define this clearly in the React component and tests; do not force the old transition function onto this new interaction.

### Simulated service contract

Proposed signature: `fetchKraftonPubgTelemetry(squadId, { signal }) -> Promise<squad>`.

- Delay completion asynchronously so the loading state can be observed.
- For a valid, non-aborted attempt, use failure probability `0.35` (example: `random() < 0.35`); failure is random per request, not guaranteed to be exactly 35% of a small sample.
- Resolve with the matching static squad object on success; reject with a safe packet-timeout error on simulated loss; reject invalid squad IDs clearly.
- Honor an already-aborted signal and later `abort` events with an `AbortError`. Clear the timeout and remove abort listeners on resolve, reject, or abort.
- Make random choice and timing injectable or mockable in tests so success/failure and race tests are deterministic; do not rely on repeated real randomness.
- A timer-based Promise **does not appear as an HTTP request in Chrome DevTools Network**. For the requested `(canceled)` Network evidence, a real fetch to a controlled mock HTTP endpoint would be required and needs separate approval/availability. Otherwise prove cancellation with deterministic tests, logs/instrumentation, and component behavior; do not present timer cancellation as Network evidence.

## 1A. Proposed complete dashboard UI design (planning only)

**Purpose:** Design one coherent PUBG Vietnam Series radar dashboard, not just a stand-alone loading card. All components and paths below are **PROPOSED**; none were confirmed in the Exercise 3 source tree. The statistics remain the assignment's simulated values, not a real KRAFTON feed.

### Page layout and content

1. **Dashboard header:** “PUBG Vietnam Series — Live Telemetry”, a short “simulated match data” notice, and an unobtrusive connection/state label. Do not label the simulation as a verified live feed.
2. **Squad selector:** three labeled buttons for **CES — Cerberus Esports**, **TE — The Expendables**, and **GE — Genius Esports**. The selected button has a visible active style **and** an accessible selected state, e.g., `aria-pressed`.
3. **Current-squad panel:** squad name and map/phase summary; labeled metrics for **map**, **phase**, **alive players**, **kills**, **WWCD probability**, and **squad status**. Do not present 68%/82%/41% as calculated live probabilities. Use semantic headings and a properly styled definition list (`<dl>`, `<dt>`, `<dd>`) or equivalent labeled groups.
4. **Content states:** the same dashboard shell and squad selector stay available in `IDLE`, `LOADING`, `SUCCESS`, and `ERROR`. In `LOADING`, replace the telemetry panel with the **220px pulsing Blue-Zone skeleton** and readable progress text; in `ERROR`, show a **`<section role="alert">`** with safe message and **Reconnect Satellite** button. Error text must not expose stack traces or use `window.alert()`.
5. **Stable composition:** reserve predictable space for status panels; avoid replacing a 220px skeleton with content that unexpectedly moves other controls. Measure CLS, do not claim a perfect value from CSS alone.

### React component plan (proposed paths)

| Component | Proposed path | Responsibility |
| --- | --- | --- |
| `App` | `src/App.jsx` **(PROPOSED; use existing entry if present)** | Own the page shell, dashboard heading, and overall layout; mount telemetry feature. |
| `PubgMatchTelemetry` | `src/components/PubgMatchTelemetry.jsx` **(PROPOSED)** | Coordinate selected squad, `IDLE/LOADING/SUCCESS/ERROR`, effect cleanup, retry, and render the appropriate panel. |
| `SquadSelector` | `src/components/SquadSelector.jsx` **(PROPOSED, optional extraction)** | Render responsive CES/TE/GE buttons and expose selection state/keyboard interaction. |
| `TelemetryCard` | `src/components/TelemetryCard.jsx` **(PROPOSED, optional extraction)** | Present all six labeled match fields and squad name during `SUCCESS`. |
| `TelemetrySkeleton` | `src/components/TelemetrySkeleton.jsx` **(PROPOSED)** | Show the accessible, Blue-Zone-themed 220px loading panel. |
| `TelemetryError` | `src/components/TelemetryError.jsx` **(PROPOSED)** | Render inline role-alert feedback and accessible retry button. |
| Stylesheet | `src/styles/telemetry.css` **(PROPOSED; or use existing CSS convention)** | Set visual tokens, responsive layout, focus, skeleton animation, reduced motion, and overflow rules. |

**Component boundaries:** Keep service and dataset separate from visual components. Avoid extra libraries, duplicated data sources, and separate copies of the same request state. If the repo already has equivalent components/styles, extend them rather than creating duplicates.

### PUBG-inspired visual direction

- **Color:** deep navy/charcoal page background, dark-blue panels, bright Blue-Zone cyan/azure accents, neutral high-contrast text; reserve amber/red for meaningful warnings/errors. Use styling inspired by PUBG, but no unlicensed logos, photos, or required external assets.
- **Typography:** system font stack (no font download required), obvious title hierarchy, readable body/metric labels, bold numeric values, sufficient line-height, and no tiny cramped captions.
- **Cards:** consistent rounded corners, restrained borders/shadows, clear spacing, consistent metric alignment, and visible status text. Color cannot be the only signal for selected squad, live state, or error.
- **Interaction:** clear hover and `:focus-visible` states; comfortably tappable selectors and Retry (target about 44×44 CSS px where practical, while satisfying applicable WCAG 2.2 target-size criteria); no hover-only functionality.
- **Motion:** subtle pulsing Blue-Zone loader only; `prefers-reduced-motion: reduce` removes or minimizes pulse. No decorative animation that blocks reading or interaction.

### Mobile-first CSS and breakpoint plan

These are **proposed min-width breakpoints**, not requirements already found in project files. Use fluid containers between them and only add a breakpoint when the content needs it.

| Width / test viewport | Planned layout | Required checks |
| --- | --- | --- |
| Base: 320–767px; required **375px mobile**, optional **320px** | One main column; full-width or wrapping squad buttons; metrics in a compact one-column or two-column grid only if labels fit; full-width 220px skeleton and alert; generous padding. | No clipped CES/TE/GE labels, metrics, skeleton, or Retry; no horizontal overflow; readable text; finger-friendly controls. |
| `@media (min-width: 768px)`; test **768px tablet** | More breathing room; selector can form a row; telemetry metrics can expand to 2–3 columns without changing reading order. | All four states remain aligned; touch/keyboard use works; no overflow. |
| `@media (min-width: 1024px)`; test **1280px laptop** | Centered max-width dashboard; header and selector can use wider alignment; telemetry card metrics in a wider grid; preserve same content and accessible order. | No excessively long lines, distorted skeleton, empty gaps, focus loss, or overflow; record actual CLS. |

Suggested layout foundations: `box-sizing: border-box`, `width: min(100%, ...)` or max-width containers, `min-width: 0` on grid/flex children, `overflow-wrap` for long content, CSS Grid/Flexbox, and `minmax(0, 1fr)` where appropriate. **Do not** hide layout errors with global `overflow-x: hidden`. The **220px** rule applies to the skeleton reserved block height, not a fixed-width card.

### UI review deliverables (planned, not completed)

- A documented visual hierarchy and component inventory matching the dataset/state contracts above.
- Mobile, tablet, and laptop layouts covered in existing proposed UI tasks (T-05, T-07, T-08, T-09); no third Git commit or separate dependency is added for design.
- Screenshots or browser observations of **SUCCESS**, **LOADING**, and **ERROR** at 375px and 1280px, plus 768px responsive check, only when the app exists.

## 2. Work breakdown structure (WBS)

Tasks are ordered. **Dependencies** refer to task IDs in this document. Each task should be verified before proceeding. Paths labeled PROPOSED are only suggestions.

### Phase P0 — Inspect and set boundaries (no feature code)

**T-00 — Confirm repository and tooling**
- **Depends on:** none.
- **Files:** Existing `PROJECT_RULES.md`; existing repository tree and any real `package.json`/test config (read only). No file changes required.
- **Steps:** Check source tree and scripts; decide which existing files to extend. Confirm the React runtime/build entry point and any existing test runner. Note that the uploaded Exercise 3 archive includes only project rules. Map LAB 2 patterns without copying mini-React.
- **Acceptance:** Recorded actual paths and usable commands (if present); no guessed npm script; no dependency added or unrelated file changed.

### Phase P1 — Data and behavior (planned Git Commit 1)

**T-01 — Define squad data**
- **Depends on:** T-00.
- **Files (PROPOSED):** `src/data/pubg-vn-telemetry-spec.js`.
- **Steps:** Export `PUBG_VN_SQUADS` with exact CES, TE, GE records from Section 1; use stable string IDs; define a safe lookup rule for unknown IDs.
- **Acceptance:** All three records and fields match the supplied specification; no live-API claim; lookup is deterministic.

**T-02 — Define the four-state React contract**
- **Depends on:** T-01.
- **Files (PROPOSED):** `src/components/PubgMatchTelemetry.jsx` (or existing equivalent).
- **Steps:** Define initial `{ status:'IDLE', data:null, error:null }`; track `selectedSquadId` (or receive it as a prop) and `retryTick` separately. Use a single status value, not competing booleans. Document when state changes; render an initial neutral view rather than assuming data exists.
- **Acceptance:** Only four lifecycle statuses; data/error shape is consistent; no null-data crash; Hooks called at component top level; no derived-state-only effect.

**T-03 — Build abortable simulated telemetry service**
- **Depends on:** T-01, T-02 contract.
- **Files (PROPOSED):** `src/services/fetchKraftonPubgTelemetry.js`.
- **Steps:** Simulate a delayed fetch from local data, packet loss of 35%, valid/invalid IDs, and cancellation. Support controlled timer/random test inputs where practical. Clean up timers and listeners on every settlement path.
- **Acceptance:** Controlled success and failure produce expected results; invalid ID handled; abort rejects with `AbortError` and never later settles as success/failure; all timer/listener cleanup is testable.

**T-04 — Connect squad changes to `useEffect` and `AbortController`**
- **Depends on:** T-02, T-03.
- **Files (PROPOSED):** `src/components/PubgMatchTelemetry.jsx`, existing app/entry component if required.
- **Steps:** On `[selectedSquadId, retryTick]` change, create a **new** controller, set `LOADING`, invoke the service with its signal, accept success/error only when request is still current, and return cleanup that aborts the prior controller. Handle `AbortError` without showing `ERROR`. Use an identity/current-request guard as a second safety check for late resolutions that ignore the signal. Keep selectors usable during loading; no request deduplication across different squads.
- **Acceptance:** Clicking CES → TE → GE before responses settle leaves GE as the only eligible result; old failure or success cannot overwrite GE; abort is harmless; changing squad while loading starts the new request; unmount stops updates. React development Strict Mode setup/cleanup must not cause false alerts.

**T-05 — Render minimal functional, mobile-first squad selector and SUCCESS output**
- **Depends on:** T-04.
- **Files (PROPOSED):** `src/components/PubgMatchTelemetry.jsx`; optionally `src/components/SquadSelector.jsx`, `src/components/TelemetryCard.jsx`; existing app integration entry.
- **Steps:** Build the minimal **complete dashboard shell** from Section 1A: page heading, transparent simulation label, squad selector and a SUCCESS telemetry panel. Use three semantic `button type="button"` controls for CES/TE/GE with visible selection (`aria-pressed` is an option). Render six explicitly labeled telemetry fields (map, phase, alive, kills, WWCD probability, status) and the squad name. On a 375px phone start with a single-column shell and wrapping/stacked controls; keep metrics readable and tap targets comfortable. This is the **functional unpolished shell** for Commit 1; show only basic text LOADING/ERROR placeholders until Commit 2 adds designed skeleton/error UI.
- **Acceptance:** Three selectors work by mouse, keyboard, and touch; controls and text fit a narrow mobile viewport without horizontal scrolling; only selected squad stats appear on success; switching while loading remains possible; output is safe React text, not inserted HTML.

**T-06 — Deterministic core tests and Commit 1 boundary review**
- **Depends on:** T-03, T-04, T-05.
- **Files (PROPOSED, use installed test conventions if available):** `src/services/fetchKraftonPubgTelemetry.test.js`, `src/components/PubgMatchTelemetry.test.jsx`.
- **Steps:** Test all data, state transitions, success, loss, invalid squad, already-aborted signal, abort during wait, cleanup, rapid switching, stale success and stale failure, unmount, and Strict Mode behavior where feasible. Mock randomness/timers/deferred promises. Confirm there are no unexpected modifications.
- **Acceptance:** Actual available tests are executed and results recorded; any unavailable tools marked NOT RUN with reason. Only logic/data/core UI changes are staged for planned Commit 1.

**Planned atomic commit #1 (do not execute in this planning step):**
`feat(ex3): implement PUBG VN 4-state telemetry & AbortController`

### Phase P2 — Loading, error recovery, and accessibility (planned Git Commit 2)

**T-07 — Create 220px Blue-Zone skeleton**
- **Depends on:** T-05.
- **Files (PROPOSED):** `src/components/TelemetrySkeleton.jsx`, `src/styles/telemetry.css`, or existing style files.
- **Steps:** Follow the palette, spacing, and stable shell in Section 1A. Replace basic LOADING text with a Blue-Zone-themed pulsing card of **220px reserved height**; match the content area's layout/min-height where feasible on both phone and laptop viewports; keep the skeleton within the available width (including padding/borders); add an accessible loading text/status and `aria-busy` on the relevant region. Adapt LAB 2 CSS pulse and `prefers-reduced-motion` behavior, removing its duplicate selectors rather than copying them twice.
- **Acceptance:** Loading indicator is visible under an intentional delay; skeleton reserves 220px height per specification and does not cause horizontal overflow on small screens; motion is reduced/disabled when requested; no important information conveyed only through animation.

**T-08 — Create accessible error and retry UI**
- **Depends on:** T-04, T-07.
- **Files (PROPOSED):** `src/components/TelemetryError.jsx`, `src/components/PubgMatchTelemetry.jsx`, relevant stylesheet.
- **Steps:** When the active request fails, render `<section role="alert">` with a safe explanation such as `Blue-Zone Link Lost: Satellite packet timeout` and a semantic `button type="button">Reconnect Satellite</button>`. Its click increments `retryTick` to rerun the same selected squad's effect. Avoid repeated alert announcements during normal LOADING. Keep alert copy readable and the Retry button touch-friendly, wrapping on narrow screens if needed. Do not use `window.alert()`.
- **Acceptance:** ERROR is visible and announced once when appropriate; retry enters LOADING and can reach SUCCESS or ERROR; abort never flashes alert; Retry works with keyboard and touch, has visible focus and a usable accessible name; the alert and button fit a phone viewport without clipping or horizontal overflow.

**T-09 — Final styling, responsive design, and UI integration**
- **Depends on:** T-07, T-08.
- **Files (PROPOSED):** `src/styles/telemetry.css` and existing app integration files.
- **Steps:** Implement the visual system from Section 1A: deep-navy/charcoal background, dark panels, Blue-Zone cyan/azure accents, contrast-safe neutral labels, prominent metrics, restrained borders, consistent spacing, a readable system font, and visible selected/focus/error states. Write the default CSS for phones first: a single-column layout, readable text, sensible spacing, flexible widths, and stacked/wrapping squad buttons with touch-friendly targets (aim for at least 44×44 CSS px when practical; meet WCAG 2.2 target-size requirements). Use `box-sizing: border-box`, `max-width: 100%`, wrapping, and appropriately sized grid/flex children to prevent horizontal overflow; do not hide overflow to mask broken layout. Then add **min-width media queries** to progressively adapt to tablets (e.g., 768px) and laptops (e.g., 1024px), changing columns/spacing without breaking reading order. Ensure the squad selector, SUCCESS telemetry card, 220px LOADING skeleton, and ERROR alert/retry control all fit at small widths. Align skeleton, success, and error card reserved size/spacing to limit layout shift; give controls visible focus and high-contrast labels. Preserve semantic headings/status, avoid unnecessary wrappers/libraries, and render text values with suitable labels (e.g., `<dl>` with proper layout resets). These breakpoints are proposals, not project-defined standards.
- **Acceptance:** The complete dashboard has a clear heading, three consistently styled squad buttons, and all six labeled telemetry statistics; the themed SUCCESS, LOADING, and ERROR panels feel part of one design. Mobile-first styles work at a narrow phone viewport (320px where feasible and required 375px), a tablet viewport (e.g., 768px), and a laptop viewport (e.g., 1280px). Selector, SUCCESS card, LOADING skeleton, and ERROR alert remain readable and usable; touch targets are easy to activate; keyboard focus is visible; no horizontal overflow (`document.documentElement.scrollWidth <= document.documentElement.clientWidth`); responsive media queries progressively enhance layout; supports reduced motion and does not rely on color alone. CLS remains **unverified until measured**.

**T-10 — UI/accessibility regression tests and Commit 2 boundary review**
- **Depends on:** T-07, T-08, T-09.
- **Files (PROPOSED):** existing UI test location, e.g. `src/components/PubgMatchTelemetry.test.jsx`.
- **Steps:** Add deterministic LOADING/skeleton, ERROR/role=alert, Retry, multiple failures, abort-no-alert, semantic button, accessible-name, selection, reduced-motion/style checks where tools support them. Add checks for dashboard heading, CES/TE/GE selector labels and selected styling/semantics, and each of the six telemetry fields. Add viewport-based UI checks for phone and laptop widths with existing tools if supported; leave true overflow/touch/layout verification for real browser testing. Review changes so only new skeleton/error/accessibility work is included in planned Commit 2.
- **Acceptance:** The configured tests are run and accurately reported; no claim of WCAG compliance from unit tests alone. No `window.alert()` in application code.

**Planned atomic commit #2 (do not execute in this planning step):**
`feat(ex3): add skeleton UI & retry alert`

**Commit planning note:** The assignment mandates the two commit messages above in that order. Automated tests associated with the relevant feature belong with its commit. Manual audit evidence and this WBS should be retained without creating a third commit unless the user explicitly changes the requirement. This document is not evidence that either commit exists.

### Phase P3 — Browser verification and handoff (verification only; no third commit planned)

**T-11 — Manual DevTools audit**
- **Depends on:** T-10.
- **Files:** None required to modify; use a test record in the final handoff or existing approved evidence location if there is one.
- **Steps:**
  1. Run the **actual** app command discovered in T-00 and open it in Chrome.
  2. In DevTools > Network, choose **Slow 3G**; select a squad and observe the 220px skeleton. For a timer-only simulation, Slow 3G **does not slow the timer**, so deliberately configured delay is needed to see LOADING.
  3. Click CES → TE → GE rapidly. Confirm the UI eventually shows only GE (or GE's own error), never stale CES/TE results or abort error alerts.
  4. Inspect Network: timer-only simulations do **not** produce requests or `(canceled)` entries. Record “not applicable (timer simulation)” rather than fake proof. If an approved mock HTTP endpoint exists, inspect real canceled fetches separately.
  5. Force a deterministic failure via a development/test seam, confirm `role="alert"`, then Retry and confirm fresh LOADING and recovery.
  6. In Chrome DevTools Device Toolbar, test **375px phone**, **768px tablet**, and **1280px laptop** widths (optionally 320px). In each, test dashboard heading/simulation notice, squad selector, every telemetry metric on the SUCCESS card, 220px skeleton, and ERROR alert/retry; check text legibility, wrapping, touch target size, focus, and horizontal scrolling. Compare `document.documentElement.scrollWidth` with `document.documentElement.clientWidth` in the Console.
  7. In DevTools > Performance record traces covering loading and card replacement at **375px and 1280px**; inspect Layout Shifts and reported CLS. Capture actual measurement conditions, viewport, device/throttling, and result **for each viewport**. Do **not** claim `CLS = 0.00` unless measured as 0.00.
- **Acceptance:** Phone (375px), tablet (768px), and laptop (1280px) checks are recorded as PASS/FAIL/NOT RUN for all four UI elements; observed overflow status documented for each width; mobile and laptop CLS are recorded as actually measured or NOT RUN; no claim of HTTP cancellation for timer-only service.

**T-12 — Keyboard, screen-reader, and final verification**
- **Depends on:** T-11.
- **Files:** None required to modify for this planning step; fix discovered application bugs in the relevant task before handoff if implementation has begun.
- **Steps:** Tab through squad controls and Retry; activate with Enter/Space; check focus indicator and selected-state announcement; inspect the accessibility tree and alert/status announcements with an available screen reader; check reduced motion, contrast, headings, responsive layout at phone and laptop widths, touch-friendly targets, horizontal overflow, and no alert() use. Execute only existing build/test/lint scripts actually found during T-00. Record commands, actual results, limitations, and remaining defects.
- **Acceptance:** No fabricated scores/results; every mandatory check has PASS/FAIL/NOT RUN and rationale; relevant accessible behavior checked in a browser, not just asserted from JSX.

## 3. Requirements checklist (to fill in during implementation)

- [ ] Complete dashboard shell displays a clear PVS heading and an honest simulated-data label.
- [ ] CES, TE, and GE selector is visually consistent, selected state is perceivable, and all six telemetry fields are labeled.
- [ ] PUBG-inspired Blue-Zone palette, high-contrast typography, consistent cards/spacing, and clear visible status/focus styles.
- [ ] Proposed React component boundaries and CSS breakpoint choices reviewed against the actual repository.
- [ ] Dataset contains exact CES, TE, GE statistics.
- [ ] Real React component and true `IDLE`, `LOADING`, `SUCCESS`, `ERROR` lifecycle.
- [ ] Simulated async request; configured 35% loss probability.
- [ ] Invalid ID and failure lead to safe errors, not a crash.
- [ ] Squad switching aborts previous request and starts a new one.
- [ ] Effect cleanup works on dependency change and unmount.
- [ ] Stale successes/failures cannot overwrite latest squad selection.
- [ ] Intentional `AbortError` never shows an error banner.
- [ ] LOADING shows a 220px pulsing Blue-Zone skeleton with reduced-motion support.
- [ ] ERROR shows `<section role="alert">` and `Reconnect Satellite` button.
- [ ] Retry reloads the currently selected squad using `retryTick`.
- [ ] No `window.alert()`; controls are keyboard accessible and focus visible.
- [ ] Deterministic automated tests cover failures, races, retry, and cleanup.
- [ ] Mobile-first CSS: small-phone base styles, tablet/laptop enhancements with min-width media queries.
- [ ] Selector, telemetry card, skeleton, and alert/retry tested on phone (375px), tablet (768px), and laptop (1280px).
- [ ] Readable text, touch-friendly controls, visible focus, and no horizontal overflow at tested widths.
- [ ] Manual Slow 3G / rapid-switch / accessibility checks completed and recorded.
- [ ] Actual CLS measured and recorded; do not assume 0.00.
- [ ] Timer-only simulation accurately reported as not appearing in Network.
- [ ] Exactly two required atomic commits created **later, when authorized**, in specified order.

## 4. Common mistakes and how to avoid them

| Mistake | Avoid it by |
| --- | --- |
| Copying LAB 2 mini-React or loader unchanged | Use React hooks; allow squad changes to supersede in-flight loading. |
| Updating data from an old request | Abort previous request **and** check current identity/signal before committing. |
| Showing ERROR for `AbortError` | Ignore intentional cancellation, including stale rejection. |
| Assuming `AbortController` cancels any Promise automatically | Make the simulated timer service actually listen to `signal` and clear its timeout. |
| Using `useEffect` for values derivable from props | Calculate display values while rendering; use effects only for async synchronization. |
| Treating `IDLE` as missing and dereferencing null data | Render a safe IDLE branch before the effect starts. |
| Making errors non-deterministic in tests | Inject/mock random outcome and timers; assert exact results. |
| Triggering repeated noisy announcements | Use `role="alert"` only for active errors and polite status for loading. |
| Replacing skeleton with taller content | Reserve stable layout space and measure actual CLS. |
| Building only a stats widget instead of a dashboard | Plan the header, simulated-data notice, squad selector, state panels, and all six metrics as one responsive interface. |
| Using color alone for selection or squad status | Pair colors with button selected state, readable labels, and accessible semantics. |
| Missing map, phase, alive, kills, WWCD, or status | Check all six labeled fields in SUCCESS tests at both mobile and laptop sizes. |
| Designing desktop-first then squeezing the phone view | Start with single-column phone CSS; use `min-width` media queries for larger screens. |
| Fixed card/button widths cause mobile horizontal scrolling | Use flexible widths, wrapping, and test `scrollWidth <= clientWidth` at each viewport; do not hide the defect with `overflow-x: hidden`. |
| Tiny touch targets or unreadable text | Use legible font sizes, adequate spacing, and touch-friendly buttons; verify with Device Toolbar and keyboard. |
| Assuming Chrome Slow 3G affects `setTimeout` | It throttles network requests, not local timers. |
| Expecting canceled items in Network from a timer Promise | Use an approved actual mock HTTP request if Network evidence is required. |
| Claiming WCAG, zero CLS, or tests passed from visual inspection | Perform and record the relevant checks. |
| Inventing `npm run build` or adding test packages blindly | Inspect actual `package.json` and installed tools first. |
| Committing planned work automatically | Wait for explicit authorization; two commits are a future plan only. |

## 5. Definition of Done (DoD)

Exercise 3 is done **only when all conditions are verified**:

1. The three dataset entries and their details match the provided specification.
2. React shows the correct four states; selectors work and only the latest squad can update the UI.
3. Failure, abort, retry, unmount, and stale-result handling pass deterministic tests using tools confirmed in the repository.
4. A complete PUBG-inspired dashboard exists: heading and simulation notice, CES/TE/GE squad selector, all six telemetry metrics, readable color/typography, and cohesive responsive state panels. The 220px Blue-Zone skeleton, accessible inline error alert, and Retry control work in the running application; no `window.alert()` is used.
5. Mobile-first CSS is verified at 375px phone, 768px tablet, and 1280px laptop (plus 320px when practical): selector, success card, skeleton, and error alert stay usable; no horizontal overflow; text stays readable and targets are touch-friendly. Keyboard behavior, focus, live announcements, reduced motion, and contrast are manually checked; record limitations rather than claiming universal WCAG compliance.
6. Chrome Performance recordings capture actual CLS values for phone and laptop viewports. `0.00` can be reported **only if observed**; otherwise record the actual result or NOT RUN.
7. Manual Slow 3G and rapid switching observations are recorded. Timer-only simulation is explicitly distinguished from real Network requests.
8. The actual available test/build commands and results are documented with failures/not-run reasons; there are no invented scripts or scores.
9. Git diff is reviewed for scope and secrets. When implementation commits are explicitly authorized, exactly the two mandatory commit messages above are made in the specified order; otherwise report them as planned and unexecuted.
