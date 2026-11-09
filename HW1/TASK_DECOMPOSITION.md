# TASK_DECOMPOSITION.md — HW1: Production Studio Drum Kit

**Objective:** Evolve the existing vanilla-JavaScript Drum Kit into a seven-pad React studio with accessible keyboard/pointer interaction, visual hit history, an audio-level display, and verified WCAG 2.2 AA practices. **Targets:** Lighthouse Accessibility = 100 and Best Practices = 100 (targets, not presumed results).

**Baseline:** [`24520637/drum-kit-engine`](https://github.com/24520637/drum-kit-engine), default branch `main`, inspected 2026-11-09. This WBS replaces the previous nine-pad/FIFO-recorder task plan; it does **not** authorize application-code changes.

## 0. Verified baseline, constraints, and inheritance

| Existing item | Verified state | HW1 treatment |
|---|---|---|
| `js/audio-engine.js` | DOM-independent `AudioEngine`; `preload()`, `unlock()`, `play()`; decoded buffers; overlapping sources; capped voice count; failure handling. No explicit disposal API observed. | **REUSE / ADAPT** with minimal React-lifecycle integration and cleanup as needed. |
| `js/keyboard-controller.js` | Native `keydown`/`keyup`, `event.repeat`, dynamic `[data-key]` lookup, pointer handling, `.active` class. Uses `event.key`, direct DOM lookup, and does not isolate text inputs. | **REFACTOR** to React keyboard Hook and React-managed state using `event.code`. |
| `index.html` | Semantic `<main>`, section, native buttons, `<kbd>` and visible labels; nine pads; recorder transport buttons. | **REFACTOR** into seven React pads; preserve semantic/accessible patterns, remove out-of-scope transport UI. |
| `css/styles.css` | Responsive grid, hover/active/focus-visible indicators, keyboard-focusable buttons; existing desktop and narrow-screen rules. | **REUSE / ADAPT** for seven-pad responsive layout, accessibility and focus checks. |
| `js/main.js` | Wires audio, keyboard controller and beat recorder; preloads nine sounds at startup. | **REFACTOR** only the integration, replacing manual DOM wiring with React. |
| `js/beat-recorder.js` | FIFO timestamped recorder and timed replay. | **DO NOT CARRY OVER** recording/replay functionality; hit history is separate and simpler. |
| `assets/sounds/` | Nine files: `kick.wav`, `snare.wav`, `hi-hat.wav`, `tom.wav`, `clap.wav`, `crash.wav`, `ride.wav`, `floor-tom.wav`, `percussion.wav`. | **REUSE** seven existing suitable files, verify paths/decoding; do not assume assets are missing. |
| Tooling and tests | Root contains no inspected React/Vite configuration, package manifest or automated test suite; `test-audio.html` exists. | **NEW / ADAPT** modern build and focused verification, without guessing available commands. |

**PROJECT_RULE.md limitation:** No `PROJECT_RULE.md` was present in the inspected repository root. The supplied `LAB2_Exercises(10).zip` *does* contain `LAB2_Exercises/PROJECT_RULE.md`; its relevant conventions were reviewed: prefer `const`/`let`, semantic HTML, modern event APIs, safe text rendering (no HTML injection), no HTML inline handlers, modern bundling, keyboard/focus accessibility and WCAG verification. Its educational mini-React virtual-node implementation is **not** a production React dependency. If a project-specific rule file is later supplied, reconcile any differences before implementation.

**Lab 2 practices to inherit:** native control semantics, predictable event ownership and listener cleanup, state-driven updates, accessibility checks, clear separation of rendering from behaviors, and verifiable tests. New HW1 React behavior must use actual React (`props`, `useState`, `useEffect`), not the training `mini-react.js` implementation.

**Scope guard:** Exactly seven physical keys: `KeyW`, `KeyA`, `KeyS`, `KeyD`, `KeyJ`, `KeyK`, `KeyL`. Do not add recording, sequencing, mixing, key rebinding, extra pads, or unrelated features. Sound-name assignment is an explicit data decision during T-03; do not silently assume the old nine-key mapping transfers unchanged.

## 1. Dependency-ordered work breakdown

**Types:** `REUSE` = retain verified behavior/assets; `REFACTOR` = adapt existing implementation; `NEW` = requirement not supplied by the old app; `VERIFY` = evidence-focused task. Each task is small enough to review and test separately. Commit subjects below are **planned**, not executed.

### Phase A — Baseline and React foundation

| ID | Type | Task and dependency | Acceptance criteria / verification | Planned atomic commit |
|---|---|---|---|---|
| **T-01** | VERIFY | Baseline audit; **none** | Record exact legacy file/asset inventory, key mapping, current features and missing `PROJECT_RULE.md`. Confirm baseline audio and button behavior by an actual run when available; distinguish source inspection from runtime evidence. | `docs: audit inherited drum kit baseline` |
| **T-02** | REFACTOR | Establish React app shell while retaining original references; **T-01** | Working React entry point, root, and semantic main/heading; modern bundler configured using only necessary dependencies; legacy source/assets preserved until replacement passes tests; build succeeds. | `build: establish react drum kit shell` |
| **T-03** | REUSE / REFACTOR | Define seven-pad data model and sound mapping; **T-01, T-02** | Exactly seven unique IDs and `event.code` entries (`KeyW/A/S/D/J/K/L`); each has accessible name, visible label and an existing verified sound path. No duplicated mappings or hard-coded mappings in event handlers. | `refactor: define seven-pad sound contract` |

### Phase B — Semantic React UI and state

| ID | Type | Task and dependency | Acceptance criteria / verification | Planned atomic commit |
|---|---|---|---|---|
| **T-04** | REFACTOR | Build semantic `DrumKit` / `DrumPad` hierarchy; **T-02, T-03** | Exactly seven rendered native `<button type="button">` pads from data and props; visible key/sound labels; no unnecessary wrappers; accessible names; no recorder controls. Check DOM count and labels. | `refactor: render semantic seven-pad react UI` |
| **T-05** | NEW | Add predictable pad-hit and active-state model; **T-03, T-04** | A single hit pathway updates state for mouse/keyboard; active state and recent history update deterministically; independent rapid hits are preserved; bounded history prevents unbounded growth; pure state logic tested. | `feat: manage pad activation and hit state` |

### Phase C — Physical-key and pointer interaction

| ID | Type | Task and dependency | Acceptance criteria / verification | Planned atomic commit |
|---|---|---|---|---|
| **T-06** | REFACTOR | Implement `useDrumKeyboard` using `useEffect`; **T-03, T-05** | Registers **window** `keydown` and `keyup`; looks up `event.code` only; ignores `event.repeat`, unrelated codes, `INPUT`/`TEXTAREA`/`SELECT`, and composition/editable contexts where applicable; prevents default only for handled shortcuts; cleans up listeners. Test press, hold, release, rapid switches, input focus and effect remount. | `refactor: handle physical drum keys in react hook` |
| **T-07** | REFACTOR | Unify pad activation via mouse, touch and native button keyboard; **T-04–T-06** | Pointer/click and physical-key paths trigger the same hit callback exactly once per intended action; Enter/Space work via native buttons; no double fires, stuck states or keyboard-trap behavior. Test with keyboard and pointer. | `feat: unify accessible pad activation` |
| **T-08** | NEW | Expose accessible pad state; **T-05–T-07** | Pads expose `aria-pressed` as specified, synchronized with the designed active/pressed model; state resets appropriately on key release, cancellation or lost focus; pressed semantics are reviewed for a momentary instrument pad. Test accessibility tree and actual key interactions. | `a11y: expose consistent drum pad pressed state` |

### Phase D — Audio integration and accessible feedback

| ID | Type | Task and dependency | Acceptance criteria / verification | Planned atomic commit |
|---|---|---|---|---|
| **T-09** | REUSE / REFACTOR | Integrate existing `AudioEngine` with seven-pad model; **T-03, T-07** | Use verified original audio buffers and `preload`/`unlock`/`play` behavior; no autoplay; audio unlocked from genuine interaction; overlapping hits remain possible; missing/decode/play errors leave hit interaction intact; stop/release owned resources on unmount where appropriate. Test all seven sounds and failure cases. | `feat: connect retained audio engine to react pads` |
| **T-10** | NEW | Render visible and announced hit history; **T-05, T-07** | `<output aria-live="polite">` communicates meaningful recent hits and a visible readable history; updates are not excessively verbose; history does not depend on successful audio playback. Verify screen-reader announcement behavior and visual history order. | `a11y: add polite visual drum hit history` |
| **T-11** | NEW | Implement visual audio-level meter; **T-09** | Meter reacts to real playback signal or documented measured level, resets on silence and has an accessible textual equivalent; avoid calling arbitrary hit animation a calibrated decibel reading. Test changes on sound, silence, missing audio and reduced motion. | `feat: display accessible audio level meter` |

### Phase E — Accessibility and responsive hardening

| ID | Type | Task and dependency | Acceptance criteria / verification | Planned atomic commit |
|---|---|---|---|---|
| **T-12** | REUSE / REFACTOR | Apply responsive layout and visible focus; **T-04, T-08, T-10, T-11** | No horizontal overflow at 375px, 768px and desktop; readable pad labels; focus visible and not obscured; no reliance on color/sound alone; keyboard target sizes/spacing checked against applicable WCAG 2.2 AA criteria. | `a11y: polish responsive layout and focus styles` |
| **T-13** | VERIFY / REFACTOR | Review WCAG 2.2 AA interaction and announcements; **T-06–T-12** | Keyboard-only traversal, Enter/Space, focus order, no keyboard trap, input isolation, contrast, accessible names, pressed state, live region, and non-audio information all manually checked; fix only proven issues and document limitations. | `test: verify wcag keyboard and screen reader behavior` |

### Phase F — Testing, performance and handover

| ID | Type | Task and dependency | Acceptance criteria / verification | Planned atomic commit |
|---|---|---|---|---|
| **T-14** | VERIFY | Implement focused automated interaction/state tests; **T-05–T-11** | Tests cover seven mappings, unknown key, repeat guard, editable/input isolation, keyup/cleanup, mouse+keyboard hit parity, rapid hits, history order/bounds, audio failure resilience and meter fallback. Run with available approved test tooling; do not invent results. | `test: cover drum keyboard audio and state contracts` |
| **T-15** | VERIFY | Validate production build, browser behavior and Lighthouse; **T-12–T-14** | Run build and tests, check console/network, validate seven audio sources; audit Lighthouse Accessibility and Best Practices (goal **100 each**) in a recorded environment and rerun after justified fixes. Report measured scores, not assumed ones. | `perf: verify lighthouse and production readiness` |
| **T-16** | VERIFY | Final documentation and evidence review; **T-13–T-15** | README/handover records project setup, inherited modules, seven-key contract, known browser/IME constraints, verification commands, actual results, audit screenshots/reports, and outstanding deviations. Do not claim WCAG certification or Lighthouse 100 without supporting evidence. | `docs: record hw1 verification and handover` |

## 2. Critical dependency path

`T-01 → T-02 → T-03 → T-04 → T-05 → T-06/T-07 → T-09 → T-11 → T-12 → T-13/T-14 → T-15 → T-16`

- T-08 follows pad state and interaction; T-10 follows hits/state. Independent tests and documentation may be prepared alongside later phases, but acceptance must follow actual implementation.
- Complete **one task and its focused verification before its atomic commit**. Do not batch unrelated tasks into a single commit; do not commit automatically without authorization in an execution session.
- If the current project setup contradicts the WBS, record and resolve the discrepancy before implementing dependent tasks; avoid introducing scope expansion.

## 3. Minimum final verification matrix

| Test area | Required observable result |
|---|---|
| 7-pad data contract | Seven buttons, one for each `KeyW/KeyA/KeyS/KeyD/KeyJ/KeyK/KeyL`, all mapped to verified sound files. |
| Keyboard and IME | Correct physical-key triggers; no `keyCode`/`keypress`; no repeat flood; keyup resets state; test Vietnamese UniKey/composition. |
| Focus isolation | Shortcuts do not trigger while typing in INPUT/TEXTAREA/SELECT or editable content; normal Tab, Enter and Space functionality remains. |
| Audio reliability | No autoplay; audio starts only through user gesture; all seven samples play; overlap works; invalid/missing asset does not break UI/history; resources cleaned as applicable. |
| Accessible feedback | Native buttons and meaningful pressed state; visible hit history and polite output announcement; audio meter has usable text equivalent, including no-audio fallback. |
| Responsive and WCAG | 375px, 768px, desktop; visible keyboard focus; contrast checks; no trapping or color/sound-only instructions; manual screen-reader and keyboard testing. |
| Quality gate | Actual build/test commands and outcomes; Lighthouse Accessibility and Best Practices scores recorded with environment/configuration; target 100/100 individually, no fabricated passing results. |

**Definition of Done:** All in-scope tasks have verifiable evidence; original required audio behavior survives migration; seven-pad React UI, physical-key guardrails and accessible feedback work; known failures and score gaps are disclosed. Other Lighthouse categories may be measured for context but are not added as mandatory 100-point targets by this WBS.
