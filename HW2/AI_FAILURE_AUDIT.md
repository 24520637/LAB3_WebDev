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
