/**
 * Samples real AudioEngine time-domain measurements only while voices play.
 * RAF is used for display synchronization, never to synthesize signal levels.
 */
export function createAudioLevelSampler({
  readDbfs,
  onLevel,
  requestFrame = (callback) => requestAnimationFrame(callback),
  cancelFrame = (id) => cancelAnimationFrame(id),
  sampleIntervalMs = 50,
}) {
  let disposed = false;
  let active = false;
  let frameId = null;
  let lastSampleAt = -Infinity;

  const tick = (time) => {
    frameId = null;
    if (disposed || !active) return;
    if (time - lastSampleAt >= sampleIntervalMs) {
      lastSampleAt = time;
      onLevel(readDbfs());
    }
    frameId = requestFrame(tick);
  };

  return {
    setActive(nextActive) {
      if (disposed || active === nextActive) return;
      active = nextActive;
      if (active) {
        lastSampleAt = -Infinity;
        frameId = requestFrame(tick);
      } else {
        if (frameId !== null) cancelFrame(frameId);
        frameId = null;
        // No active buffer sources remain: digital output is silent.
        // Keep "unavailable" if no analyser was created.
        onLevel(readDbfs() === null ? null : -Infinity);
      }
    },
    dispose() {
      disposed = true;
      active = false;
      if (frameId !== null) cancelFrame(frameId);
      frameId = null;
    },
  };
}
