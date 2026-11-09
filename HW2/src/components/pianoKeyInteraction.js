/**
 * Per-key input arbitration, independent of React and Web Audio.
 * Pointer and keyboard sources can overlap without duplicate note-on/off.
 * Every physical activation has exactly one matching release.
 */
export function createPianoKeyInteraction(onPress, onRelease) {
  const pointers = new Set();
  const keys = new Set();
  let active = false;
  let clickHeld = false;

  function sync() {
    const nextActive = pointers.size > 0 || keys.size > 0 || clickHeld;
    if (nextActive === active) return;
    active = nextActive;
    if (active) onPress();
    else onRelease();
  }

  return {
    pointerDown(pointerId) {
      if (pointerId == null || pointers.has(pointerId)) return false;
      pointers.add(pointerId);
      sync();
      return true;
    },
    pointerUp(pointerId) {
      if (!pointers.delete(pointerId)) return false;
      sync();
      return true;
    },
    /** A click without a preceding pointer press (e.g. AT, .click()) is a tap. */
    clickDown({ detail = 0, pointerId = -1 } = {}) {
      // Classify this event, rather than consuming a flag left by an older
      // pointer interaction. Pointer clicks already played on down/up.
      if (detail > 0 || pointerId >= 0) return false;
      if (active) return false;
      clickHeld = true;
      sync();
      return true;
    },
    clickUp() {
      if (!clickHeld) return false;
      clickHeld = false;
      sync();
      return true;
    },
    keyboardDown(key) {
      if (key !== ' ' && key !== 'Enter') return false;
      if (!keys.has(key)) {
        keys.add(key);
        sync();
      }
      return true;
    },
    keyboardUp(key) {
      if (key !== ' ' && key !== 'Enter') return false;
      if (keys.delete(key)) sync();
      return true;
    },
    releaseAll() {
      pointers.clear();
      keys.clear();
      clickHeld = false;
      sync();
    },
    // Reconcile a parent-forced reset without issuing another note-off.
    resetSilently() {
      pointers.clear();
      keys.clear();
      clickHeld = false;
      active = false;
    },
    get isHeld() { return active; },
  };
}
