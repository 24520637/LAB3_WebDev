# TASK_DECOMPOSITION.md

# HW2 — 88-Key Polyphonic Piano & Concurrent FIFO Sequencer

**Status:** Planning only; no piano implementation verified.  
**Evidence base:** `LAB2_Exercises(20261109-134816).zip` (26 entries), inspected alongside the HW2 specification supplied in the conversation.  
**Scope:** New React-based HW2 piano, using verifiable concepts from the uploaded Lab 2 exercises, and conditionally reusing the separately referenced Lab 2 HW2 AudioTaskQueue if its source becomes available.  
**Rule:** A checkbox is NOT evidence of completion. Mark it only after the named validation succeeds.

## 1. Repository inspection and baseline

### 1.1 Actual uploaded layout

```text
LAB2_Exercises/
├── index.html
├── css/skeleton.css
├── js/
│   ├── app.js
│   ├── mini-react.js
│   ├── lifecycle-state.js
│   ├── load-data.js
│   ├── data-view.js
│   ├── checkpoint2-verify.js
│   └── test-runner.js
├── tests/
│   ├── createElement.test.js
│   ├── createTextElement.test.js
│   ├── renderToDOM.test.js
│   ├── stateCursor.test.js
│   ├── stateStore.test.js
│   ├── task-2-6-test.js
│   ├── task-2-9-test.js
│   ├── lifecycle-state.test.js
│   ├── load-data.test.js
│   └── data-view.test.js
├── PROJECT_RULE.md
├── DATA_LOADER_CONTRACT.md
├── FSM_CONTRACT.md
└── TASK_DECOMPOSITION.md  # Existing Lab 2 plan, not the HW2 plan
```

**Observed:** `index.html` starts the MiniReact Todo application and imports plain browser scripts. `js/app.js` defines `TodoApp`, replaces a DOM root with rendered VNodes, registers root click/input/submit delegation, and drives a separate simulated data-feed view. `js/mini-react.js` contains a custom VNode/DOM renderer, hook cursor/store and delegated event hub. `js/lifecycle-state.js` implements IDLE/LOADING/SUCCESS/ERROR transitions. `js/load-data.js` implements async request deduplication, AbortController disposal, and stale-request protection; `js/data-view.js` handles loading/success/error presentation. Tests include Node `node:test`/assert-style cases and a standalone browser test runner.

**Not observed in this upload:** `package.json`, Vite/React application, React `memo`/`useCallback`, piano keys, Web Audio synthesizer, melody recorder, polyphonic voice pool, `AudioTaskQueue`, audio tests, Slide 21 or Slide 27 source, or the separate Lab 2 HW2 project. The provided HW2 `PianoKey` and `PolyphonicSynth` snippets are **specification examples**, not evidence of existing code. No build or test execution is claimed in this planning deliverable.

### 1.2 Reuse decision matrix

| Lab 2 artifact/concept | Evidence | Reuse decision | HW2 adaptation |
|---|---|---|---|
| MiniReact VNode engine (`js/mini-react.js`) | Present | **Do not transplant** into React app | Use official React reconciliation and hooks instead; preserve original exercise unchanged |
| Todo/filter example (`js/app.js`) | Present | **Conceptual only** | State ownership, derived display state, clear event boundaries |
| Root event delegation | Present (`mini-react.js`) | **Conceptual only** | Use React synthetic events and explicit keyboard/pointer handlers; do not install the custom delegation hub |
| Lifecycle FSM (`js/lifecycle-state.js`, `FSM_CONTRACT.md`) | Present | **Pattern reuse; port only if appropriate** | Define replay/record state transitions independently; data-fetch states do not map directly to audio |
| Async loader (`js/load-data.js`) | Present | **Pattern reuse** | AbortController, request/run identity, duplicate-start guarding, idempotent `dispose` and no stale UI updates |
| Data view (`js/data-view.js`) | Present | **Conceptual only** | Status/error/empty-state UI; no data-loader DOM code in React |
| Node test patterns (`tests/*`) | Present | **Conceptual/fixtures** | Reuse assert and deterministic fake/deferred-promise practices; inspect new project's framework before adopting tooling |
| Lab 2 Slide 21 `memo` / shallow comparison | User-provided spec, not in upload | **React principle required** | React.memo + stable props/useCallback; measured in React Profiler |
| Legacy Slide 27 88-key piano | User-provided spec, not in upload | **Behavioral reference only** | Generate MIDI 21–108 algorithmically; do not assume source exists |
| Lab 2 HW2 concurrent FIFO `AudioTaskQueue` | Referenced, **source absent** | **Conditional reuse** | Obtain and audit actual source/API; adapt scheduling/cancellation without serializing overlapping notes; otherwise implement a focused new queue |

**Preservation:** Never overwrite `LAB2_Exercises/js/*`, its existing tests, or its original task plan. Keep HW2 in a separate React project/workspace. If the HW2 deliverable is later requested inside the provided repository, first obtain explicit approval of project location and migration approach.

## 2. Requirements and authoritative contracts

### 2.1 Product scope

- 88 notes exactly, MIDI **21 (A0)** through **108 (C8)** inclusive, **52 white + 36 black**, generated algorithmically (no hardcoded 88 JSX tags).
- Compute `freqHz = 440 * 2 ** ((midi - 69) / 12)`; note spelling via 12 pitch classes and octave `floor(midi / 12) - 1`.
- Render 88 individually memoized `PianoKey` components, with `midi`, `noteName`, `isBlack`, `isPressed`, `onNoteOn`, `onNoteOff` and stable keys.
- Use Web Audio oscillator/gain voices, up to eight **active** voices. On ninth **distinct** concurrent note, oldest active voice is stolen in FIFO insertion order using ES6 Map.
- Release envelope uses a short, safe ramp to a small positive gain (e.g., 0.0001 at `currentTime + 0.04` seconds) and schedules oscillator stop **after** release; handle audio exceptions and tails.
- Record `midi`, `freqHz`, `durationMs`, `deltaMs` in start-time/FIFO order and replay overlapping notes at 0.5×, 1×, 2×.
- Abort an active replay on Stop or unmount; cancel pending starts, terminate active sound, prevent stale updates and release owned resources.
- Real React DevTools Profiler evidence that pressing/releasing one key does not cause the other 87 `PianoKey` instances to re-render due to changed props (account for dev StrictMode and profiler semantics).

### 2.2 Key engineering distinctions

1. **Voice pool ≠ replay queue.** Voice pool allows up to eight simultaneous sounding notes; replay queue enforces chronological event order but MUST NOT await each note's completion before initiating the next note.
2. **Active voice cap ≠ instantaneous oscillator count.** A stolen voice with a 40-ms release tail may coexist temporarily with eight newly active notes. Explicitly define the cap as `voices.size <= 8` and track/reclaim releasing tails; if an eight-total-oscillator cap is required, choose and test a stricter policy.
3. **Map indexed by MIDI supports one active voice per pitch.** Decide/restrict retrigger semantics: repeated `noteOn(midi)` must be idempotent or safely retrigger after removing/releasing the prior voice; do not silently overwrite and leak a voice.
4. **Recording instances are separate from active MIDI keys.** Multiple occurrences of the same note each become distinct recorded events. Model held-note start timestamps and completed events separately.
5. **ADSR refers to Attack/Decay/Sustain/Release.** The specified 40-ms exponential release alone does not implement full ADSR; scope the attack/decay/sustain policy explicitly before calling it complete.
6. **AbortController is a cancellation signal, not automatic audio cleanup.** Timer promises, Web Audio nodes, active notes and React lifecycle must all cooperate.
7. **A memoized component can still re-render from its own changing props, state, or context.** Stable callbacks and note descriptors are required; report observed profiling results, not assumptions.

### 2.3 Nonfunctional constraints

- Use `const`/`let`; no `var`, `keypress`, `keyCode`, inline HTML handlers, unsanitized HTML insertion, or unsafe dynamic code.
- Semantic controls, visible keyboard focus, readable contrast, proper status feedback and applicable **WCAG 2.2 AA** manual + automated checks.
- No unapproved dependency installation; prefer existing new-project tools after inspection.
- Do not add unnecessary refactors, audio-file/network dependencies, background timers, or unrelated features.
- Do not fabricate tests, commits, profiler output, Lighthouse scores, or screenshots.

## 3. Planned architecture and dependency direction

**Proposed new-project paths (NOT present in upload):**

```text
hw2-polyphonic-piano/
├── package.json                   # establish only after checking target repository
├── index.html
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── audio/
│   │   ├── PolyphonicSynth.js
│   │   └── AudioTaskQueue.js      # adapter or new implementation; not supplied
│   ├── sequencer/
│   │   ├── MelodyRecorder.js
│   │   └── SequencePlayer.js
│   ├── components/
│   │   ├── PianoKeyboard.jsx
│   │   ├── PianoKey.jsx
│   │   └── SequencerControls.jsx
│   ├── hooks/
│   │   └── usePiano.js
│   ├── utils/
│   │   └── generatePianoKeys.js
│   └── styles/
│       └── piano.css
└── tests/                         # use tooling found/approved for new project
```

**Module responsibilities:**

| Module | Owns | Must not own |
|---|---|---|
| `generatePianoKeys` | Pure MIDI/frequency/pitch/color descriptors | React state, audio context |
| `PolyphonicSynth` | Lazy AudioContext, voices Map, envelopes, routing, note on/off, release-tail cleanup, disposal | DOM, recording timeline |
| `MelodyRecorder` | Recording lifecycle, `performance.now` timestamps, held-note map, ordered completed note events | Oscillators, React DOM |
| `AudioTaskQueue` / `SequencePlayer` | Single replay coordinator, event deadlines, abortable waits, run generation ID, overlapping note schedule and completion | Presentation, synthesizer voice internals |
| `PianoKey` | One accessible memoized key and its local interaction/pressed presentation | Global audio pool, queue scheduling |
| `PianoKeyboard` | Correct note placement, key list, input coordination, stable props | Timer/oscillator construction |
| `SequencerControls` | Record, play, stop, speed selection, status/disabled behavior | Audio scheduling algorithm |
| `usePiano` / `App` | Instance lifetime, state bridging, callbacks, record/replay controls, cleanup | Low-level sound synthesis |

**Data flow:**

```text
Pointer / keyboard → stable noteOn/noteOff commands → PolyphonicSynth
                                            └─────────→ MelodyRecorder
Recorded FIFO note events → SequencePlayer/Queue → Synth noteOn/noteOff
           Stop / unmount → AbortController + run token → stop voices / dispose
React state (per-MIDI pressed indicators, status) → 88 memoized PianoKey items
```

**Dependencies:** React + React DOM and a suitable build tool are mandatory for the `React.memo` requirement. Native Web Audio, AbortController, Map, performance.now and JavaScript timers require no audio library. Test/build dependencies must be selected only after inspecting the actual target React project; do not assume Vitest, Jest, Testing Library, jsdom or Playwright is installed. Browser/React DevTools Profiler is required for measured rendering evidence. A mockable clock and injectable audio-context factory improve deterministic tests without mocking away voice/queue logic.

## 4. Task decomposition (ordered WBS)

### PHASE A — Baseline and contracts

#### T-01 — Audit sources and decide project boundary
**Depends on:** none. **Type:** analysis/documentation.
- [ ] Inspect actual target HW2 repository when provided: branch, tree, package scripts, dependencies, React version, test framework and current functionality.
- [ ] Inspect actual Slide 21, Slide 27, and Lab 2 HW2 `AudioTaskQueue` sources **if supplied**; document version/API, semantics, tests and reuse risks. Never label them inspected until obtained.
- [ ] Record working baseline and nonregression features; distinguish verified present, referenced only, and missing.
- [ ] Select new project directory or approved integration location without changing Lab 2 app.
**Acceptance:** Evidence-based inventory, build/test command list, module reuse decisions and explicit missing-source caveat exist. No source changes.
**Verify:** Review path inventory against disk/repository; check no preexisting work was overwritten.

#### T-02 — Define domain, event, and concurrency contracts
**Depends on:** T-01. **Type:** design.
- [ ] Define MIDI schema/range, black pitch classes, frequency tolerance and key identity.
- [ ] Define active voice invariant (`size <= 8`), MIDI duplicate/retrigger policy, insertion-order semantics, release-tail ownership and disposal guarantees.
- [ ] Define recorder event format `{midi, freqHz, durationMs, deltaMs}`, monotonic timing, 0ms durations, chord overlaps, simultaneous ties, final note closing and immutable event ordering.
- [ ] Define replay states and permitted operations (e.g., IDLE, RECORDING, READY, PLAYING, STOPPING, ERROR) and Stop/Clear/Record/Replay conflict policy.
- [ ] Define one replay coordinator but concurrent scheduled voices, speed scaling, run IDs, abort signal and completion semantics.
- [ ] Decide input interaction model (pointer, keyboard focus/Enter/Space, optional mapped physical keys) and pressed-state ownership.
**Acceptance:** Named invariants/transition table and edge-case decisions agreed before code; no silent assumption that network FIFO player works unchanged.
**Verify:** Walk through ninth-note stealing, overlapping chord, Stop during delay, unmount during release, and repeated MIDI scenarios.

### PHASE B — React UI foundation

#### T-03 — Set up minimal React execution and testing baseline
**Depends on:** T-01, T-02. **Type:** setup; approval gate for new dependencies.
- [ ] Reuse existing target React/Vite configuration if available; otherwise propose minimum React/React DOM/Vite setup and request approval before installing dependencies.
- [ ] Keep original Lab 2 MiniReact Todo code untouched and independently runnable.
- [ ] Introduce semantic app landmarks, stable root and documented scripts; establish consistent module/test conventions.
- [ ] Confirm development server, build and existing test baseline with actual command outputs when implementation is authorized.
**Acceptance:** A reproducible target framework/test plan is identified, without uncontrolled dependency changes or regression to existing projects.
**Verify:** Inspect configuration, actual dev/build/test outputs (record once executed).

#### T-04 — Implement pure 88-note model
**Depends on:** T-02, T-03. **Type:** implementation.
- [ ] Generate 88 descriptors from `Array.from({ length: 88 }, (_, i) => i + 21)`; derive pitch class, octave, `isBlack` and frequency.
- [ ] Avoid hardcoded 88 tags, note lists, or manually copied frequency tables; ensure descriptors are stable/frozen or computed once.
- [ ] Define white-key positioning and the proper black-key overlay positions; avoid evenly spacing black keys as if white.
**Acceptance:** 88 unique ascending MIDI values 21..108, 52 white/36 black; A0 27.5 Hz, A4 440 Hz, C8 ≈4186.01 Hz; no extra or missing notes.
**Verify:** Pure unit tests for counts, endpoints, ordering, pitch classes, octave boundaries and frequency error tolerance.

#### T-05 — Implement semantic responsive keyboard presentation
**Depends on:** T-04. **Type:** implementation.
- [ ] Render one keyed `PianoKey` per descriptor inside `PianoKeyboard` with correct black-over-white layout and horizontal keyboard navigation/scroll strategy at 375px and desktop sizes.
- [ ] Use real `<button type="button">` with understandable accessible names including note/octave, `aria-pressed` when semantically appropriate, visible focus and readable labels where feasible.
- [ ] Handle pointerdown/up/cancel, blur, pointer leaving or lost capture, keyboard activation, and cleanup to avoid stuck notes; prevent duplicate pointer/click/keyboard activation.
- [ ] Make scrolling/touch behavior deliberate; do not silently block required touch gestures. Prevent focus loss and erroneous note release across controls.
**Acceptance:** 88 accessible interactive keys; correct relative geometry; all input paths initiate one note-on and one note-off per deliberate activation; no stuck keys; 375px works without page overflow.
**Verify:** DOM/interaction integration tests plus manual desktop/touch/keyboard checks.

### PHASE C — Audio and FIFO voices

#### T-06 — Implement Web Audio synthesizer lifecycle
**Depends on:** T-02, T-03, T-04. **Type:** implementation.
- [ ] Construct/lazily resume AudioContext on user gesture; handle absent, suspended or rejected audio context without crashing UI.
- [ ] Create oscillator/gain per active voice, route through a safe master gain, start and set frequency by descriptor; use conservative levels to reduce clipping (eight times 0.2 gain may still clip).
- [ ] Separate active voices from releasing tail nodes; disconnect and reclaim on `ended`/failure; make `dispose()` idempotent and guard calls after disposal.
- [ ] Implement note-off ramp with valid positive start value, `cancelScheduledValues`/`setValueAtTime` as needed, exponential fade to 0.0001 over ~40 ms, and deferred `osc.stop()`; avoid double stop/invalid state exceptions.
**Acceptance:** Single note audible in real browser; note-off reliably fades and stops; audio unsupported/failure behaves safely; no residual nodes or unhandled rejections after disposal.
**Verify:** Fake AudioContext structural tests and browser listening/cleanup tests; distinguish simulated from real audio validation.

#### T-07 — Enforce eight-voice Map FIFO stealing
**Depends on:** T-06. **Type:** implementation.
- [ ] Track active voices via insertion-ordered `Map<midi, voice>` and bound active size to 8.
- [ ] On ninth distinct note, select `voices.keys().next().value` and release/evict oldest active voice before adding new one; preserve order of surviving voices.
- [ ] Handle repeated same-MIDI note-on and note-off deterministically according to T-02; avoid stale release handlers removing a newer retriggered voice.
- [ ] Ensure both user chords and sequence replay obey one shared voice pool; cleanup release tails and avoid abrupt cuts unless explicitly required.
**Acceptance:** Eight distinct simultaneous notes remain active; ninth steals exactly oldest; tenth steals next oldest; release/retrigger does not corrupt Map or leak nodes.
**Verify:** Deterministic unit tests with observable start, release and stop effects and ordered assertions; real-browser eight/ninth-note manual test.

### PHASE D — Recording, replay, cancellation

#### T-08 — Implement FIFO melody recording
**Depends on:** T-02, T-04. **Type:** implementation.
- [ ] Record note-on start times using `performance.now()`; pair note-off by MIDI/input owner; calculate finite nonnegative durations.
- [ ] Materialize ordered `{midi,freqHz,durationMs,deltaMs}` events where `deltaMs` is the interval between consecutive note-on timestamps, not from each prior note's end.
- [ ] Support chords and overlapping holds, tie ordering, repeated notes after release, stop-recording with held notes, empty takes and clear/reset.
- [ ] Choose whether recording excludes sequence playback; prevent accidental feedback/re-record loops.
**Acceptance:** Recording C4/E4/G4 overlaps preserves start order and accurate durations/deltas; clear empties FIFO; same MIDI played twice yields two events.
**Verify:** Unit tests with injected monotonic clock and explicit expected event sequences; no wall-clock sleeps in deterministic tests.

#### T-09 — Adapt or implement abortable FIFO replay coordinator
**Depends on:** T-02, T-06, T-07, T-08; T-01 source audit for reuse. **Type:** implementation.
- [ ] If Lab 2 HW2 `AudioTaskQueue` source is provided, inspect its single-worker/cancel semantics and create an adapter only where compatible; otherwise build a small domain-specific `AudioTaskQueue`/`SequencePlayer`.
- [ ] Process note-on events in FIFO chronological order using cumulative delta deadlines relative to a playback epoch; schedule independent note-off deadlines so notes overlap.
- [ ] Apply 0.5×/1×/2× scaling to both deltas and durations; preserve temporal order and simultaneous note starts; avoid cumulative timer drift.
- [ ] Prevent duplicate Play actions from spawning multiple workers; maintain a run token/generation and one current AbortController.
- [ ] Define natural-completion result distinctly from cancellation and error; handle malformed recordings/speed inputs safely.
**Acceptance:** Multiple overlapping voices during one queued playback; correct order and scaled start/stop times; at most one logical replay coordinator; natural completion leaves no active replay notes.
**Verify:** Controlled-clock/deferred-promise tests for chronological order, chord overlaps, all speeds, duplicate Play, empty sequence and failure.

#### T-10 — Stop, cancellation, cleanup, and race safety
**Depends on:** T-09. **Type:** implementation.
- [ ] Stop calls `abort()` on pending operations; abortable waits detach listeners and reject/settle promptly; invalidate queued callbacks by run ID.
- [ ] Stop all sequence-owned active notes immediately (or initiate an explicitly bounded anti-click release); ensure no future note-on after Stop.
- [ ] Handle Stop twice, Stop before Play, stop during a delay, stop during a sounding chord, start-after-stop, and unmount during replay.
- [ ] Distinguish `AbortError` from real failures so deliberate Stop does not render false ERROR; prevent late callback/state updates after unmount.
- [ ] Dispose synth, recorder references, timers, listeners and audio-context resources at application teardown; do not silence unrelated input unexpectedly unless Stop contract explicitly requires global silence.
**Acceptance:** No new scheduled notes after Stop; all relevant voices fade/stop within documented release bounds; no leaked promises/listeners or updates after unmount; repeated calls safe.
**Verify:** Deterministic abort-race tests, resource counters and React mount/unmount integration tests.

### PHASE E — React performance and integrated controls

#### T-11 — Integrate stable React state and memoized key isolation
**Depends on:** T-05, T-06, T-07, T-08, T-09, T-10. **Type:** implementation.
- [ ] Wrap `PianoKey` with `React.memo`; ensure stable `midi`, `noteName`, `isBlack`, `onNoteOn`, `onNoteOff` props (`useCallback`/stable references).
- [ ] Keep long-lived synth/recorder/player instances in refs or equivalent stable ownership; avoid re-creating audio instances on every render.
- [ ] Update only affected MIDI pressed flags, including voice stealing, note-off and Stop; do not pass mutable global arrays or unstable inline callbacks to every key.
- [ ] Keep recording progress/status display outside the key subtree when possible; avoid time-driven top-level rerenders propagating through 88 keys.
**Acceptance:** Pressing or releasing one note changes only its key-specific props; a single-key action does not re-render all 88 key components in a measured React DevTools profiling run. Shared voice stealing may legitimately update both stolen and new key.
**Verify:** React integration tests with render counters (not substituted for Profiler), plus dated React DevTools Profiler screenshots/commit details on production-like build; explicitly label StrictMode effects.

#### T-12 — Implement sequencer controls and feedback
**Depends on:** T-08, T-09, T-10, T-11. **Type:** implementation.
- [ ] Provide labelled Record / Stop Recording / Play Sequence / Stop Sequence / Clear buttons and explicit speed selector (0.5× / 1× / 2×), wired to real lifecycle operations.
- [ ] Define appropriate disabled states and transitions (e.g. can't replay empty take; prevent double record/play; replay stop not confused with recording stop).
- [ ] Show recording count, replay state, speed and recoverable errors; announce meaningful changes through restrained `aria-live` status without per-note announcement spam.
- [ ] Preserve keyboard focus when controls transition; support keyboard activation and show audio-unlock/error feedback.
**Acceptance:** End-to-end user can record a chord/melody, stop recording, replay at each speed, interrupt replay and clear; no accidental duplicate sessions; meaningful textual status remains accessible without audio.
**Verify:** React Testing Library or existing compatible integration harness (if installed/approved), plus actual manual keyboard/screen-reader checks.

### PHASE F — Quality, audit and handover

#### T-13 — Comprehensive automated test coverage
**Depends on:** T-04 through T-12. **Type:** testing.
- [ ] **Unit:** MIDI generation, frequency math, 52/36 counts; recorder timing/order; voice FIFO eviction/retrigger; release/cleanup; replay timing/scaling, state transitions, error/cancel handling.
- [ ] **Integration:** pointer/keyboard note lifecycle, accessible key names, record→play→stop workflow, overlapping replay, duplicate-action isolation, Stop/unmount races and UI recovery.
- [ ] Favor deterministic fake clocks, deferred tasks and an instrumented AudioContext; verify meaningful observable effects, not just internal method invocation. Do not mock away FIFO behavior.
- [ ] Retain regression tests for any actually integrated Lab 2 code; do not report untouched Todo tests as piano coverage.
- [ ] Record real commands, environment, passed/failed/skipped totals, discovered issues and untested areas; do not fabricate test execution.
**Acceptance:** Every critical acceptance case has a named automated test or a documented manual-only reason; failing tests are fixed or disclosed; baseline regressions evaluated.
**Verify:** Execute available test suite once implementation is authorized; save actual output/logs.

#### T-14 — Accessibility audit: WCAG 2.2 AA
**Depends on:** T-05, T-12. **Type:** testing/audit.
- [ ] Semantic landmarks, headings, named 88 buttons, clear control labels, accurate `aria-pressed` state and no redundant accessible names.
- [ ] Keyboard-only operation, Enter/Space support, focus order and visible focus; assess burden of tabbing through 88 keys, with documented keyboard-navigation strategy (e.g. optional arrow navigation/roving tabindex if accessible and fully implemented).
- [ ] `pointercancel`/blur safety; touchscreen targets; responsive 375px/768px/desktop zoom at 200%/400% and no destructive horizontal overflow (keyboard region can scroll intentionally).
- [ ] Test contrast (4.5:1 normal text; 3:1 meaningful non-text boundaries/large text as applicable), accessible error/status updates, reduced motion if animations are added.
- [ ] Run automated axe/Lighthouse audits **if tooling available**, plus manual keyboard and screen-reader tests; identify applicable WCAG 2.2 AA criteria and gaps.
**Acceptance:** No known blocker preventing basic keyboard/screen-reader play and control use; audits documented, not claimed as blanket compliance from a score.
**Verify:** Test checklist and genuine screen-reader/manual evidence.

#### T-15 — Performance, audio quality, stress and memory hygiene
**Depends on:** T-06, T-07, T-09, T-10, T-11. **Type:** profiling/audit.
- [ ] Verify 88 keys generated only once or with stable descriptors; React Profiler demonstrates key render isolation under pressing, recording and replay state changes.
- [ ] Stress rapid 8/9/10-note input, repeated MIDI, long sequences, multiple Stop/Play cycles, 0.5×/2× replays, tab backgrounding and unmount mid-replay.
- [ ] Inspect AudioContext lifecycle, oscillators/gain disconnection, timers, abort listeners and heap/resource trends over repeated cycles.
- [ ] Listen for pops, clipping and stuck notes; adjust master gain and ramps without changing task requirements.
- [ ] Report actual performance metrics/environment and limitations; avoid invented thresholds or unverified Lighthouse scores.
**Acceptance:** Eight-active-voice invariant holds under stress, no persistent voice/timer/listener growth, replay cancellation bounded and responsive, no mass key re-render regression.
**Verify:** Profiler recordings, browser console/performance inspection, manual listening and stress test logs.

#### T-16 — Final verification and handover
**Depends on:** T-13, T-14, T-15. **Type:** documentation/review.
- [ ] Run actual build, tests and applicable audits, recording exact commands and unedited pass/fail/skip results.
- [ ] Verify all specification requirements and acceptance criteria with explicit test IDs/evidence paths; identify unresolved limitations.
- [ ] Confirm original Lab 2 app/working files preserved; inspect Git diff for scope and untracked artifacts.
- [ ] Document architecture, run instructions, browser support, user interaction and audio unlock requirements.
- [ ] Do not commit automatically; propose atomic commits only if user approves.
**Acceptance:** User can independently run, reproduce and evaluate the solution; all claims backed by actual evidence; no unrelated changes or unverified completion checkmarks.
**Verify:** Final audit against requirement traceability table below and working-tree diff.

## 5. Requirements-to-task traceability

| Requirement | Primary tasks | Required evidence |
|---|---|---|
| 88 A0..C8 keys; 52/36 counts; math formula | T-04, T-05 | Data unit tests + rendered DOM count |
| Correct black/white geometry | T-05, T-14 | 375px/desktop screenshots, interaction check |
| 8-voice chord + oldest FIFO stealing | T-06, T-07 | Instrumented audio test + manual sound |
| Click-free release/ADSR and safe cleanup | T-06, T-07, T-15 | Envelope automation assertions + listening |
| FIFO record `midi/freqHz/durationMs/deltaMs` | T-08 | Deterministic clock tests |
| Concurrent replay at 0.5×/1×/2× | T-09 | Timed event-order/overlap tests |
| Stop/unmount AbortController cancellation | T-10 | Cancellation race/resource tests |
| React.memo per-key isolation | T-11, T-15 | Real React DevTools Profiler evidence |
| Keyboard/touch/screen-reader accessibility | T-05, T-12, T-14 | Manual + automated accessibility audit |
| Preserve verified Lab 2 behavior | T-01, T-03, T-16 | Original project diff + applicable regression run |
| Build/test deliverables without invented results | T-13, T-16 | Exact command logs and limitation summary |

## 6. Gate checks, dependencies and risks

**Critical path:** T-01 → T-02 → T-03 → T-04 → T-05/T-06 → T-07/T-08 → T-09 → T-10 → T-11 → T-12 → T-13/T-14/T-15 → T-16.

**Parallelizable:** After T-04, UI geometry (T-05), synth (T-06) and recorder (T-08) can proceed independently, subject to agreed event contracts. The queue (T-09) depends on synth and recording. Accessibility design begins early; final audit follows integration.

**Explicit blockers/gates:**

- The uploaded repository is **not** the HW2 React project; project scaffolding location and dependencies require confirmation/inspection before implementation.
- The previously implemented Lab 2 HW2 FIFO `AudioTaskQueue` is not supplied; direct code reuse is unverified and **must not be represented as complete**.
- Web Audio APIs and real React Profiler measurement require a browser; Node-only unit tests cannot establish audible quality or all UI performance claims.
- Pointer events, keyboard events, retrigger policy, speed changes during replay, ownership of manually held notes during Stop, and overall voice-vs-tail cap must be agreed in T-02 to prevent conflicting implementations.
- Exponential gain ramps require positive gain values; `osc.stop()` and audio-context resumes may throw/deny depending on lifecycle. Cleanup and failure behavior must be tested.
- Floating-point time and browser timer throttling require deadline-based scheduling and an explicit tolerance policy rather than assuming perfect wall-clock timing.

## 7. Definition of Done (DoD)

- [ ] All **88** keys appear in correct A0–C8 order and geometry with verified 52/36 split and validated frequency mapping.
- [ ] Eight-note chord and FIFO ninth-note stealing work, including deterministic Map and cleanup tests.
- [ ] Voices release without avoidable pops; errors, context suspension and teardown handled; no stuck/releasing voice leaks.
- [ ] Recorded events preserve MIDI/frequency, accurate FIFO start deltas, held durations and overlaps.
- [ ] Replay supports **0.5× / 1× / 2×** and overlaps notes; Stop/unmount cancel pending actions and silence relevant voices.
- [ ] Memoized 88-key components meet measured single-key render-isolation requirement in React DevTools Profiler.
- [ ] Pointer/keyboard input, focus, accessible names, status and responsive presentation satisfy documented WCAG 2.2 AA checks.
- [ ] Unit/integration suites, real-browser tests, build and quality audits have **actual recorded results**; failures/skips/limitations disclosed.
- [ ] Original uploaded Lab 2 exercises remain intact and regression checks are documented where applicable.
- [ ] No unapproved dependencies, no unrelated functionality, no fabricated evidence and no automatic commits.

---

**Documentation provenance:** This plan is based on source inspection of the uploaded `LAB2_Exercises` archive and the HW2 specification provided by the user. It is intentionally a future-work decomposition, **not** a claim that any HW2 features have been implemented or tested. The separately referenced Lab 2 HW2 audio queue must be supplied and audited before a true source-level reuse plan can be finalized.
