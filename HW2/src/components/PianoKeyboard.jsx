import { memo } from 'react';
import { PIANO_KEYS } from '../utils/generatePianoKeys.js';
import { PianoKey } from './PianoKey.jsx';

/** Presentation only: input and pressed-state ownership remain in App. */
export const PianoKeyboard = memo(function PianoKeyboard({
  pressedNotes,
  onNoteOn,
  onNoteOff,
}) {
  return (
    <section className="keyboard-section" aria-labelledby="keyboard-heading">
      <h2 id="keyboard-heading">88-key keyboard</h2>
      <p className="keyboard-help" id="keyboard-help">
        Scroll horizontally to explore all 88 keys. Tab to focus a key, then hold
        Space or Enter to press it. Audio playback is not part of this phase.
      </p>
      <div className="keyboard-scroll" role="region" aria-label="Scrollable piano keyboard">
        <div className="keyboard" aria-describedby="keyboard-help">
          {PIANO_KEYS.map((note) => (
            <PianoKey
              key={note.midi}
              midi={note.midi}
              noteName={note.noteName}
              isBlack={note.isBlack}
              whiteIndex={note.whiteIndex}
              isPressed={pressedNotes.has(note.midi)}
              onNoteOn={onNoteOn}
              onNoteOff={onNoteOff}
            />
          ))}
        </div>
      </div>
    </section>
  );
});
