# HW2 Phase B — import and verification

2026-11-09, Windows, Node.js 26.8.2.

Imported the 12 regular files from `HW2_PhaseB_React_88Key_Piano.zip` into
`HW2/`. The archive task decomposition is identical to the existing document.
The existing `PROJECT_RULES.md` was preserved. Added `.gitignore` for
`node_modules/`, `dist/` and `.vite/`; `npm install` generated a package lock
using the archive's exact declared versions. No extra test framework or audio
dependency was added. Other repository projects were not changed by this task.

## Executed commands

| Command | Actual result |
|---|---|
| `npm install` | Added 19 packages; npm reported 0 vulnerabilities |
| `npm test` | 6 passed, 0 failed, 0 skipped |
| `npm run build` | Passed |
| `npm run dev -- --host 127.0.0.1 --port 5185 --strictPort` | Started successfully |

## Browser checks

- App at `http://127.0.0.1:5185/`: 88 native key buttons, 52 white and 36 black;
  first accessible name A0 piano key, last C8 piano key.
- Desktop document width 1280 / scrollWidth 1280. Keyboard viewport width
  1113 / scrollWidth 1876: scrolling is contained in the keyboard region.
- Actual child browsing contexts at 375px and 768px: document clientWidth
  equalled scrollWidth at each width. At 375px, keyboard client/scroll widths
  were 336/1668; at 768px they were 707/1876. These are iframe viewport tests,
  not tests on physical mobile/tablet hardware.
- Visually checked the narrow layout and the desktop black/white layering.
  Tab reached named keys with visible focus. Focusing/activating C8 scrolled
  toward the far end; after Space release no key remained active.
- On A0, normal pointer click and native Space each produced the observed
  aria-pressed sequence false -> true -> false.
- A synthetic window blur reset a synthetic held Space, and a fresh press
  worked afterward. This does not verify an actual OS window-switch sequence.
- Interaction probe confirmed two failures: click-only activation is ignored,
  and Enter keyup releases a Space-owned hold. See `../AI_FAILURE_AUDIT.md`.
- Captured warning/error logs for the interaction probe were empty. This is
  not a Lighthouse or exhaustive network audit.

## Not verified / not implemented

No audio engine, AudioContext, voice pool, recorder, replay queue or sequencer
controls exist in this Phase B import; the UI explicitly discloses that scope.
No sound/playback result is claimed. React.memo and stable callbacks exist in
source, but real Profiler render isolation is not established. Screen-reader
speech, physical multitouch, UniKey/IME, zoom/text spacing, full WCAG and
Lighthouse were not tested. Black keys measure 20px wide on mobile and 22px
on desktop, so target usability needs focused review before touch acceptance.

The two input findings remain uncorrected; the import is not a complete T-05
acceptance pass. No task-completion checkboxes were marked. No commit or push
was made for this request. Temporary browser probes were removed afterward.
