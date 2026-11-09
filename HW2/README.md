# HW2 — Phase B: React 88-key keyboard

This directory is a standalone addition intended for `LAB3_WebDev/HW2/`. It does not modify `HW1`, `Exercise2`, or `Exercise3`.

## What is implemented
- React 19 / Vite project following the versions already present in the GitHub repository.
- Programmatic MIDI 21–108 key model, 52 white + 36 black, calculated frequencies, octave names, immutable descriptors.
- Correct layered black/white keyboard layout; 88 semantic piano key buttons.
- Stable event callbacks, `React.memo` key components, pointer/keyboard press-and-release visual state, responsive horizontal scrolling.
- Pure-model unit tests using Node's built-in test runner.

**Not implemented:** Web Audio, actual sound, 8-voice polyphony, recording, replay, AudioTaskQueue, sequencer controls, or proven React DevTools Profiler isolation. Those belong to later phases.

## Run

From `HW2/`:

```sh
npm install
npm run dev
npm test
npm run build
```

`npm install` is required once on a fresh local checkout; the package versions match existing repository project files. No dependencies were installed as part of preparing this deliverable.

## Verifying interaction
1. Load the browser page, check the full 88-key range by scrolling horizontally.
2. Use Tab to focus a note, hold Space/Enter and release; the key visually changes without sound.
3. Use a pointer press/release and move focus away; the pressed state should clear.
4. For actual component render isolation use React DevTools Profiler in a later profiling task; `memo` alone is not proof.

## Source relationship
The repository snapshot inspected has no `HW2` directory. This project is supplied as new files for placement at `LAB3_WebDev/HW2/`. Existing GitHub files were not overwritten or committed.
