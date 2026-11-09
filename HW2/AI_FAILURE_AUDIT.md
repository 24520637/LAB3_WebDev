# HW2 — AI Failure Audit

Reviewed 2026-11-09 after importing `HW2_PhaseB_React_88Key_Piano.zip`.
Only confirmed application behavior findings are recorded below. The user
subsequently supplied the implementation prompt recorded in both findings.
This records the user's attribution; it does not establish that the prompt
itself is technically incorrect.
The application source was not corrected during this import/test request.

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

### Code and cause

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

### Code and cause

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

## Verification limits

- The six supplied model unit tests passed; they do not mount React or test
  input events, and therefore do not detect these findings. Production build
  passed too.
- Native Space produced one false -> true -> false transition. A dispatched
  window blur cleared a held note; a new synthetic Space down worked afterward.
- No screen-reader speech, hardware multitouch, OS focus-switch/IME test or
  React DevTools Profiler evidence is claimed.
- The temporary probes were removed after testing. Reproduction snippets above
  describe the event inputs and observed DOM output, not a claim that Chrome
  DevTools was used for the original run.
- There are two confirmed findings here. Missing audio/recording/replay in
  Phase B is declared scope, not an additional bug. No third bug is invented.
