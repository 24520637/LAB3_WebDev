# TASK DECOMPOSITION — Bonus Exercise: Hẹn Hò Nhưng Không Yêu State Machine

**Status:** Phase 1 domain implemented and tested · 2026-11-10. No React UI, derived-score view, or ghosting timer has been implemented.

## 0. Repository evidence and reuse decision

**Verified workspace:** Repository root is `LAB3_WebDev`. `BonusHW` contains this document and `PROJECT_RULES.md`; the user-provided `BonusExercise_Phase1.zip` supplies a Node ESM package manifest, Phase 1 domain modules, and tests. The checkout also contains `LAB2_Exercises` and several independent React 19/Vite projects. None of those React applications is a confirmed Bonus host.

**P0 inspection:** The root worktree was already dirty before implementation. Preserve all unrelated changes. No Bonus React entry point, component, styles, or existing Bonus tests were present. The Bonus package uses Node's built-in test runner and does not add dependencies. `src/components/SituationshipAnalyzer.jsx` and `hen-ho-khong-yeu-spec.ts` remain proposed names only.

## 1. Contract and design decisions

- **Phase 1 FSM contract implemented from the supplied ZIP:** Its four phases are `FRIENDS`, `DATING_NO_LOVE`, `OFFICIAL_LOVE`, `GHOSTED_EXIT`; its events are `START_DATING`, `CONFIRM_MUTUAL_COMMITMENT`, `EXIT`. Only `FRIENDS -> DATING_NO_LOVE`, `DATING_NO_LOVE -> OFFICIAL_LOVE`, and `DATING_NO_LOVE -> GHOSTED_EXIT` are allowed. Unknown states/events and invalid transitions throw; `GHOSTED_EXIT` has no reset. The conflicting prose names were not added as extra states. Instructor confirmation is still needed if the prose is intended to override the ZIP's typed contract.
- **Phase 1 effort contract implemented from the supplied ZIP:** Append-only immutable records `{id, actor: 'EM'|'AI_DO', steps, multiplier}`; multipliers are `0.1` and `50`, with worked scores `100 * 0.1 = 10` and `1 * 50 = 50`. IDs must be unique; values must be finite and nonnegative; records are frozen. The conflicting `0.05` and `100` example remains unmerged and should be confirmed if it is authoritative instead.
- **Red flag:** Purely derived on render from phase and logs: `DATING_NO_LOVE && emScore < rivalScore`. No secondary state or effect to store calculated totals/warning.
- **Ghosting semantics:** Unresolved and not implemented. The start-on-send behavior in this plan is only a proposal; confirm whether the 5-second timer begins on **Send Message** or immediately upon entering `DATING_NO_LOVE`, as well as replacement/cancellation rules.
- **Cleanup:** `clearTimeout` cancels browser timers; `AbortController` cancels signal-aware asynchronous operations; a request/message identity guard prevents stale completions. `abort()` alone does **not** clear `setTimeout`; garbage collection is managed by the JS runtime and is not manually triggered.

## 2. Work breakdown structure

| Phase / ID | Task and expected outcome | Depends on | Acceptance criteria / verification |
| --- | --- | --- | --- |
| **P0 · T-01** | Inspect actual Lab 2 and target React checkout, project rules, scripts, relevant hooks/components, timers, tests, and Git state; document reuse/replace choices. | None | **Done:** Real workspace and existing project/test conventions inspected. No confirmed Bonus React host. |
| **P1 · T-02** | Implement pure relationship FSM contract (constants/actions/transition guards) using current architecture. | T-01 | **Done:** Phase 1 transitions, terminal exit, and invalid input behavior covered by tests. |
| **P1 · T-03** | Add immutable effort action log and pure reducer; use stable signal IDs. | T-01 | **Done:** Validated append-only records, duplicate-ID rejection, immutability, and numeric bounds covered by tests. |
| **P2 · T-04** | Derive `emScore`, `rivalScore`, and red-flag warning directly from logs + phase; present basic readable output. | T-02, T-03 | Example computes `10` vs `50`, warning appears only when required; no redundant `useEffect`/stored derived totals. |
| **P3 · T-05** | Define send/reply/pending message state and 5-second ghosting effect following actual React conventions. | T-02 | One active timer per pending message; reply before deadline prevents exit; unanswered message exits once at 5 seconds; input edits do not reset deadline. |
| **P3 · T-06** | Implement cancellation and resource cleanup for Stop, phase change, replacement, unmount, and React StrictMode. | T-05 | Cleanup clears timers, aborts signal-aware work, excludes stale callbacks; no false ghosting after cancellation; no manual-GC claim. |
| **P4 · T-07** | Complete accessible interactive analyzer: phase indicator, effort controls, send/reply/Stop buttons, derived status. | T-04, T-06 | `useId()` ties labels to inputs; native keyboard activation, visible focus, safe disabled states; `<output role="status" aria-live="polite">` announces changes without noisy repetition. |
| **P4 · T-08** | Apply existing project CSS conventions for mobile-first layout. | T-07 | At 375px no horizontal scroll, clipped labels, or overlapping controls; verify larger width; adequate contrast and reduced-motion support if animation exists. |
| **P5 · T-09** | Add focused pure-logic and React integration tests using the **verified** existing test tooling; request approval before new dependencies. | T-02–T-08 | Deterministic FSM/reducer/derived-state assertions plus fake-time ghosting/cancellation/StrictMode/unmount tests; keyboard/label/status checks. Tests assert visible behavior, not just internals. |
| **P5 · T-10** | Run available build/test/lint/type checks and manual browser QA; document observed outcomes and gaps. | T-09 | Record exact commands, actual pass/fail/skip counts, viewport observations and limitations; no unrun checks labeled PASS. |

**Suggested execution order:** `T-01 -> (T-02, T-03) -> T-04 -> T-05 -> T-06 -> T-07 -> T-08 -> T-09 -> T-10`. Pure FSM/log work may proceed in parallel after P0; UI depends on both branches.

## 3. Testing strategy

| Layer | Essential cases | Method |
| --- | --- | --- |
| FSM unit | All allowed/disallowed transitions; exit terminal; stable state on invalid action | Table-driven pure-function tests. |
| Reducer / derived unit | Immutable append and ordered history; IDs; negative/NaN rejection; empty logs; scores `10`/`50`; warning only for dating imbalance | Input/previous-state snapshots and expected outputs. |
| Effect integration | Timer begins on send, not on mount; boundary `4999ms` vs `5000ms`; reply prevents exit; new message supersedes old; manual exit; phase switch | Controlled fake timers / `act`, including callback race cases. |
| Lifecycle | Unmount and React StrictMode setup/cleanup cycles; aborted work does not change state or announce false warning | React integration harness with spies on relevant timer/abort behavior, coupled to observable UI results. |
| Accessibility / responsive | Label association, Tab/Enter/Space, live status, visible focus; 375px and wider viewport | Automated DOM tests if configured + manual browser/screen-reader checks; do not equate jsdom with visual or full WCAG validation. |

**Verified:** `cd BonusHW && npm test` (PowerShell equivalent: `Push-Location BonusHW; npm test; Pop-Location`) passed all 8 Phase 1 tests using Node's built-in test runner. No dependencies were installed. A first invocation from the repository root failed because that directory has no `test` script; it was rerun successfully from `BonusHW` and was not an application defect. No UI, timer, responsive, or accessibility checks have been run.

## 4. Risks and controls

| Risk | Control |
| --- | --- |
| Specification conflicts (`STRANGERS` vs `FRIENDS`, two multiplier sets) | Phase 1 ZIP supplied the contract implemented here; confirm with the instructor if prose should supersede it. |
| Boolean soup / illegal phase combinations | Single FSM phase with guarded transitions; test all event/state pairs. |
| In-place log mutation / duplicate effects | Pure reducer, new array/record references, stable event IDs, test immutability. |
| Derived-state drift | Compute totals and warning directly from current phase/logs during render. |
| Timer resets from effort changes; stale callbacks after Stop | Key effect to pending message identity; use cleanup, abort and identity/phase guards. |
| StrictMode double effect setup; misleading “memory freed” claims | Ensure idempotent cleanup; verify no pending jobs; do not assert explicit GC. |
| Ghosting timer trigger and missing Bonus React host | Confirm timer semantics and intended host before extending beyond Phase 1; do not infer them from the domain archive. |
| Excessive screen-reader announcements / 375px overflow | Stable status text, semantic controls, real keyboard + viewport QA. |

## 5. Git milestones (planned; do not commit during planning)

1. **Milestone 1 — after T-02/T-03 and focused domain checks:** `feat(fsm): model HenHoKhongYeu state machine` — includes canonical FSM and immutable effort foundation. Stage only verified relevant files.
2. **Milestone 2 — after T-04–T-10 and verified UI/async QA:** `feat(ui): add derived red-flag meter & ghosting cleanup` — includes derived warning, ghosting lifecycle, accessibility and responsive UI; report testing evidence separately if repository conventions require.

Before either commit: review `git diff` and `git status`, confirm no unrelated file changes, and commit **only when explicitly authorized**. The two subjects are instructor-specified milestones, **not existing Git history**.

## Definition of Done

**Phase 1 domain:** Implemented and verified (8 tests passing). **Remaining:** instructor confirmation of conflicting prose if needed; derived score/red-flag behavior; selection of a React host; ghosting timer contract; UI/accessibility/responsive implementation and verification. No timer or UI behavior is claimed complete.
