import { DRUM_PADS } from '../data/pads.js';
import { AudioEngine } from './audioEngine.js';

/** One adapter for the existing engine, independent of React and input type. */
export function createDrumAudioController({
  pads = DRUM_PADS,
  createEngine = () => new AudioEngine(),
  onError = () => {},
  onActivityChange = () => {},
} = {}) {
  let disposed = false;
  let engine;
  const byId = new Map(pads.map((pad) => [pad.id, pad]));
  const soundMap = Object.fromEntries(pads.map((pad) => [pad.soundId, pad.soundUrl]));
  let failedSoundIds = new Set();
  const playbackErrors = new Map();
  let preloadError = '';
  let publishedError = '';

  // Resolve only the recovered sound's error; keep unrelated failures visible.
  function publishErrors() {
    if (disposed) return;
    const message = [
      preloadError,
      failedSoundIds.size
        ? `Unable to load ${failedSoundIds.size} drum sound(s). Other pads remain usable.`
        : '',
      ...playbackErrors.values(),
    ].filter(Boolean).join(' ');
    if (message !== publishedError) {
      publishedError = message;
      onError(message);
    }
  }

  try {
    engine = createEngine();
  } catch (error) {
    onError('Audio is unavailable in this browser.');
    return {
      preload: async () => ({ loaded: [], failed: Object.keys(soundMap) }),
      trigger: () => Promise.resolve(false),
      dispose: async () => {},
      readDbfs: () => null,
    };
  }

  engine.setActivityListener?.(onActivityChange);

  return {
    readDbfs: () => disposed ? null : (engine.readDbfs?.() ?? null),
    async preload() {
      if (disposed) return { loaded: [], failed: [] };
      try {
        const result = await engine.preload(soundMap);
        if (!disposed) {
          failedSoundIds = new Set(result.failed);
          preloadError = '';
          publishErrors();
        }
        return result;
      } catch {
        if (!disposed) {
          preloadError = 'Unable to load drum sounds.';
          publishErrors();
        }
        return { loaded: [], failed: Object.keys(soundMap) };
      }
    },

    // Called directly inside a genuine click/keydown callback; unlock() begins synchronously.
    async trigger(padId) {
      if (disposed) return false;
      const pad = byId.get(padId);
      if (!pad) return false;
      try {
        await engine.unlock();
        if (disposed) return false;
        const source = engine.play(pad.soundId);
        if (!source) {
          playbackErrors.set(pad.soundId, `${pad.label} is unavailable or could not play.`);
          publishErrors();
          return false;
        }
        playbackErrors.delete(pad.soundId);
        failedSoundIds.delete(pad.soundId);
        publishErrors();
        return true;
      } catch {
        if (!disposed) {
          playbackErrors.set(pad.soundId, `${pad.label} could not play. Check audio permissions.`);
          publishErrors();
        }
        return false;
      }
    },

    async dispose() {
      if (disposed) return;
      disposed = true;
      await engine.dispose();
    },
  };
}
