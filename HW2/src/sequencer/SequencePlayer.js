/** One playback coordinator. Note-on events are FIFO; note-offs have independent deadlines.
 * A single coordinator may own many simultaneous synth voices. No React dependency.
 */
export class SequencePlayer {
  constructor({ synth, now = () => performance.now(),
    // Window timers require their global receiver when called in a browser.
    setTimer = (callback, delay) => globalThis.setTimeout(callback, delay),
    clearTimer = (handle) => globalThis.clearTimeout(handle),
    onNoteStart = () => {}, onNoteEnd = () => {},
    onStatusChange = () => {} } = {}) {
    if (!synth || typeof synth.noteOn !== 'function' || typeof synth.noteOff !== 'function') {
      throw new TypeError('SequencePlayer requires a synthesizer.');
    }
    this.synth = synth;
    this.now = now;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.onNoteStart = onNoteStart;
    this.onNoteEnd = onNoteEnd;
    this.onStatusChange = onStatusChange;
    this.current = null;
    this.disposed = false;
  }

  get isPlaying() { return this.current !== null; }

  /** Start synchronously on the user's Play gesture; returns one completion promise. */
  play(sequence, speed = 1) {
    if (this.disposed) throw new Error('Sequence player is disposed.');
    if (this.current) return this.current.promise; // duplicate Play never forks a worker
    if (![0.5, 1, 2].includes(speed)) throw new RangeError('Playback speed must be 0.5, 1, or 2.');
    if (!Array.isArray(sequence)) throw new TypeError('Sequence must be an array.');
    let onset = 0;
    const notes = sequence.map((note, order) => {
      if (!note || !Number.isInteger(note.midi) || note.midi < 21 || note.midi > 108 ||
          !Number.isFinite(note.freqHz) || note.freqHz <= 0 ||
          !Number.isFinite(note.deltaMs) || note.deltaMs < 0 ||
          !Number.isFinite(note.durationMs) || note.durationMs < 0) {
        throw new RangeError(`Invalid recorded note at index ${order}.`);
      }
      onset += note.deltaMs / speed;
      if (!Number.isFinite(onset)) throw new RangeError('Sequence duration is too large.');
      return { midi: note.midi, freqHz: note.freqHz, onset, duration: note.durationMs / speed };
    });
    if (notes.length === 0) return Promise.resolve({ status: 'completed' });

    let resolve;
    const promise = new Promise((done) => { resolve = done; });
    const run = {
      promise, resolve, controller: new AbortController(), notes, index: 0,
      epoch: this.now(), nextTimer: null, releases: new Set(),
      owned: new Map(), // note instance -> {midi, voice}; never release somebody else's voice
    };
    this.current = run;
    this.onStatusChange('playing');

    const finish = (status, error) => {
      if (this.current !== run) return;
      this.current = null;
      run.controller.abort();
      if (run.nextTimer !== null) this.clearTimer(run.nextTimer);
      for (const handle of run.releases) this.clearTimer(handle);
      run.releases.clear();
      for (const entry of run.owned.values()) this.releaseOwned(entry);
      run.owned.clear();
      this.onStatusChange(status, error);
      resolve(error ? { status, error } : { status });
    };
    run.finish = finish;

    const completeIfDone = () => {
      if (run.index === notes.length && run.owned.size === 0) finish('completed');
    };

    const scheduleRelease = (entry, deadline) => {
      const release = () => {
        if (this.current !== run || run.controller.signal.aborted) return;
        run.releases.delete(handle);
        this.releaseOwned(entry);
        run.owned.delete(entry);
        completeIfDone();
      };
      // Timers are never shared with note-on scheduling; overlapping notes stay audible.
      const handle = this.setTimer(release, Math.max(0, deadline - this.now()));
      run.releases.add(handle);
    };

    const processStarts = () => {
      if (this.current !== run || run.controller.signal.aborted) return;
      run.nextTimer = null;
      try {
        const t = this.now();
        while (run.index < notes.length && run.epoch + notes[run.index].onset <= t + 0.00001) {
          const note = notes[run.index++];
          // A same-MIDI voice already owned by a prior event cannot be doubled by the synth.
          // Release its predecessor before retriggering; other pitches remain overlapping.
          for (const entry of [...run.owned.keys()]) {
            if (entry.midi === note.midi) {
              this.releaseOwned(entry);
              run.owned.delete(entry);
            }
          }
          if (this.synth.noteOn(note.midi, note.freqHz)) {
            const entry = { midi: note.midi, voice: this.synth.voices?.get(note.midi) ?? null };
            run.owned.set(entry, entry);
            this.onNoteStart(note.midi);
            scheduleRelease(entry, run.epoch + note.onset + note.duration);
          }
        }
        if (run.index < notes.length) {
          run.nextTimer = this.setTimer(processStarts, Math.max(0, run.epoch + notes[run.index].onset - this.now()));
        } else completeIfDone();
      } catch (error) { finish('error', error); }
    };
    // First notes with deltaMs=0 begin in this call, preserving the audio user gesture.
    processStarts();
    return promise;
  }

  releaseOwned(entry) {
    // Only release the exact voice this run started. A stolen/replaced note may now
    // belong to a physical key or a newer occurrence of the same MIDI.
    if (!entry.voice || this.synth.voices?.get(entry.midi) === entry.voice) {
      this.synth.noteOff(entry.midi);
      this.onNoteEnd(entry.midi);
    }
  }

  stop() {
    if (!this.current) return false;
    this.current.finish('stopped');
    return true;
  }

  dispose() {
    if (this.disposed) return;
    this.stop();
    this.disposed = true;
  }
}
