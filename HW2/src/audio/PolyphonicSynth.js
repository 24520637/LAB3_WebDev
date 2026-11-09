/** An eight-voice Web Audio oscillator pool. No React or DOM dependencies. */
const MIN_GAIN = 0.0001;
const RELEASE_SECONDS = 0.04;

export class PolyphonicSynth {
  constructor({ maxVoices = 8, createContext = () => {
    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextClass) throw new Error('Web Audio API is not supported.');
    return new AudioContextClass();
  }, onVoiceStolen = () => {}, onError = () => {} } = {}) {
    if (!Number.isInteger(maxVoices) || maxVoices < 1) throw new RangeError('maxVoices must be a positive integer.');
    this.maxVoices = maxVoices;
    this.createContext = createContext;
    this.onVoiceStolen = onVoiceStolen;
    this.onError = onError;
    this.ctx = null;
    this.master = null;
    this.voices = new Map(); // MIDI -> voice, insertion order is FIFO
    this.releasing = new Set();
    this.disposed = false;
  }

  ensureContext() {
    if (this.disposed) throw new Error('Synthesizer is disposed.');
    if (!this.ctx) {
      this.ctx = this.createContext();
      this.master = this.ctx.createGain();
      this.master.gain.setValueAtTime(0.65, this.ctx.currentTime);
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      // Call resume directly within the user input event (browser autoplay policy).
      try {
        Promise.resolve(this.ctx.resume()).catch((error) => {
          if (!this.disposed) this.onError(error);
        });
      } catch (error) { this.onError(error); }
    }
    return this.ctx;
  }

  /** Returns true only when a new voice was started; duplicate MIDI is ignored. */
  noteOn(midi, freqHz) {
    if (this.disposed) return false;
    if (!Number.isInteger(midi) || midi < 21 || midi > 108 || !Number.isFinite(freqHz) || freqHz <= 0) {
      throw new RangeError('Expected a valid piano MIDI note and positive frequency.');
    }
    if (this.voices.has(midi)) return false;
    const ctx = this.ensureContext();
    // Prepare and successfully start the next voice before evicting a valid one.
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    let started = false;
    try {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqHz, ctx.currentTime);
      gain.gain.setValueAtTime(MIN_GAIN, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.012);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start();
      started = true;
    } catch (error) {
      if (started) { try { osc.stop(); } catch { /* already stopped */ } }
      try { osc.disconnect(); } catch { /* ignore */ }
      try { gain.disconnect(); } catch { /* ignore */ }
      throw error;
    }
    if (this.voices.size >= this.maxVoices) {
      const oldest = this.voices.keys().next().value;
      this.noteOff(oldest);
      try { this.onVoiceStolen(oldest); } catch (error) { this.onError(error); }
    }
    const voice = { midi, osc, gain, stopped: false, cleaned: false };
    const cleanup = () => {
      if (voice.cleaned) return;
      voice.cleaned = true;
      this.releasing.delete(voice);
      if (this.voices.get(midi) === voice) this.voices.delete(midi);
      osc.onended = null;
      try { osc.disconnect(); } catch { /* ignore */ }
      try { gain.disconnect(); } catch { /* ignore */ }
    };
    voice.cleanup = cleanup;
    osc.onended = cleanup;
    this.voices.set(midi, voice);
    return true;
  }

  noteOff(midi) {
    const voice = this.voices.get(midi);
    if (!voice) return false;
    this.voices.delete(midi);
    this.releasing.add(voice);
    const now = this.ctx.currentTime;
    const param = voice.gain.gain;
    try {
      param.cancelScheduledValues(now);
      // Establish a positive current value before an exponential release.
      const current = Number.isFinite(param.value) ? Math.max(MIN_GAIN, param.value) : MIN_GAIN;
      param.setValueAtTime(current, now);
      param.exponentialRampToValueAtTime(MIN_GAIN, now + RELEASE_SECONDS);
      voice.osc.stop(now + RELEASE_SECONDS + 0.005);
      voice.stopped = true;
    } catch (error) {
      try { if (!voice.stopped) voice.osc.stop(); } catch { /* already stopped */ }
      voice.cleanup();
      this.onError(error);
    }
    return true;
  }

  /** Releases every active note with a short fade. */
  allNotesOff() {
    for (const midi of [...this.voices.keys()]) this.noteOff(midi);
  }

  /** Hard cleanup is reserved for final disposal; release tails may be truncated. */
  async dispose() {
    if (this.disposed) return;
    this.disposed = true;
    const all = new Set([...this.voices.values(), ...this.releasing]);
    this.voices.clear();
    this.releasing.clear();
    for (const voice of all) {
      try { if (!voice.stopped) voice.osc.stop(); } catch { /* ignore */ }
      voice.cleanup();
    }
    try { this.master?.disconnect(); } catch { /* ignore */ }
    this.master = null;
    const ctx = this.ctx;
    this.ctx = null;
    if (ctx && ctx.state !== 'closed') await ctx.close();
  }
}
