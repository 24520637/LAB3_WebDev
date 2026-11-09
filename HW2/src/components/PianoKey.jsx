import { memo, useEffect, useRef } from 'react';
import { createPianoKeyInteraction } from './pianoKeyInteraction.js';

/**
 * One memoized, independently controlled note. Parent callbacks and primitive
 * note descriptors must remain stable for React.memo to isolate all 88 keys.
 */
export const PianoKey = memo(function PianoKey({
  midi,
  noteName,
  isBlack,
  isPressed,
  whiteIndex,
  onNoteOn,
  onNoteOff,
}) {
  // The controller is persistent; its callbacks always call the latest props.
  const callbacksRef = useRef({ onNoteOn, onNoteOff });
  callbacksRef.current = { onNoteOn, onNoteOff };
  const inputRef = useRef(null);
  const clickTimerRef = useRef(null);
  if (inputRef.current === null) {
    inputRef.current = createPianoKeyInteraction(
      () => callbacksRef.current.onNoteOn(midi),
      () => callbacksRef.current.onNoteOff(midi),
    );
  }

  // A window-level reset (or a future audio-engine voice steal) can clear the
  // parent's pressed state. Keep local input guards consistent with that reset.
  useEffect(() => {
    if (!isPressed && inputRef.current.isHeld) inputRef.current.resetSilently();
  }, [isPressed]);

  useEffect(() => () => {
    if (clickTimerRef.current !== null) clearTimeout(clickTimerRef.current);
    inputRef.current.releaseAll();
  }, []);

  useEffect(() => {
    // Only currently held keys attach listeners; 88 idle keys add no listeners.
    if (!isPressed) return undefined;
    const release = () => inputRef.current.releaseAll();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') release();
    };
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', release);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isPressed]);

  function handlePointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (event.pointerType === 'pen' && event.button !== 0) return;
    // Touch pointers may be non-primary: they are necessary for multi-key chords.
    if (!inputRef.current.pointerDown(event.pointerId)) return;
    try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch { /* capture not available */ }
  }

  function handlePointerEnd(event) {
    inputRef.current.pointerUp(event.pointerId);
    try {
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch { /* pointer is already released */ }
  }

  function handleClick(event) {
    // Pointer-origin clicks were handled on pointerdown/pointerup. Click-only
    // activations (including assistive technology and element.click()) still
    // need a visible note-on AND a later note-off, not a batched zero-duration flash.
    if (!inputRef.current.clickDown({
      detail: event.detail,
      pointerId: event.nativeEvent.pointerId,
    })) return;
    if (clickTimerRef.current !== null) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      inputRef.current.clickUp();
    }, 120);
  }

  function handleKeyDown(event) {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    // Suppress browser synthesis of an extra click and keyboard page scrolling.
    event.preventDefault();
    if (!event.repeat) inputRef.current.keyboardDown(event.key);
  }

  function handleKeyUp(event) {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    inputRef.current.keyboardUp(event.key);
  }

  return (
    <button
      type="button"
      className={`piano-key ${isBlack ? 'piano-key--black' : 'piano-key--white'}${isPressed ? ' is-pressed' : ''}`}
      style={{ '--white-index': whiteIndex }}
      aria-label={`${noteName} piano key`}
      aria-pressed={isPressed}
      data-midi={midi}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onLostPointerCapture={handlePointerEnd}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onBlur={() => inputRef.current.releaseAll()}
    >
      <span aria-hidden="true" className="piano-key__label">{noteName}</span>
    </button>
  );
});
