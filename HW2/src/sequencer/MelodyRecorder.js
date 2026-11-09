/** Records note-on order and overlapping note durations using a monotonic clock. */
export class MelodyRecorder {
  constructor({ now = () => performance.now() } = {}) {
    this.now = now;
    this.recording = false;
    this.startedAt = 0;
    this.pending = new Map();
    this.events = [];
    this.sequence = 0;
  }

  start() {
    this.recording = true;
    this.startedAt = this.now();
    this.pending.clear();
    this.events = [];
    this.sequence = 0;
  }

  noteOn(midi, freqHz) {
    if (!this.recording || this.pending.has(midi)) return false;
    if (!Number.isInteger(midi) || midi < 21 || midi > 108 || !Number.isFinite(freqHz) || freqHz <= 0) {
      throw new RangeError('Invalid recorded note.');
    }
    const time = Math.max(0, this.now() - this.startedAt);
    this.pending.set(midi, { midi, freqHz, startMs: time, order: this.sequence++ });
    return true;
  }

  noteOff(midi) {
    if (!this.recording) return false;
    const note = this.pending.get(midi);
    if (!note) return false;
    this.pending.delete(midi);
    this.events.push({ ...note, durationMs: Math.max(0, this.now() - this.startedAt - note.startMs) });
    return true;
  }

  /** Snapshot may include held notes; event order follows note starts, NOT releases. */
  snapshot({ includeHeld = false } = {}) {
    const elapsed = Math.max(0, this.now() - this.startedAt);
    const notes = [...this.events, ...(includeHeld && this.recording
      ? [...this.pending.values()].map((note) => ({ ...note, durationMs: Math.max(0, elapsed - note.startMs) }))
      : [])].sort((a, b) => a.startMs - b.startMs || a.order - b.order);
    let previousStart = 0;
    return notes.map(({ midi, freqHz, durationMs, startMs }) => {
      const event = Object.freeze({ midi, freqHz, durationMs, deltaMs: startMs - previousStart });
      previousStart = startMs;
      return event;
    });
  }

  stop() {
    if (!this.recording) return this.snapshot();
    // Capture one timestamp for all held-note closures, preserving chords.
    const elapsed = Math.max(0, this.now() - this.startedAt);
    for (const note of this.pending.values()) {
      this.events.push({ ...note, durationMs: Math.max(0, elapsed - note.startMs) });
    }
    this.pending.clear();
    this.recording = false;
    return this.snapshot();
  }

  clear() {
    this.recording = false;
    this.pending.clear();
    this.events = [];
    this.startedAt = 0;
    this.sequence = 0;
  }
}
