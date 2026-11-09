/**
 * T-04: Presentational pad. Interaction and active state belong to later tasks.
 * The button remains natively focusable and activatable by Enter/Space.
 */
export default function DrumPad({ pad }) {
  return (
    <button
      className="drum-pad"
      type="button"
      data-key={pad.key}
      data-code={pad.code}
      data-sound={pad.soundId}
      aria-label={`${pad.label} drum, key ${pad.key}`}
    >
      <kbd aria-hidden="true">{pad.key}</kbd>
      <span aria-hidden="true">{pad.label}</span>
    </button>
  );
}
