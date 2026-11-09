import { memo, useEffect, useRef } from 'react';

/**
 * Foundation-only visual note control. Real sound is introduced in Phase C.
 * One held pointer or keyboard activation per key; all release paths converge.
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
  const heldRef = useRef(false);
  const pointerIdRef = useRef(null);

  // Parent may clear all pressed keys after window blur without a keyup.
  // Reconcile the local guard so the next deliberate press is accepted.
  useEffect(() => {
    if (!isPressed) {
      heldRef.current = false;
      pointerIdRef.current = null;
    }
  }, [isPressed]);

  function press() {
    if (heldRef.current) return;
    heldRef.current = true;
    onNoteOn(midi);
  }

  function release() {
    if (!heldRef.current) return;
    heldRef.current = false;
    pointerIdRef.current = null;
    onNoteOff(midi);
  }

  function handlePointerDown(event) {
    if (!event.isPrimary || event.button !== 0) return;
    // Don't treat touch scrolling as a click; capture the pointer while held.
    pointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    press();
  }

  function handlePointerUp(event) {
    if (pointerIdRef.current !== event.pointerId) return;
    release();
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleKeyDown(event) {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    if (!event.repeat) press();
  }

  function handleKeyUp(event) {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    release();
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
      onPointerUp={handlePointerUp}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onBlur={release}
    >
      <span aria-hidden="true" className="piano-key__label">{noteName}</span>
    </button>
  );
});
