/**
 * T-08 accessibility design decision: transient aria-pressed tracks actual
 * press/hold state, not a persistent toggle. Screen readers may nevertheless
 * describe this as a toggle button because that is aria-pressed semantics.
 *
 * Hit processing remains exclusively on native click (T-07); pointerdown and
 * Enter/Space handlers only update pressed presentation and never emit hits.
 */
export default function DrumPad({ pad, isActive, onHit, onPress, onRelease }) {
  const isActivationKey = (event) => event.key === 'Enter' || event.key === ' ';

  return (
    <button
      className={`drum-pad${isActive ? ' is-active' : ''}`}
      type="button"
      data-key={pad.key}
      data-code={pad.code}
      data-sound={pad.soundId}
      aria-label={`${pad.label} drum, key ${pad.key}`}
      aria-pressed={isActive}
      onClick={() => onHit(pad.id, false)}
      onPointerDown={(event) => {
        if (event.isPrimary && event.button === 0) onPress(pad.id);
      }}
      onPointerUp={() => onRelease(pad.id)}
      onPointerCancel={() => onRelease(pad.id)}
      onPointerLeave={() => onRelease(pad.id)}
      onLostPointerCapture={() => onRelease(pad.id)}
      onKeyDown={(event) => {
        if (isActivationKey(event) && !event.repeat) onPress(pad.id);
      }}
      onKeyUp={(event) => {
        if (isActivationKey(event)) onRelease(pad.id);
      }}
      onBlur={() => onRelease(pad.id)}
    >
      <kbd aria-hidden="true">{pad.key}</kbd>
      <span aria-hidden="true">{pad.label}</span>
    </button>
  );
}
