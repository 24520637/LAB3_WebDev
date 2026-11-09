# HW2 — AI Failure Audit

Reviewed 2026-11-09 after importing `HW2_PhaseB_React_88Key_Piano.zip`.
Only confirmed application behavior findings are recorded below. The user
subsequently supplied the implementation prompt recorded in Findings 01 and 02.
This records the user's attribution; it does not establish that the prompt
itself is technically incorrect.
The initial Phase B audit did not correct the source. The subsequent Phase C
import and retest are recorded separately below.

## Failure 01 — Click-only activation does not reach the piano note handlers

**Severity:** High for users whose activation produces only a click event.

**Implementation prompt identified by the user:**

```text
Implement the React foundation and generate the 88-key piano according to TASK_DECOMPOSITION.md, Phase B - React Foundation & 88-Key Piano
Use algorithmic MIDI-based key generation.
Do not hardcode individual key elements or frequencies.
Add focused tests for the generated keyboard.
```

**Affected component:** `src/components/PianoKey.jsx`, `PianoKey`.

### Original Phase B code and cause

The native button has pointerdown/up and keydown/up handlers, but no onClick
handler. Its keydown/up handlers also prevent browser-default activation.
A click event without those preceding input events has no application handler.

### Reproduction and actual evidence

A temporary browser probe imported the actual `/src/main.jsx`. Its diagnostic
button invoked the existing A0 DOM button's `.click()`. A MutationObserver
recorded changes to the app's existing `aria-pressed` attributes, and a plain
diagnostic read the rendered status. No component, state logic or callback was
replaced. This is a DOM click-only simulation, not a real screen-reader test.

1. Start with no pressed notes.
2. Invoke `document.querySelector('button[data-midi="21"]').click()`.
3. Compare with an ordinary pointer click on the same A0 key.

Observed in the in-app browser:

```text
Click-only A0:
  pressed: 0
  status: "No keys pressed."
  changes: []

Ordinary pointer click on A0:
  pressed: 0 after release
  changes: false -> true -> false
```

Source inspection confirms the click-only path cannot call onNoteOn/onNoteOff.
The ordinary pointer control proves the real app is mounted and responsive.

### Impact and proposed correction

An assistive-technology activation path that dispatches only click cannot use
the note control. Actual speech, assistive-technology behavior and a formal
WCAG conformance verdict have not been verified.

Add a momentary click-only activation path through the shared note commands,
with deduplication against pointer/keyboard activations and appropriate brief
feedback. Preserve hold/release operation; do not turn the key into a toggle.
Add integration coverage for click-only, pointer and native keyboard paths.

### Phase C import and retest — 2026-11-09

`HW2_PhaseC_Updated.zip` adds `onClick`, a 120 ms click-only pulse, and a
per-key input controller. The original clean-state click-only failure is
repaired. In a probe importing the actual App, A0 `.click()` produced two
aria-pressed mutations (false -> true -> false), and requestAnimationFrame
observed the pressed state in one rendered frame. Actual screen-reader speech
was not tested. A distinct post-lost-capture regression was found later;
Failure 03 below records its original evidence and subsequent repair.

## Failure 02 — An unrelated activation-key release stops the held note

**Severity:** Medium.

**Implementation prompt identified by the user:**

```text
Implement the React foundation and generate the 88-key piano according to TASK_DECOMPOSITION.md, Phase B - React Foundation & 88-Key Piano
Use algorithmic MIDI-based key generation.
Do not hardcode individual key elements or frequencies.
Add focused tests for the generated keyboard.
```

**Affected component:** `src/components/PianoKey.jsx`, `handleKeyUp`/`heldRef`.

### Original Phase B code and cause

```js
function handleKeyUp(event) {
  if (event.key !== ' ' && event.key !== 'Enter') return;
  event.preventDefault();
  release();
}
```

`heldRef` records only a boolean. The component does not remember which
activation key owns the hold, so either Enter or Space keyup releases it.

### Reproduction and actual evidence

Using the same probe and actual App:

1. Dispatch a bubbling/cancelable Space keydown to A0, without a Space keyup.
2. Observe the active key and status.
3. Dispatch an Enter keyup to A0, without ever pressing Enter.

Observed:

```text
Space down:       pressed: 1; status: "1 key pressed."
Enter up:         pressed: 0; status: "No keys pressed."
Space up:         not yet dispatched when the incorrect release was observed.
```

The probe used real DOM KeyboardEvent dispatch into the actual React handlers.
It did not simulate hardware key holding or an operating-system IME.

### Impact and proposed correction

The original Space hold can be interrupted by another activation key's
release. When audio is connected later, this path can cause premature note-off.

Track the accepted activation key/input owner and release only for its matching
keyup. Clear ownership on blur/cancel. Ignored secondary activations must not
release another owner's note. Cover overlapping Enter/Space and mixed
pointer/keyboard ownership with integration tests.

### Phase C import and retest — 2026-11-09

The imported controller tracks held activation keys in a Set and releases
only the matching key. Repeating the original DOM-event reproduction on the
actual App gave: Space down -> pressed 1; unrelated Enter up -> pressed 1;
Space up -> pressed 0. The original wrong-keyup failure is repaired in this
retest. The supplied controller unit tests also cover overlapping Space/Enter
holds in both orders; those are unit tests, not a hardware-keyboard recording.

## Verification limits

- At the initial Phase B check, the six supplied model unit tests passed; they do not mount React or test
  input events, and therefore do not detect these findings. Production build
  passed too.
- Native Space produced one false -> true -> false transition. A dispatched
  window blur cleared a held note; a new synthetic Space down worked afterward.
- No screen-reader speech, hardware multitouch, OS focus-switch/IME test or
  React DevTools Profiler evidence is claimed.
- The temporary probes were removed after testing. Reproduction snippets above
  describe the event inputs and observed DOM output, not a claim that Chrome
  DevTools was used for the original run.
- Findings 01 and 02 are the original Phase B findings. Missing audio,
  recording or replay is declared scope, not an additional bug.

## Failure 03 — Stale pointer-click suppression discards an independent click

**Reviewed:** 2026-11-09, after importing `HW2_PhaseC_Updated.zip`.

**Severity:** Medium.

**Implementation prompt identified by the user:**

```text
Implement Phase C – Piano Interaction & Memoization , piano key interactions and memoization.
Use React.memo for individual piano keys.
Ensure that interacting with one key does not unnecessarily
re-render all 88 keys.
Support reliable pointer and keyboard interactions.
Verify the result with React Profiler.
```

The user supplied this as the related Phase C implementation prompt. The
finding concerns the generated input implementation; it does not establish
that the prompt itself is technically incorrect.

**Affected files:** `src/components/pianoKeyInteraction.js` and
`src/components/PianoKey.jsx` (`onLostPointerCapture` / `handleClick`).

### Original code and cause

```js
pointerDown(pointerId) {
  // ...
  suppressPointerClick = true;
  sync();
}
pointerUp(pointerId) {
  if (!pointers.delete(pointerId)) return false;
  sync();
  return true;
}
clickDown() {
  if (suppressPointerClick) {
    suppressPointerClick = false;
    return false;
  }
  // ...
}
```

`onLostPointerCapture` calls `handlePointerEnd`, which calls `pointerUp`.
This releases the note but does not clear or qualify the suppression marker.
If that pointer interaction ends without a matching click, the next independent
click-only activation is incorrectly consumed as the old pointer's click.
`handleClick` does not inspect the current click's origin/detail.

### Reproduction and actual browser evidence

A temporary diagnostic page imported the actual `/src/main.jsx` and observed
the real App's DOM; no component or callback was substituted. The pointer
events below were synthetic DOM events, not a physical capture-loss recording.
The component's existing catch handles capture being unavailable for the
synthetic pointer ID; its actual state/event handlers still run.

1. Dispatch a bubbling primary-touch pointerdown with ID 101 to A0.
2. Dispatch bubbling lostpointercapture with that ID; do not dispatch click.
3. Invoke the existing A0 DOM button's `.click()` once.
4. Invoke `.click()` again as a positive control.

Actual diagnostic readings, including four earlier known-good transitions:

```text
pointerdown:                  pressed 1
lostpointercapture:            pressed 0; transitionCount 6
first independent .click():   pressed 0; transitionCount 6
second independent .click():  pressed 0 after pulse; transitionCount 8
```

The first click caused no new aria-pressed transitions. The second generated
the expected on/off pulse; the rendered-frame observer also saw it pressed.
Ordinary pointer and native Space/Enter checks each produced exactly two
mutations, confirming the issue is the stale marker after this interrupted
pointer sequence, not a general inability to operate the app.

### Impact and smallest proposed correction

An independent programmatic/assistive click can be silently dropped after an
interrupted pointer interaction. No actual screen-reader behavior is claimed.

Distinguish the current pointer-originated click from an independent click-only
activation, using current event metadata and explicit ownership/expiry of any
deduplication marker. Do not simply clear suppression on every lost-capture
event: normal pointer completion may also lose capture before its click, and
that change could reintroduce duplicate note activation. Add a regression for
pointer interruption -> independent click, while retaining normal pointer
deduplication and click-only pulse tests. This finding was documented without
changing the imported application code.

### Verification before the repair

The Phase C suite passed 17 tests (6 note-model, 9 controller, 2 synthetic
memo-prop contract checks), with 0 failed and 0 skipped; build passed. The suite
does not mount App or cover this interrupted-pointer/click-only sequence.
React DevTools Profiler, actual screen-reader speech, physical multitouch and
hardware focus/capture loss remain unverified. There are three distinct
recorded findings: the original Phase B paths in 01/02 were repaired in the
Phase C import; 03 remained open at that stage. No assignment-completion or WCAG certification
claim follows from these counts.

Viewport checks on the imported actual App used iframe browsing contexts:
document clientWidth/scrollWidth were 375/375, 768/768 and 1280/1280. Keyboard
client/scroll widths were respectively 336/1668, 707/1876 and 1113/1876;
horizontal scrolling remained inside the keyboard region. These are browser
viewport measurements, not physical device tests. The two memo-prop tests
construct independent prop records and do not measure actual React renders.

### Repair and regression retest — 2026-11-09

**Status:** Repaired and regression-tested. See Git history for the commit
containing this repair and audit update.

The current controller no longer retains `suppressPointerClick` or consumes
the next click after a pointer interaction. `PianoKey.handleClick(event)` passes
the current event's `detail` and `nativeEvent.pointerId` to `clickDown`.
The controller rejects pointer-origin clicks (`detail > 0` or a nonnegative
pointer ID), because pointerdown/up already handled that activation. An
independent click-only event remains eligible for the existing 120 ms pulse.
No suppression marker needs to survive capture loss or cancellation.
`onPointerCancel` and `onLostPointerCapture` still release their pointer owner
through `handlePointerEnd`.

```js
clickDown({ detail = 0, pointerId = -1 } = {}) {
  if (detail > 0 || pointerId >= 0) return false;
  if (active) return false;
  clickHeld = true;
  sync();
  return true;
}
```

Regression coverage in `tests/pianoKeyInteraction.test.mjs` now includes an
interrupted pointer followed by the first independent click, and pointer click
metadata deduplication without persistent suppression. These verify observable
on/off callbacks and held state; they are controller unit tests, not mounted
React integration tests.

Actual commands executed after the repair:

- `npm test`: **19 passed, 0 failed, 0 skipped** (6 note-model, 11 controller,
  2 synthetic memo-prop contract tests).
- `npm run build`: **passed**, 20 modules transformed.

A temporary browser diagnostic imported the real `/src/main.jsx`, including
its StrictMode wrapper. It observed the existing A0 button's `aria-pressed`
attribute without substituting components, callbacks or state. Both interrupted
pointer cases produced the following readings:

| Input / observation | `aria-pressed` | Cumulative transitions |
| --- | --- | --- |
| Synthetic touch pointerdown, ID 101 | true | 1 |
| Synthetic lostpointercapture (separate run: pointercancel) | false | 2 |
| First independent `.click()`, sampled during its pulse | true | 3 |
| After the pulse completes | false | 4 |

Ordinary browser pointer click, native Space and native Enter each produced
exactly `false -> true -> false`, with no duplicate pulse. Browser warning/error
logs were empty. The temporary diagnostic was removed after testing.

The interruption events were synthetic DOM events. Physical capture loss,
hardware multitouch and actual screen-reader activation/speech remain
unverified. All three recorded findings have repaired paths with the retest
evidence described above; this does not imply full assignment or WCAG
conformance.

## Phase D archive import and verification — 2026-11-09

Imported application/test code from `HW2_PhaseD_Polyphonic_Synth_Recorder.zip`:
`src/App.jsx`, `src/components/PianoKeyboard.jsx`, `src/styles/piano.css`,
`src/audio/PolyphonicSynth.js`, `src/sequencer/MelodyRecorder.js`,
`tests/polyphonicSynth.test.mjs` and `tests/melodyRecorder.test.mjs`.
Dependencies and lockfile were identical; no dependencies were installed.
The archive's `README_PHASE_D.md` and `PHASE_D_VERIFICATION.md` were not added,
in accordance with the user's instruction to update only this audit document.
The repaired PianoKey/controller and prior regression tests were identical to
the archive versions and were preserved. No further application fixes were
made during this import and verification.

### Automated checks actually executed

- `npm test`: **27 passed, 0 failed, 0 skipped**. These are Node unit/contract
  tests: 6 note-model, 11 input-controller, 2 synthetic memo-prop, 4 recorder
  and 4 synthesizer tests. Synth tests use an instrumented fake AudioContext;
  recorder tests use an injected clock. They do not establish audible quality
  or mount the React application.
- `npm run build`: **passed**, 22 modules transformed.

### Browser checks actually executed

A temporary diagnostic mounted the actual App under React StrictMode with
the existing stylesheet. Native Web Audio was retained; wrappers observed
context construction, oscillator starts/stops/disconnects, and a passive
analyser sampled the master signal. Additional controls dispatched synthetic
pointer events into the existing piano buttons; no component or note callback
was replaced. Browser controls were activated through user-input automation.

- After mount and a diagnostic sample without playing a key: **0 contexts,
  0 oscillators**; no autoplay was observed in this path.
- Synthetic holds for MIDI 60–68: one running context, nine oscillator starts,
  and pressed MIDI **61–68** after FIFO stealing of MIDI 60. The old oscillator
  received a scheduled release. A later held-chord sample measured nonzero
  master RMS (approximately **0.158**, linear amplitude, not dB).
- Start recording -> hold those nine notes -> release -> Stop recording:
  the actual table contained **9 rows in MIDI 60–68 onset order**, with
  frequencies and measured durations/deltas. The stolen C4 entry ended early;
  the other eight entries retained overlapping durations. Exact recorder
  arithmetic and out-of-order releases were covered by the fake-clock tests.
- Release and dispatched window blur returned pressed state to zero. Across
  two chord runs, all **18** observed oscillators ended and disconnected;
  the post-blur analyser sample was zero.
- Clear recording removed the table and displayed `0 notes recorded.`.
  Native Space and Enter on A4 completed without a stuck pressed key.
- Unmount after ordinary use closed the one context and disconnected all
  **20** observed oscillators. A separate run unmounted with eight keys still
  active: the context closed, App keys were removed, and all **10** observed
  oscillator nodes disconnected (including a deliberately failed start).
- Explicit fault injection simulated unavailable AudioContext construction
  and oscillator-start failure. Each produced the existing accessible alert
  and left no pressed key after release. Removing the injected fault allowed
  later interaction to succeed and cleared the alert; the latter run held
  eight keys before unmount. This is injected failure testing, not a real
  operating-system device failure.
- The initial normal browser run's warning/error log was empty.

No new application defect was confirmed by these checks. The temporary browser
diagnostic was removed; it is not an additional deliverable or a permanent
automated integration test. No Phase D generation prompt has been supplied,
and none is invented here.

### Limits and remaining scope

Real speaker/headphone listening, pops/clipping, hardware multitouch, actual
screen-reader behavior, OS focus switching, asynchronous resume rejection,
long-running resource growth and React DevTools Profiler remain unverified.
Nonzero analyser output proves a generated signal, not sound quality at the
physical output device. Phase D responsive layout was not re-audited at mobile
and tablet viewports. Playback, speed selection and AudioTaskQueue are absent
from this archive and were not tested or represented as implemented.

## Failure 04 — Browser timer receiver prevents sequence playback

**Reviewed:** 2026-11-09 after importing
`HW2_PhaseE_FIFO_Sequencer_Playback.zip`.

**Severity:** High — the tested recorded sequence cannot be replayed at any
supported speed.

**Related generation prompt supplied by the user:**

```text
Phase E - FIFO Sequencer & Playback, Read TASK_DECOMPOSITION.md , Implement the concurrent FIFO sequencer.
Replay recorded notes in FIFO order at 0.5x, 1x, and 2x speed.
Preserve the original timing and overlapping notes.
Use one playback coordinator.
Do not serialize overlapping notes into sequential playback.
```

This records the user's attribution to the generated implementation; it does
not establish that the prompt itself is technically incorrect.

**Affected file:** `src/sequencer/SequencePlayer.js`, constructor and
`processStarts` (line 121 in the imported file); related timer calls also use
the same stored functions.

### Original code and cause

```js
constructor({ synth, now = () => performance.now(), setTimer = setTimeout,
  clearTimer = clearTimeout, /* ... */ } = {}) {
  // ...
  this.setTimer = setTimer;
  this.clearTimer = clearTimer;
}
// ...
run.nextTimer = this.setTimer(processStarts,
  Math.max(0, run.epoch + notes[run.index].onset - this.now()));
```

The default browser Window timer is stored unchanged and invoked as a
SequencePlayer method. In the tested browser its receiver is the player,
rather than Window; the call throws `TypeError: Illegal invocation`.
The supplied sequence tests inject ordinary fake timer functions, which do
not enforce the browser receiver and therefore do not detect this defect.
This is an application-code integration error, not a dependency, startup or
verification-script failure.

### Reproduction and actual browser evidence

1. Open HW2, Start recording, and play/release C4, E4 and G4 with overlapping
   durations and a nonzero initial delay. Stop recording.
2. Select 1× and press Play sequence.
3. Repeat with 0.5× and 2×.

A temporary diagnostic mounted the unchanged actual App with StrictMode and
the existing stylesheet. It retained native Web Audio and delegated to the
original synth/player methods, observing their returns and completion promise.
A genuine diagnostic-button activation started a timed synthetic-pointer
recording through the existing React controls; playback used the real Play
sequence button. The recorded table contained:

| Note | MIDI | Frequency (Hz) | Duration (ms) | Delta (ms) |
| --- | --- | --- | --- | --- |
| C4 | 60 | 261.63 | 1509 | 205 |
| E4 | 64 | 329.63 | 403 | 207 |
| G4 | 67 | 392.00 | 343 | 102 |

Two 1× runs and one run at each other speed all finished with `status: error`,
before any playback note-on was observed. The completion error included:

```text
TypeError: Illegal invocation
    at processStarts (.../src/sequencer/SequencePlayer.js:121:27)
    at SequencePlayer.play (.../src/sequencer/SequencePlayer.js:128:3)
```

The UI displayed `3 notes recorded. Playback: error.` and the accessible alert
`The sequence could not be played.`. Stop sequence was disabled after the
failure. The diagnostic observed one running context, no owned/pressed notes
after failure, and a disposed synth with no voices after App unmount.
The temporary diagnostic was removed after verification.

### Smallest proposed correction

Wrap default timer operations in functions that call
`globalThis.setTimeout(callback, delay)` and `globalThis.clearTimeout(handle)`
with the correct global receiver, while preserving injected timer support.
Do not change FIFO/overlap scheduling merely to bypass this exception.
Retest real-browser playback at all speeds, Stop before/while notes play,
repeated Play, and unmount during active playback; retain deterministic timing
tests and add browser integration coverage for the default timers.

### Repair and regression retest — 2026-11-09

**Status:** Repaired and verified. See Git history for the commit containing
the timer repair, regression test and this audit update.
The original import/test task left the source unchanged; the user then
explicitly requested this repair and provided the prompt above.

The constructor now wraps only its default timer operations:

```js
setTimer = (callback, delay) => globalThis.setTimeout(callback, delay),
clearTimer = (handle) => globalThis.clearTimeout(handle),
```

The wrappers invoke browser timers with the global receiver. Injected timers,
FIFO ordering, scaled deadlines, overlapping releases, AbortController and
the single playback coordinator remain unchanged.

The new regression test exercises the production default timer path, without
passing injected timers to SequencePlayer. Its controlled global timer
functions reject a receiver other than globalThis, reproducing the relevant
browser constraint. It verifies delayed note-on/off completion, then Stop of
a pending run, cancellation and the absence of an extra note start. This is a
deterministic unit regression; the real-browser retest below is separate.

- `npm test`: **37 passed, 0 failed, 0 skipped**.
- `npm run build`: **passed**, 23 modules transformed.

The actual App/StrictMode browser diagnostic was repeated with native browser
timers and Web Audio, using the same method described above. A new recorded
sample contained C4 (duration 1418 ms, initial delta 698 ms), E4 (duration
402 ms, delta 115 ms), and G4 (duration 351 ms, delta 96 ms), rounded for display.
The expected last deadline at 1× was therefore approximately 2116 ms.

| Speed | Approximate expected completion | Measured completion | Result |
| --- | --- | --- | --- |
| 0.5× | 4232 ms | 4243 ms | completed |
| 1× | 2116 ms | 2125 ms | completed |
| 2× | 1058 ms | 1063 ms | completed |

All three runs started C4, E4 and G4 in FIFO onset order, with all three starts
before the first note-off. E4/G4 ended while the longer C4 remained active.
The logs therefore demonstrate overlapping playback rather than serialized
notes. Small differences reflect the observed browser timer scheduling; no
sample-accurate or background-tab timing guarantee is claimed.

Additional actual browser checks:

- Stop before the first delayed note: stopped at approximately 311 ms;
  no playback note started, including on a later diagnostic read past the
  original sequence deadline.
- Stop while C4/E4 were active: both received note-off, G4 did not start,
  and voice/pressed counts returned to zero.
- Repeated separate Play runs after completion and Stop succeeded, using one
  observed AudioContext. Duplicate concurrent Play remains covered by its
  existing unit test, not a new browser assertion.
- Unmount during active three-note playback: playback resolved as stopped,
  all owned notes were released, the synth became disposed and the observed
  native AudioContext reached closed. A later diagnostic read showed no new
  starts after Stop/unmount. Browser warning/error logs were empty.

The temporary diagnostic was removed. Physical listening, screen-reader speech,
hardware multitouch, background timer throttling, manual-versus-replay pitch
ownership and React DevTools Profiler remain outside this retest. The default
browser timer defect is repaired; these results are not full assignment or
WCAG conformance evidence.

## Phase E import verification before the timer repair — 2026-11-09

- Imported four changed code/test files: `src/App.jsx`,
  `src/styles/piano.css`, `src/sequencer/SequencePlayer.js` and
  `tests/sequencePlayer.test.mjs`. Dependencies, lockfile and previously
  repaired input modules were unchanged; no install was performed.
- Preserved this audit and the project rules/task plan. Did not add the ZIP's
  Phase D/E verification documents or README, per the user's no-new-document
  instruction.
- `npm test`: **36 passed, 0 failed, 0 skipped**. This includes nine new
  sequence unit tests using a fake synth and deterministic timers: three speed
  cases, duplicate Play, Stop, same-MIDI replacement, invalid input, empty/
  dispose, and external voice ownership. These are not App integration tests.
- `npm run build`: **passed**, 23 modules transformed.
- Browser recording and table creation: passed for the three-note sample above.
  Browser playback at 0.5×, 1× and 2×: **failed**, as recorded in Failure 04.
- Stop during successful playback, audible overlap/speed accuracy, repeated
  successful Play, unmount during active playback and manual-versus-sequence
  note ownership remain **unverified** because the default timer path fails
  before playback starts. Node unit passes are not evidence these browser
  workflows work.
- Physical listening, screen-reader speech, React DevTools Profiler and a new
  responsive/accessibility audit were not performed in this Phase E check.

## Phase F cancellation/cleanup import and verification — 2026-11-09

Imported three changed files from
`HW2_PhaseF_Cancellation_Cleanup_Verification (2).zip`:
`src/App.jsx`, `src/sequencer/SequencePlayer.js` and
`tests/sequencePlayer.test.mjs`. The existing audit, project rules/task plan,
repaired browser timer defaults and input regression tests were preserved.
Dependencies/lockfile were unchanged; no install was needed. The ZIP's
`PHASE_F_VERIFICATION.md` and `verification/*.txt` were not copied into HW2;
results below come from this run, not supplied logs. No new document was added.

### Automated checks actually executed

- `npm test`: **42 passed, 0 failed, 0 skipped**. Five new sequencer tests
  cover AbortSignal/one-time settlement, stale callbacks after Stop, restart
  isolation, repeated disposal during a chord and normal-completion cleanup.
  These use fake clocks/timers/synths; they do not mount React or prove physical
  audio output. The existing default browser-timer receiver regression passed.
- `npm run build`: **passed**, 23 modules transformed.

### Actual browser checks

A temporary diagnostic mounted the imported actual App under StrictMode with
its existing stylesheet and native Web Audio. Observers delegated to original
synth/player methods. Native global timers were wrapped only to count pending
sequencer callbacks and remove them from that count on execution/cancellation;
the actual browser timers, FIFO logic and note callbacks were not replaced.
Synthetic pointer events recorded overlapping C4/E4/G4 through the real React
controls; native button interactions triggered playback and cancellation.

| Check | Observed result |
| --- | --- |
| Mount without playing | 0 AudioContexts, 0 sequencer timers, no active keys |
| Record and replay at 1× | Three notes replayed in onset order with overlapping holds; completed; timers/voices/pressed keys all 0 afterward |
| Stop before first note | Stopped before any note-on; timers/voices/pressed keys 0; run signal aborted |
| Restart after Stop | New run played successfully; old canceled run did not restart |
| Stop during playback with a manually held A5 | C4/E4/G4 and manual MIDI 81 received note-off; timers/voices/pressed keys 0 |
| Window blur during playback | Dispatched blur stopped playback and cleared all tracked timers/voices/pressed keys |
| Hidden document during playback | Simulated hidden visibilitychange stopped playback and cleared timers/voices/pressed keys |
| Play again after repeated cancellation, at 2× and 0.5× | Both completed with overlapping note lifetimes and no pending sequencer timers afterward |
| Unmount during active three-note playback | Run stopped, signal aborted, timers/voices/pressed keys 0; synth disposed; observed native AudioContext closed |

The nine observed run signals were all aborted at the end of their respective
completion/cancellation paths. Only one native AudioContext was created across
the tested plays. A later read after unmount showed no subsequent note starts
past the canceled run's original deadline. Browser warning/error logs were
empty. The temporary diagnostic was removed after testing.

No new application defect was confirmed in these tested paths, and no further
application fixes were made during this import/test task. This is a finite
behavior/resource check, not proof of absence of memory leaks. No Phase F
generation prompt has been supplied or invented.

### Not verified

Physical speaker/headphone quality, screen-reader speech, hardware multitouch,
actual OS focus/tab switching, long-running heap/listener/resource trends,
React DevTools Profiler, fresh responsive/contrast auditing and same-pitch
manual-versus-replay ownership were not verified in this check. Blur/hidden
tests used dispatched events and a temporary visibility getter override;
they are not recordings of real OS focus changes. Passing unit tests and
these browser checks do not establish full assignment or WCAG conformance.
