# AI Failure Audit — HW1

## Failure 01 — Audio error remains visible after the sound recovers

**Reviewed:** 2026-11-09 (Asia/Saigon).

**Source:** Application code imported from `HW1_T09.zip`.

**Related implementation prompt (provided by the user):**

```text
Implement only T-09 from TASK_DECOMPOSITION.md:
Integrate the existing AudioEngine with the React drum pads.

Before coding:
Inspect the existing AudioEngine implementation and
its resource lifecycle.

Requirements:

- Reuse existing audio decoding and playback logic
  wherever appropriate.
- Integrate the seven-pad configuration.
- Preserve overlapping playback behavior if supported.
- Preload sounds appropriately.
- Unlock audio only through genuine user interaction.
- Do not autoplay audio.
- Handle missing or invalid audio assets.
- Handle playback failures without breaking pad interaction.
- Ensure React lifecycle does not leak audio resources.
- Add disposal logic only if technically necessary
  and compatible with the existing engine.

Testing:
- All seven sounds.
- Rapid overlapping hits.
- Audio unlock.
- Missing asset.
- Decode failure.
- Playback failure.
- Component unmount.
- No autoplay.

Do not rewrite the entire AudioEngine without justification.
Do not add unrelated audio features.
Do not implement the meter yet.

Report the exact tests executed and results.
```

The user identified this as the implementation prompt. The observed defect is
in the resulting error-recovery implementation; this does not establish that
the prompt itself is technically incorrect.

### Affected code and cause

`src/audio/drumAudioController.js` reports a missing/not-yet-loaded buffer:

```js
const source = engine.play(pad.soundId);
if (!source) {
  onError(`${pad.label} is unavailable or could not play.`);
  return false;
}
return true;
```

The successful path does not publish recovery. `src/hooks/useDrumAudio.js`
stores the message with `onError: setAudioError`, but never clears that state
when the affected pad becomes playable. `DrumKit.jsx` continues rendering
the stored message whenever `audioError` is non-empty.

### Browser reproduction of the original defect

A controlled-loading fixture imports the actual React entry and audio modules.
It delays only the Kick request until a test button releases it, and instruments
the existing `preload()`/`play()` methods to show decoded samples and successful
source starts. It does not replace decoding or playback with mocks.

1. Run `npm run dev -- --host 127.0.0.1 --port 5184 --strictPort` from `HW1`.
2. Open `http://127.0.0.1:5184/tests/fixtures/t09-audio-check.html`.
3. Before releasing the delayed request, click Kick and wait for the app's
   message `Kick is unavailable or could not play.`.
4. Click **Finish delayed Kick request**, then wait for **Decoded 7/7**.
5. Click Kick again. The source-start counter increments, proving the real
   engine starts its decoded Kick buffer; the old app error remains visible.

The first executed browser run used an identical temporary copy at
`/.vite/t09-verification.html`; the fixture is retained at
`tests/fixtures/t09-audio-check.html` for reproduction.

### Actual evidence

Observed DOM/accessibility snapshots in the in-app browser:

```text
Before audio activation:
  Successful audio starts: 0

After the early Kick hit:
  Successful audio starts: 0
  Kick is unavailable or could not play.

After all buffers load and Kick is clicked again:
  Decoded 7/7; failed: ; context: running
  Successful audio starts: 1; sounds: kick
  Kick is unavailable or could not play.

After subsequently clicking the other six pads:
  Successful audio starts: 7; sounds: kick, snare, hi-hat, clap, tom, crash, ride
  Kick is unavailable or could not play.
```

**Impact:** The UI continues claiming a sound is unavailable after it can play.
An ordinary slow initial load can leave a misleading error for the rest of the
mount. This observation does not establish that hit history is corrupted.

### Engineering fix — 2026-11-09

**Fixed.** Updated `drumAudioController.js` to keep
playback errors by sound ID and preload failures separately. It publishes a
new combined message only when the error state changes. Successful playback
removes only that sound's errors, publishing an empty string when no errors
remain. This lets the existing Hook clear the rendered message. A successful
preload retry also replaces the obsolete list of missing/invalid assets.

```js
playbackErrors.delete(pad.soundId);
failedSoundIds.delete(pad.soundId);
publishErrors();
return true;
```

Playback of a healthy sound does not hide an unresolved failure elsewhere.
The existing AudioEngine's decoding, overlapping playback, unlock, and disposal
logic was retained. An early hit still reports unavailable until the user
retries after loading; it is not automatically queued or replayed.

**Regression tests:** Added three tests to `tests/audio.test.mjs` for early-hit
recovery, independent errors across two pads, and preserving an unresolved
missing asset while another pad plays. Before the fix, all three new tests
failed on a non-empty message where an empty message was expected. The ten
existing audio tests passed in that same run.

**Post-fix commands/results:**

```text
npm test       -> 44 passed, 0 failed
npm run build -> passed
```

**Browser retest:** Repeated the retained controlled-loading fixture on the
actual React app. Initial source starts were zero. The delayed Kick first
displayed the same error as before; after `Decoded 7/7` and another Kick click,
the successful-start counter became 1 and the error element disappeared.
Clicking all remaining pads produced:

```text
Decoded 7/7; failed: ; context: running
Successful audio starts: 7; sounds: kick, snare, hi-hat, clap, tom, crash, ride
No .audio-error element remained.
Captured browser warning/error logs: []
```

### Verification limits

- Before the fix, the supplied test suite passed **41/41** despite this defect.
  After adding regression coverage and fixing the controller, **44/44** passed.
  Rendered recovery was separately verified in the browser as described above.
- All seven configured remote WAVs decoded and started in the actual browser;
  no missing asset was observed in this run. This is Web Audio API evidence,
  not a subjective listening assessment of speakers, volume, or sample quality.
- Preload alone created no playback source in the fixture; actual source
  starts followed user clicks. Overlap, fetch/decode failures, unlock/start
  failures, and disposal also passed the supplied mock-based tests.
- No Chrome DevTools recording, actual screen-reader test, UniKey test, or
  mobile-browser test was performed for this finding.
- This finding is **one** evidenced application bug. No extra defects or DevTools
  screenshots are invented to satisfy the assignment's three-bug requirement.

## Failure 02 — Repeated same-pad hits do not update the live region

**Reviewed:** 2026-11-09 (Asia/Saigon).

**Source:** T-10 code imported from `HW1_T10.zip`.

**Related implementation prompt (provided by the user):**

```text
Implement only T-10 from TASK_DECOMPOSITION.md:
Create the accessible visual hit history.

Requirements:

- Use an output element with aria-live="polite".
- Display recent drum hits visibly.
- Show meaningful information such as pad name
  and the order of recent hits.
- Keep the visual history synchronized with React state.
- Keep history bounded.
- Avoid excessively verbose announcements.
- Ensure history does not depend on successful audio playback.
- Preserve keyboard and screen-reader usability.

Testing:
- A single hit.
- Multiple rapid hits.
- Different pad hits.
- Correct history order.
- History limit.
- Screen-reader announcement behavior.
- Audio failure while hit history continues to work.

Do not use innerHTML.
Do not create an unrelated logging system.
Do not modify unrelated files.
```

The user identified this as the implementation prompt. The defect is in the
generated update behavior; this does not show that the prompt itself is wrong.

### Affected code and cause

`src/components/HitHistory.jsx` delays the live-region state update by 300 ms:

```jsx
const timeout = setTimeout(() => {
  setAnnouncement(getLatestHitAnnouncement(hits, DRUM_PADS));
}, ANNOUNCEMENT_DELAY_MS);
```

`src/state/hitHistoryView.js` constructs the announcement using only sound
name and key, excluding the unique hit ID:

```js
return latest ? `Latest hit: ${latest.label}, key ${latest.key}.` : '';
```

Two separate Kick hits therefore produce the identical state string
`Latest hit: Kick, key W.`. Despite a new history entry and a rerun of the
effect, the live-region text does not change on the second hit. The history
list has `aria-live="off"`, so its new item is not an alternative polite
announcement of that event.

### Reproduction and actual browser evidence

The actual React application was loaded through a temporary instrumentation
page at `http://127.0.0.1:5184/.vite/t10-live-check.html`. A MutationObserver
counted child/text mutations inside the application's existing `output`;
it did not replace the component or its state logic. A separate non-live
diagnostic element displayed the counts.

1. Begin with empty history and an empty live output.
2. Click Kick and wait at least 550 ms, allowing the 300 ms update to settle.
3. Click Kick again and wait another 550 ms. These are separated hits,
   not one rapid sequence intentionally coalesced by the debounce.
4. Compare history length with live-region mutation count.

Actual diagnostic text returned by the browser:

```text
Clicks: 1; live updates: 1; history: 1; messages: ["Latest hit: Kick, key W."]
Clicks: 2; live updates: 1; history: 2; messages: ["Latest hit: Kick, key W."]
```

The DOM/accessibility snapshot showed two visible Kick history items but
only the same single output message.

A separate **synthetic eight-hit burst** dispatched clicks synchronously
through the actual pad buttons. It added eight history entries and only one
live-region update for the final Snare hit:

```text
Clicks: 10; live updates: 2; history: 10;
messages: ["Latest hit: Kick, key W.","Latest hit: Snare, key A."]
```

Thus this run confirmed missing updates for separated identical hits, not
excessive updates for the tested burst. The temporary instrumentation page
was removed afterward; application source was unchanged by that check.

To reproduce independently, observe the mounted output before clicking:

```js
const liveOutput = document.querySelector('.hit-history output');
let liveUpdates = 0;
const observer = new MutationObserver(() => { liveUpdates += 1; });
observer.observe(liveOutput, {
  childList: true,
  characterData: true,
  subtree: true,
});
// Perform the two separated clicks above, then inspect liveUpdates.
// Disconnect when finished: observer.disconnect();
```

This is a reproduction aid, not a claim that Chrome DevTools was used for
the recorded run.

### Impact and limitations

**Impact:** A new same-pad hit after a pause creates no new live-region DOM
update for assistive technology to announce. Screen-reader users can miss
feedback for that event. Actual spoken behavior was **not tested**; no
screen-reader transcript or formal WCAG failure is claimed.

**Retest:** On the production application in the in-app browser, clicked Kick,
waited for `Hit 1: Kick, key W.`, then clicked Kick again and waited for
`Hit 2: Kick, key W.`. The visible history contained two entries. This confirms
that the live output now changes for separated same-pad hits. The T-11 suite
passed 59/59 Node tests and the production build passed. Actual screen-reader
speech remains unverified; the user asked to skip that test. No spoken
announcement or screen-reader usability result is inferred from DOM changes.

The two findings above were documented before the independent accessibility
review below. Actual screen-reader speech and Chrome DevTools evidence
remain unverified.

## Related prompt for the post-T-12 accessibility review

**Reviewed:** 2026-11-09 (Asia/Saigon).

**User-provided prompt, recorded verbatim:**

```text
Implement only T-12 from TASK_DECOMPOSITION.md:
Harden the responsive layout and visible focus behavior.

Requirements:

- Reuse existing CSS wherever appropriate.
- Support narrow mobile screens, tablet and desktop.
- Avoid horizontal overflow.
- Maintain readable labels.
- Ensure visible keyboard focus.
- Ensure focus is not obscured.
- Maintain adequate contrast.
- Do not rely on color alone to communicate pad state.
- Keep the seven-pad layout usable at small screen sizes.
- Respect reduced-motion preferences where animations exist.
- Avoid unnecessary visual redesign.

Verify at:
- 375px viewport width.
- 768px viewport width.
- Desktop viewport.

Test:
- Horizontal overflow.
- Text readability.
- Keyboard focus visibility.
- Focus order.
- Pad spacing and target usability.
- Contrast.

Do not add new features.
Do not modify audio logic.
Report actual test results.
```

**Attribution limitation:** The user supplied this as the related implementation
prompt. Comparing every ZIP entry with the working HW1 files showed that
`HW1_T12.zip` changed only `src/styles.css`. The keyboard controller and
`DrumPad.jsx` behavior in Findings 03 and 04 already existed before this
import. These are existing application issues found during the post-T-12
audit, not proven defects introduced by this prompt or its CSS changes.
The prompt that originally introduced either implementation is not established
by this audit. No original generation prompt is invented.

## Failure 03 — Global character shortcuts cannot be disabled or remapped

**Severity:** High. Confirmed WCAG 2.1.4 (Level A) failure within an AA review.

**Affected files/components:** `src/hooks/drumKeyboardController.js`
(`onKeyDown`, window listeners), `src/hooks/useDrumKeyboard.js`, and
`src/components/DrumKit.jsx`.

**Related prompt:** The exact user-provided T-12 prompt above, subject to its
attribution limitation.

### Affected code and cause

```js
// drumKeyboardController.js
const pad = padMap.get(event.code);
if (!pad || pressed.has(event.code) || isEditableEvent(event, hostWindow)) return;
event.preventDefault();
pressed.set(event.code, pad.id);
onHit(pad.id);

hostWindow.addEventListener('keydown', onKeyDown);
```

```js
// DrumKit.jsx; useDrumKeyboard's isEnabled argument defaults to true.
useDrumKeyboard(padMap, onHit, onActiveChange);
```

The handler is registered on the window and does not require focus on the
relevant pad. The app provides no UI to disable or remap these shortcuts.
Editable-target and composition guards protect text entry, but do not address
accidental character shortcuts while focus is elsewhere on the page.

### Reproduction and actual browser evidence

1. Open a fresh instance at `http://127.0.0.1:5184/`.
2. Do not Tab to or click a pad. Confirm `document.activeElement.tagName`
   is `BODY`; history is initially empty.
3. Press and release W.
4. Inspect history and the app's available controls.

The in-app browser returned `focus: 'BODY'` before activation. After the
actual W key action, the rendered history contained one `Kick W` item while
focus remained on the page. Source and DOM inspection found seven pad
buttons and no shortcut-disable or remapping control.

### Requirement, impact, and smallest proposed correction

[WCAG 2.1.4 Character Key Shortcuts](https://www.w3.org/WAI/WCAG22/Understanding/character-key-shortcuts.html)
requires character-only shortcuts to be switchable off, remappable to include
a non-printable key, or active only when the relevant component has focus.
Using physical `event.code` mappings does not exempt character shortcuts.

The current implementation provides none of those alternatives. It can
unexpectedly trigger hits for speech-input or keyboard users outside an
editable field. Speech recognition itself was not tested.

The smallest proposed correction is a clearly labelled native checkbox to
enable/disable physical-key shortcuts, wired to the existing `isEnabled`
argument of `useDrumKeyboard`. Native Enter/Space activation should continue
working independently. This is a recommendation only; no application fix was
made during this documentation request.

## Finding 04 — Momentary drum pads expose toggle-button semantics

**Severity:** Medium. Confirmed source-level semantic mismatch with the
WAI-ARIA button pattern; relevant to WCAG 4.1.2. Actual screen-reader impact
and a formal conformance failure were not independently established.

**Affected file/component:** `src/components/DrumPad.jsx`, `DrumPad`.

**Related prompt:** The exact user-provided T-12 prompt above, subject to its
attribution limitation.

### Affected code and cause

```jsx
<button
  type="button"
  aria-label={`${pad.label} drum, key ${pad.key}`}
  aria-pressed={isActive}
  onClick={() => onHit(pad.id, false)}
>
```

`isActive` represents transient physical/native press feedback. However,
`aria-pressed` identifies a toggle button, whose pressed/unpressed state
represents an on/off choice. A drum hit is a momentary action and does not
enable or disable a mode. Returning the attribute to false after release
does not remove the toggle semantics.

### Reproduction and actual browser evidence

1. Open the app and inspect the seven native button elements.
2. Observe that every button has `aria-pressed="false"` initially.
3. Tab to Kick. Press and release Enter, then Space.
4. Inspect history and each button's `aria-pressed` value after release.

The browser DOM inspection confirmed seven `BUTTON` elements with distinct
names and `aria-pressed="false"`. Enter and Space each added one history
entry; all seven attributes were false afterward. The earlier body-level W
hit plus these two actions produced a history count of 3. This confirms
momentary action behavior, not a persistent toggle. It does not constitute
a screen-reader transcript.

### Requirement, impact, and smallest proposed correction

The [WAI-ARIA Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/)
uses `aria-pressed` to expose a toggle button. Appropriate component roles
and states are relevant to
[WCAG 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html).
The current metadata can lead assistive technology users to expect a
maintained on/off state that this action does not provide. No exact spoken
wording or user confusion was measured.

The smallest proposed correction is to remove `aria-pressed`, retaining the
native button, transient visual feedback, and polite hit-history output.
No application fix was made during this documentation request.

### Verification scope of the independent accessibility review

- Ran 33 existing Node tests covering keyboard handling, history, audio-level
  measurement, and pad data: 33 passed, 0 failed. These are not a complete
  automated accessibility scan and do not detect the issues above.
- Manually verified native Enter/Space activation, Tab order through seven
  pads, keyboard entry into the scrollable history, End scrolling that list,
  and Tab exit. History remained bounded to 20 entries.
- Verified live-output DOM changes between separated same-pad hits. Actual
  screen-reader announcements, UniKey operation, and speech input were not
  verified. No axe or Lighthouse scan was run for this review.
- Only this audit document was updated for the documentation request.
  Unverified behavior is not counted as an additional failure, and this
  record does not claim full WCAG 2.2 AA compliance or completed assignment
  evidence requirements.
