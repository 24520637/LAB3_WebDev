/**
 * Adapted from LAB2 drum-kit-engine/js/audio-engine.js.
 * The Web Audio preload/unlock/polyphonic playback API is preserved.
 * T-09 adds abortable preload and disposal for React effect cleanup.
 */
export class AudioEngine {
  constructor({ maxInstancesPerSound = 12 } = {}) {
    if (!Number.isInteger(maxInstancesPerSound) || maxInstancesPerSound < 10 || maxInstancesPerSound > 15) {
      throw new RangeError('maxInstancesPerSound must be between 10 and 15.');
    }
    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextClass) throw new Error('Web Audio API is not supported.');

    this.maxInstancesPerSound = maxInstancesPerSound;
    this.context = new AudioContextClass();
    this.buffers = new Map();
    this.activeInstances = new Map();
    this.errors = new Map();
    this.disposed = false;
    this.preloadController = new AbortController();

    // One master analysis node measures the *mixed audio signal*, not key hits.
    // If analysis is unsupported, preserve legacy playback through destination.
    this.analyser = null;
    this.sampleBuffer = null;
    this.onActivityChange = null;
    if (typeof this.context.createAnalyser === 'function') {
      try {
        const analyser = this.context.createAnalyser();
        analyser.fftSize = 1024;
        if (typeof analyser.getFloatTimeDomainData !== 'function') {
          throw new Error('Time-domain audio analysis unavailable.');
        }
        analyser.connect(this.context.destination);
        this.analyser = analyser;
        this.sampleBuffer = new Float32Array(analyser.fftSize);
      } catch {
        this.analyser = null;
      }
    }
  }

  async preload(soundMap) {
    if (this.disposed) throw new Error('Audio engine has been disposed.');
    if (!soundMap || typeof soundMap !== 'object') throw new TypeError('soundMap must be an object.');
    const results = await Promise.all(Object.entries(soundMap).map(async ([soundId, source]) => {
      try {
        if (typeof source !== 'string' || !source.trim()) throw new Error(`Invalid audio source for "${soundId}".`);
        const response = await fetch(source, { signal: this.preloadController.signal });
        if (!response.ok) throw new Error(`Failed to fetch "${soundId}" (${response.status}).`);
        const audioData = await response.arrayBuffer();
        if (this.disposed) return { soundId, success: false };
        const buffer = await this.context.decodeAudioData(audioData);
        if (this.disposed) return { soundId, success: false };
        this.buffers.set(soundId, buffer);
        this.errors.delete(soundId);
        return { soundId, success: true };
      } catch (error) {
        if (!this.disposed && error?.name !== 'AbortError') this.errors.set(soundId, error);
        return { soundId, success: false };
      }
    }));
    return {
      loaded: results.filter((result) => result.success).map((result) => result.soundId),
      failed: results.filter((result) => !result.success).map((result) => result.soundId),
    };
  }

  async unlock() {
    if (this.disposed) throw new Error('Audio engine has been disposed.');
    if (this.context.state === 'suspended') await this.context.resume();
    if (this.disposed) throw new Error('Audio engine has been disposed.');
  }

  play(soundId) {
    if (this.disposed) return null;
    const buffer = this.buffers.get(soundId);
    if (!buffer) return null;
    let instances = this.activeInstances.get(soundId);
    if (!instances) {
      instances = [];
      this.activeInstances.set(soundId, instances);
    }
    if (instances.length >= this.maxInstancesPerSound) {
      const oldestSource = instances.shift();
      if (oldestSource) {
        try {
          oldestSource.onended = null;
          oldestSource.stop();
          oldestSource.disconnect();
        } catch {
          // Older source can already have ended.
        }
      }
    }
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.analyser ?? this.context.destination);
    instances.push(source);
    source.onended = () => {
      const current = this.activeInstances.get(soundId);
      if (!current) return;
      const index = current.indexOf(source);
      if (index !== -1) current.splice(index, 1);
      try { source.disconnect(); } catch { /* node already disconnected */ }
      source.onended = null;
      if (current.length === 0) this.activeInstances.delete(soundId);
      this.notifyActivity();
    };
    try {
      source.start(0);
      this.notifyActivity();
    } catch {
      const index = instances.indexOf(source);
      if (index !== -1) instances.splice(index, 1);
      try { source.disconnect(); } catch { /* node already disconnected */ }
      source.onended = null;
      if (instances.length === 0) this.activeInstances.delete(soundId);
      return null;
    }
    return source;
  }

  /** Notifies the UI only when playback activity changes. */
  setActivityListener(listener) {
    this.onActivityChange = listener;
  }

  notifyActivity() {
    this.onActivityChange?.(this.activeInstances.size > 0);
  }

  /** Actual output amplitude expressed in digital dBFS; silence is -Infinity. */
  readDbfs() {
    if (this.disposed || !this.analyser || !this.sampleBuffer) return null;
    try { this.analyser.getFloatTimeDomainData(this.sampleBuffer); } catch { return null; }
    let power = 0;
    for (const value of this.sampleBuffer) power += value * value;
    const rms = Math.sqrt(power / this.sampleBuffer.length);
    return rms === 0 ? -Infinity : 20 * Math.log10(rms);
  }

  /** Required for React unmount / StrictMode effect re-execution. */
  async dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.preloadController.abort();
    for (const instances of this.activeInstances.values()) {
      for (const source of instances) {
        source.onended = null;
        try { source.stop(); } catch { /* already stopped */ }
        try { source.disconnect(); } catch { /* already disconnected */ }
      }
    }
    this.activeInstances.clear();
    this.notifyActivity();
    this.onActivityChange = null;
    try { this.analyser?.disconnect(); } catch { /* already disconnected */ }
    this.analyser = null;
    this.sampleBuffer = null;
    this.buffers.clear();
    this.errors.clear();
    if (this.context.state !== 'closed') await this.context.close();
  }
}
