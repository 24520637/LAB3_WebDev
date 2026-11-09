/** One FIFO replay coordinator. Starts are ordered; independent note-off timers allow chords.
 * AbortController owns each run; all timers and audio entries are cleaned on cancellation.
 */
export class SequencePlayer {
  constructor({ synth, now = () => performance.now(),
    setTimer = (callback, delay) => globalThis.setTimeout(callback, delay),
    clearTimer = (handle) => globalThis.clearTimeout(handle),
    onNoteStart = () => {}, onNoteEnd = () => {}, onStatusChange = () => {} } = {}) {
    if (!synth || typeof synth.noteOn !== 'function' || typeof synth.noteOff !== 'function') {
      throw new TypeError('SequencePlayer requires a synthesizer.');
    }
    Object.assign(this, { synth, now, setTimer, clearTimer, onNoteStart, onNoteEnd, onStatusChange });
    this.current = null;
    this.disposed = false;
  }

  get isPlaying() { return this.current !== null; }
  get signal() { return this.current?.controller.signal ?? null; }

  play(sequence, speed = 1) {
    if (this.disposed) throw new Error('Sequence player is disposed.');
    if (this.current) return this.current.promise;
    if (![0.5, 1, 2].includes(speed)) throw new RangeError('Playback speed must be 0.5, 1, or 2.');
    if (!Array.isArray(sequence)) throw new TypeError('Sequence must be an array.');
    let onset = 0;
    const notes = sequence.map((note, index) => {
      if (!note || !Number.isInteger(note.midi) || note.midi < 21 || note.midi > 108 ||
          !Number.isFinite(note.freqHz) || note.freqHz <= 0 ||
          !Number.isFinite(note.deltaMs) || note.deltaMs < 0 ||
          !Number.isFinite(note.durationMs) || note.durationMs < 0) {
        throw new RangeError(`Invalid recorded note at index ${index}.`);
      }
      onset += note.deltaMs / speed;
      const duration = note.durationMs / speed;
      if (!Number.isFinite(onset) || !Number.isFinite(duration)) {
        throw new RangeError('Sequence duration is too large.');
      }
      return { midi: note.midi, freqHz: note.freqHz, onset, duration };
    });
    if (!notes.length) return Promise.resolve({ status: 'completed' });

    let resolve;
    const promise = new Promise((done) => { resolve = done; });
    const run = {
      controller: new AbortController(), promise, resolve, notes,
      epoch: this.now(), index: 0, nextTimer: null,
      releases: new Set(), owned: new Set(), settled: false,
    };
    this.current = run;
    const active = () => this.current === run && !run.settled && !run.controller.signal.aborted;

    const clearScheduled = () => {
      if (run.nextTimer !== null) {
        this.clearTimer(run.nextTimer);
        run.nextTimer = null;
      }
      for (const handle of run.releases) this.clearTimer(handle);
      run.releases.clear();
    };
    const finish = (status, error) => {
      if (run.settled) return;
      run.settled = true;
      // Invalidate stale callbacks *before* releasing voices or publishing state.
      if (this.current === run) this.current = null;
      if (!run.controller.signal.aborted) run.controller.abort();
      run.controller.signal.removeEventListener('abort', onAbort);
      clearScheduled();
      for (const entry of run.owned) this.releaseOwned(entry);
      run.owned.clear();
      try { this.onStatusChange(status, error); } finally {
        resolve(error ? { status, error } : { status });
      }
    };
    const onAbort = () => finish('stopped');
    run.controller.signal.addEventListener('abort', onAbort, { once: true });
    run.finish = finish;

    const completeIfDone = () => {
      if (active() && run.index === notes.length && run.owned.size === 0) finish('completed');
    };
    const scheduleRelease = (entry, deadline) => {
      let handle;
      const release = () => {
        if (!active()) return;
        run.releases.delete(handle);
        this.releaseOwned(entry);
        run.owned.delete(entry);
        completeIfDone();
      };
      handle = this.setTimer(release, Math.max(0, deadline - this.now()));
      run.releases.add(handle);
    };
    const processStarts = () => {
      if (!active()) return;
      run.nextTimer = null;
      try {
        const currentTime = this.now();
        while (active() && run.index < notes.length && run.epoch + notes[run.index].onset <= currentTime + 0.00001) {
          const note = notes[run.index++];
          // One sounding voice per MIDI: a later same-note event supersedes it.
          for (const entry of [...run.owned]) {
            if (entry.midi === note.midi) {
              this.releaseOwned(entry);
              run.owned.delete(entry);
            }
          }
          if (this.synth.noteOn(note.midi, note.freqHz)) {
            const entry = { midi: note.midi, voice: this.synth.voices?.get(note.midi) ?? null };
            run.owned.add(entry);
            this.onNoteStart(note.midi);
            if (!active()) break;
            scheduleRelease(entry, run.epoch + note.onset + note.duration);
          }
        }
        if (active() && run.index < notes.length) {
          run.nextTimer = this.setTimer(processStarts, Math.max(0, run.epoch + notes[run.index].onset - this.now()));
        } else completeIfDone();
      } catch (error) {
        if (active()) finish('error', error);
      }
    };
    try {
      this.onStatusChange('playing');
      if (active()) processStarts();
    } catch (error) { if (active()) finish('error', error); }
    return promise;
  }

  releaseOwned(entry) {
    // Do not release a newer physical/replayed voice replacing the owned voice.
    if (!entry.voice || this.synth.voices?.get(entry.midi) === entry.voice) {
      this.synth.noteOff(entry.midi);
      this.onNoteEnd(entry.midi);
    }
  }

  stop() {
    const run = this.current;
    if (!run) return false;
    run.controller.abort(); // abort listener settles, cleans timers, releases owned voices
    return true;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
  }
}
