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
- This is **one** evidenced application bug. No extra defects or DevTools
  screenshots are invented to satisfy the assignment's three-bug requirement.
