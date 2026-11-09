# TASK DECOMPOSITION — HW3: KRAFTON x PUBG Vietnam Championship & Airdrop Arena

**Status:** Planning only. **Deliverable:** this WBS; no application implementation, test run, or Git commit is claimed.

## 0. Evidence, scope, and reuse boundaries

### Source-inspection baseline (2026-11-09)
- Current accessible working directory `/mnt/data` contained **no repository files or source archives** before this WBS was created. No `.git`, `package.json`, React source, Lab 2 HW3 code, Slide 22 Virtual Scroller implementation, or test configuration was available for direct inspection in this working directory.
- Prior project documentation in the user's Library describes a **different Lab 2 HW3** baseline (a rules-only starter at the time) and recommends target-epoch timer math and a reservation state machine. These notes are **secondary context, not direct inspection of the current HW3 repository**; do not treat their paths, test claims, or implementation as present now.
- Assignment text supplied in this conversation establishes `createAntiDriftTimer` and the Slide 22 Virtual Scroller as **intended predecessors**, and gives an example `usePubgAirdropTimer` hook and TypeScript domain contract. This **does not verify predecessor functions or Virtual Scroller source files actually exist in the accessible repo**.
- **Blocking gate before implementation:** obtain/open the actual Lab 2 HW3 and current HW3 repository, inspect file tree, manifest, framework/version, rule files, timer/scroller source, inventory/state handling, tests, and Git history. Record exact paths and line-level behavior. Then update reuse decisions and file paths before implementing. Do not overwrite or fabricate an existing implementation.

### Conditional reuse matrix
| Predecessor | Verified source available now? | Planned decision after code inspection |
|---|---|---|
| Lab 2 `createAntiDriftTimer` | **No** | Inspect API, target-time math, clock offset, subscriptions, stop/dispose, tests. Reuse pure time-calculation logic if safe; wrap in React hooks rather than copying DOM scheduling/lifecycle code. |
| Lab 2 HW3 inventory / reservation FSM | **No** | Inspect concurrency, expiry, idempotency, inventory invariants. Reuse verified pure transition rules only; adapt to server-confirmed 409 rollback. |
| Slide 22 Virtual Scroller | **No** | Inspect item measurements, windowing, scroll handlers, keys, accessibility, cleanup. Reuse a verified framework-neutral window calculation if appropriate; otherwise implement React-integrated virtualization **only if data size merits it**. Never assume Slide 22's code or a library is installed. |
| Existing React app, tests and styles | **No** | Preserve actual conventions and scripts once inspected. Avoid duplicate scaffold, new dependencies, or toolchain changes without approval. |

**Scope:** React 19 ticket/G-Coin arena, zero-drift countdown, optimistic claim with 409 recovery, squad standings, kill-feed filtering, integrated accessible/mobile UI, testing and `AI_FAILURE_AUDIT.md` (at least three **reproduced** AI defects). **Not established:** official KRAFTON APIs, payment flow, authentication, real-world stock, backend deployment, or historical/current leaderboard values. Use conspicuously labeled local simulation until real service contracts are supplied.

**Assignment ambiguity to resolve in design:** `dropEpochMs` may denote sale opening or expiry; document its meaning and define explicit `DropPhase` transitions (`WARMUP`, `AIRDROP_LIVE`, `LOOTED_OUT`, `EXPIRED`). The sample `isLive: remainingMs === 0` is **not sufficient** by itself to determine whether a drop is live vs expired. The specified squad ID `ge` maps to **Roy Esports** in this HW3 brief, despite earlier exercises potentially mapping `ge` differently; preserve this HW3 contract or document an instructor-approved correction.

## 1. Task breakdown and gates

Every task is **not started**. File paths below are **suggested only**, never claims of existing files. Each acceptance criterion is a future testable requirement, not a passing test result.

### Phase A — Repository discovery and architecture

**T-01 — Inspect real source and record migration map**  
**Depends on:** none (but requires repository availability).  
**Work:** Read repository rules, manifests, entry points and source; locate `createAntiDriftTimer`, Slide 22 scroller, stock logic, existing tests and build scripts. Document reusable pure functions, code requiring adaptation, and missing components. Check dependency/install policy and existing Git status.  
**Output / acceptance:** Traceable actual-path reuse matrix, confirmed React/tooling/test baseline, discrepancies logged; no claimed reuse without source evidence. **Tests:** static source inspection and available test discovery (not execution required yet). **Risks:** absent/incomplete archive, different timer semantics or incompatible scroller.  
**Git milestone M1 (planned):** `docs(hw3): map lab2 reuse and arena contracts`.

**T-02 — Define domain and state boundaries**  
**Depends on:** T-01.  
**Work:** Formalize `PubgCrateDrop`, `PubgVnSquadStanding`, and `DropPhase`; distinguish countdown target from close time, model price in numeric VND, stock and claim response, in-flight request IDs, errors, and kill-feed event shape (not provided in brief). Decide mock service vs supplied endpoint. Assign responsibility to pure utilities, hook, claim service/store, derived standings, components; explicitly choose when virtual scrolling is justified.  
**Output / acceptance:** Contract review table; deterministic phase transitions; no conflicting squad IDs; immutable state and server-authoritative reconciliation defined. **Tests:** contract fixture review, boundary/state-transition table. **Risks:** undefined endpoint, unknown event schema and timing semantics.  
**Git M2:** `docs(hw3): define arena state and service boundaries`.

### Phase B — Timer migration

**T-03 — Pure clock calculation and deadline rules**  
**Depends on:** T-02.  
**Work:** Extract/adapt verified Lab 2 timer math if present; calculate `max(0, targetEpochMs - (Date.now() + serverOffsetMs))`, keep offset sign/units documented; handle already-past targets and changing inputs. Separate display countdown from drop phase.  
**Output / acceptance:** Clock output matches fake-clock cases after arbitrary delayed ticks, never negative, and handles target/offset changes. **Tests:** deterministic unit tests using controlled time for normal, expired, offset, and background-delay scenarios. **Risks:** offset sign inversion, stale closure, clock skew.  
**Git M3:** `feat(timer): preserve target-epoch countdown semantics`.

**T-04 — React 19 `usePubgAirdropTimer` lifecycle**  
**Depends on:** T-03.  
**Work:** Provide hook returning remaining time and clearly defined state; sync on mount, interval/animation frames and `visibilitychange` wake; resubscribe on target/offset changes; clean up listener/scheduler on effect re-run/unmount. Avoid setState after unmount and repeated terminal actions.  
**Output / acceptance:** Countdown resynchronizes instantly after tab wake; old listeners/ticks do not survive unmount, prop changes or Strict Mode effect remount. **Tests:** hook integration with fake timers/document visibility and lifecycle cleanup; browser background-tab manual check. **Risks:** throttling, timer leaks, React Strict Mode duplicate effects.  
**Git M4:** `feat(timer): add visibility-aware React airdrop hook`.

### Phase C — Claims and inventory consistency

**T-05 — Claim service contract and stock invariants**  
**Depends on:** T-02.  
**Work:** Specify request key/`claimId`, unique claim response, 409 conflict and network error behavior, authoritative stock version/refresh if supported; simulate atomic server-side checks in a mock if no backend exists. Enforce nonnegative stock and prevent claim outside `AIRDROP_LIVE`.  
**Output / acceptance:** Repeated identical request IDs cannot double-consume stock in the chosen simulated service; `available + reserved + sold` accounting is defined if using reservations; client is never described as providing cross-user atomicity. **Tests:** service unit/integration for success, sold out, concurrent requests, idempotency and expiry boundary. **Risks:** mock behavior mistaken for production consistency, races at zero stock.  
**Git M5:** `feat(claim): establish idempotent claim service contract`.

**T-06 — Optimistic claim lock, rollback and reconciliation**  
**Depends on:** T-05.  
**Work:** On a valid click, synchronously guard in-flight `claimId` (ref or single coordinator), optimistically decrement once, disable duplicate attempts, submit claim; commit on success; on HTTP 409 rollback/reconcile with authoritative stock and show conflict; handle network errors/cancellation, stale responses and retries without double stock adjustments.  
**Output / acceptance:** At most one active claim per protected action; no negative or permanently decremented stock after a rejected claim; clear user-visible status; locks released safely on every settled outcome. **Tests:** double click before React rerender, 409 rollback, server stock divergence, unmount/late response, retry, success. **Risks:** rollback overwrites newer data, duplicate requests, incorrect error interpretation.  
**Git M6:** `feat(claim): add optimistic inventory and conflict rollback`.

**T-07 — Ticket / crate cards and VND presentation**  
**Depends on:** T-04, T-06.  
**Work:** Render ticket and G-Coin drop information, remaining stock, current phase, timer and keyboard-operable claim controls; `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })`; accessible status/error announcements.  
**Output / acceptance:** Correct locale/price output, no claim on invalid phase/zero stock, clear pending/success/409 states. **Tests:** component events and accessible-state tests; manual keyboard and 375px check. **Risks:** claim button reenabled prematurely, misleading price formatting.  
**Git M7:** `feat(ui): present PVS ticket and crate claims`.

### Phase D — PUBG squad standings and kill feed

**T-08 — Squad standings source and derived sorting/filtering**  
**Depends on:** T-02.  
**Work:** Keep specified `te` The Expendables, `ces` Cerberus Esports, `ge` Roy Esports, `agg` AGG identifiers; use assignment-approved **simulated** statistics until verified data source exists. Implement case-insensitive name filter and immutable sorting by WWCD, placement points, kill points, with deterministic tie breaking.  
**Output / acceptance:** All four correct IDs/names; filters and each sort order work without mutating source; empty state and keyboard-operable controls. **Tests:** pure filter/sort units, component interaction, equality/ties, empty input. **Risks:** mismatched `ge` mapping, copied fabricated “live” numbers.  
**Git M8:** `feat(leaderboard): add PUBG VN standings controls`.

**T-09 — Kill-feed events, filters and virtualization decision**  
**Depends on:** T-02, T-08.  
**Work:** Define event IDs, event time, squad, actor, target and ordering as needed; implement squad/text/type filters according to available fields, immutable newest-first feed and bounded/virtual rendering as warranted. Inspect Slide 22 scroller before reuse; if justified, adapt a pure window calculation + React scroll refs/effects, stable event keys, overscan, resize/cleanup and screen-reader alternative. If feed is small, use a normal semantic list and document why virtualization was omitted.  
**Output / acceptance:** Correct filter results/order with no lost or repeated records; changing filters/scroll position never shows stale rows; accessible readable event list. **Tests:** filter and order units; if virtualization used, window bounds, scroll/resize, variable-size assumptions, cleanup and focus/keyboard checks. **Risks:** premature virtualization, wrong item-height assumptions, offscreen focus loss.  
**Git M9:** `feat(killfeed): add filtered feed and justified windowing`.

### Phase E — Integration and quality

**T-10 — React arena composition and responsive accessibility**  
**Depends on:** T-07, T-08, T-09.  
**Work:** Combine header, drops, scoreboard and feed following observed repository conventions; semantic landmarks, labeled controls, visible focus, live feedback, mobile-first 375px/768px/desktop layouts, reduced-motion handling; no assumed official branding rights or API integrations.  
**Output / acceptance:** Integrated flows work without duplicate state sources; no horizontal overflow at tested sizes, keyboard-only path to all actions, understandable text when dynamic content changes. **Tests:** browser manual matrix, React integration flows, basic accessibility/contrast audit using existing tooling. **Risks:** state desync across panels, layout overflow, excessive announcements.  
**Git M10:** `feat(arena): integrate responsive accessible PUBG UI`.

**T-11 — Isolated AI failure reproduction and audit**  
**Depends on:** T-04, T-06, T-09.  
**Work:** Investigate at least three *real* AI-generated defects; candidates: interval decrement drift, duplicate claim race, failed 409 rollback, in-place leaderboard sort, virtual list wrong bounds. Reproduce defects in disposable fixture/branch; save real commands/observed results, minimal before/after diffs, root cause and successful regression checks. Produce `AI_FAILURE_AUDIT.md` **only after** verified findings.  
**Output / acceptance:** ≥3 genuine confirmed failures documented with evidence and safe fixes; unconfirmed experiments explicitly marked unverified; production code restored after isolated experiments. **Tests:** deterministic defect reproductions and targeted regression tests. **Risks:** made-up audit results, leaking intentional bugs into app.  
**Git M11:** `test(hw3): document reproduced AI failures`.

**T-12 — Final verification and handover**  
**Depends on:** T-10, T-11.  
**Work:** Run only scripts verified to exist (build/test/lint/typecheck), plus timer background wake, Strict Mode cleanup, contention/409 scenarios, filter/sort, virtual scrolling if chosen, 375px accessibility and keyboard checks. Record exact commands, results, skipped checks, limitations; update README if authorized separately.  
**Output / acceptance:** Actual evidence-based verification report and clear outstanding risks; no invented pass count, Lighthouse score, commits or deployment. **Tests:** full unit + integration + manual verification matrix. **Risks:** toolchain absent, no server to validate distributed atomicity.  
**Git M12:** `docs(hw3): record verified results and limitations`.

## 2. Dependency overview

```text
T-01 → T-02 ┬→ T-03 → T-04 ──────────────┐
            ├→ T-05 → T-06 ──────────────┼→ T-07 ────┐
            └→ T-08 ──────→ T-09 ────────┼───────────┼→ T-10 → T-12
                                         └→ T-11 ────────────────→ T-12
```

`T-11` additionally requires `T-04`, `T-06` and `T-09`; `T-10` requires `T-07`, `T-08` and `T-09`. Phases B, C and D can proceed in parallel **after T-02** once their dependencies are met. Treat listed Conventional Commits as **future milestones**, not existing commits; never commit without authorization.

## 3. Project-level verification gates

1. **Evidence gate:** source files, existing tests, rules and repository state inspected before any implementation/reuse claim; resolve any mismatch with this provisional WBS.
2. **Behavior gate:** elapsed-time math and tab wake; one claim per action; correct 409 rollback; immutable accurate standings; correct kill-feed filters, order and optional virtual window.
3. **Accessibility gate:** semantic controls, keyboard navigation, readable status, sensible empty/error states, focus visibility and 375px layout.
4. **Audit gate:** ≥3 reproduced AI failures with actual evidence, not hypothetical examples.
5. **Handover gate:** record executed checks and explicit untested areas. No source files, dependencies, Git history or project rules may be modified by this planning-only task.
