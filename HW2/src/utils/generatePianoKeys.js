/** The standard 88-key piano spans A0 (MIDI 21) through C8 (MIDI 108). */
export const LOWEST_MIDI = 21;
export const HIGHEST_MIDI = 108;
export const PIANO_KEY_COUNT = HIGHEST_MIDI - LOWEST_MIDI + 1;

const PITCH_CLASSES = Object.freeze([
  'C', 'C#', 'D', 'D#', 'E', 'F',
  'F#', 'G', 'G#', 'A', 'A#', 'B',
]);
const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);

/**
 * Create immutable descriptors in MIDI order without hardcoding frequencies,
 * individual keys, or the position of any particular black key.
 * whiteIndex represents white keys preceding this note; black keys are drawn
 * centered on the boundary just before that white index.
 */
export function generatePianoKeys() {
  let whiteIndex = 0;
  return Object.freeze(Array.from({ length: PIANO_KEY_COUNT }, (_, index) => {
    const midi = LOWEST_MIDI + index;
    const pitchClass = midi % 12;
    const isBlack = BLACK_PITCH_CLASSES.has(pitchClass);
    const key = Object.freeze({
      midi,
      noteName: `${PITCH_CLASSES[pitchClass]}${Math.floor(midi / 12) - 1}`,
      isBlack,
      freqHz: 440 * 2 ** ((midi - 69) / 12),
      whiteIndex,
    });
    if (!isBlack) whiteIndex += 1;
    return key;
  }));
}

/** Shared immutable data, stable across React parent renders. */
export const PIANO_KEYS = generatePianoKeys();
