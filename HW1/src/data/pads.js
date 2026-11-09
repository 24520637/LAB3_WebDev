/**
 * T-03: single source of truth for the seven-pad data contract.
 * The legacy sound files remain untouched in the drum-kit-engine repository.
 * URLs are references, NOT evidence of successful audio playback.
 * Later audio integration should read this data; do not duplicate mappings.
 */
const LEGACY_SOUND_BASE =
  'https://raw.githubusercontent.com/24520637/drum-kit-engine/main/assets/sounds';

export const DRUM_PADS = Object.freeze([
  Object.freeze({ id: 'kick', code: 'KeyW', key: 'W', label: 'Kick', soundId: 'kick', soundUrl: `${LEGACY_SOUND_BASE}/kick.wav` }),
  Object.freeze({ id: 'snare', code: 'KeyA', key: 'A', label: 'Snare', soundId: 'snare', soundUrl: `${LEGACY_SOUND_BASE}/snare.wav` }),
  Object.freeze({ id: 'hi-hat', code: 'KeyS', key: 'S', label: 'Hi-Hat', soundId: 'hi-hat', soundUrl: `${LEGACY_SOUND_BASE}/hi-hat.wav` }),
  Object.freeze({ id: 'clap', code: 'KeyD', key: 'D', label: 'Clap', soundId: 'clap', soundUrl: `${LEGACY_SOUND_BASE}/clap.wav` }),
  Object.freeze({ id: 'tom', code: 'KeyJ', key: 'J', label: 'Tom', soundId: 'tom', soundUrl: `${LEGACY_SOUND_BASE}/tom.wav` }),
  Object.freeze({ id: 'crash', code: 'KeyK', key: 'K', label: 'Crash', soundId: 'crash', soundUrl: `${LEGACY_SOUND_BASE}/crash.wav` }),
  Object.freeze({ id: 'ride', code: 'KeyL', key: 'L', label: 'Ride', soundId: 'ride', soundUrl: `${LEGACY_SOUND_BASE}/ride.wav` }),
]);
