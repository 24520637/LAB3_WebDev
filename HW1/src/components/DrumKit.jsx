import { DRUM_PADS } from '../data/pads.js';
import DrumPad from './DrumPad.jsx';

/** Render the seven configured pads without duplicating key/sound mappings. */
export default function DrumKit() {
  return (
    <section className="drum-kit" aria-label="Drum pads">
      <div className="drum-pad-grid">
        {DRUM_PADS.map((pad) => (
          <DrumPad key={pad.id} pad={pad} />
        ))}
      </div>
    </section>
  );
}
