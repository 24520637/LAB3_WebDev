import { useCallback, useEffect, useRef, useState } from 'react';
import { PianoKeyboard } from './components/PianoKeyboard.jsx';
import { PIANO_KEYS } from './utils/generatePianoKeys.js';
import { PolyphonicSynth } from './audio/PolyphonicSynth.js';
import { MelodyRecorder } from './sequencer/MelodyRecorder.js';
import { SequencePlayer } from './sequencer/SequencePlayer.js';

const NOTES_BY_MIDI = new Map(PIANO_KEYS.map((note) => [note.midi, note]));

export default function App() {
  const [pressedNotes, setPressedNotes] = useState(() => new Set());
  const [audioError, setAudioError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedNotes, setRecordedNotes] = useState([]);
  const synthRef = useRef(null);
  const playerRef = useRef(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [playbackStatus, setPlaybackStatus] = useState('idle');
  const recorderRef = useRef(null);
  if (!recorderRef.current) recorderRef.current = new MelodyRecorder();

  const onStolen = useCallback((midi) => {
    recorderRef.current.noteOff(midi);
    setPressedNotes((previous) => {
      if (!previous.has(midi)) return previous;
      const next = new Set(previous);
      next.delete(midi);
      return next;
    });
  }, []);

  const onNoteOn = useCallback((midi) => {
    const note = NOTES_BY_MIDI.get(midi);
    if (!note) return;
    try {
      if (!synthRef.current) {
        synthRef.current = new PolyphonicSynth({
          onVoiceStolen: onStolen,
          onError: () => setAudioError('The audio device could not play a note.'),
        });
      }
      const started = synthRef.current.noteOn(midi, note.freqHz);
      if (!started) return;
      recorderRef.current.noteOn(midi, note.freqHz);
      setAudioError('');
      setPressedNotes((previous) => {
        if (previous.has(midi)) return previous;
        const next = new Set(previous);
        next.add(midi);
        return next;
      });
    } catch {
      setAudioError('Audio is unavailable. Check browser audio permissions or device support.');
    }
  }, [onStolen]);

  const onNoteOff = useCallback((midi) => {
    synthRef.current?.noteOff(midi);
    recorderRef.current.noteOff(midi);
    setPressedNotes((previous) => {
      if (!previous.has(midi)) return previous;
      const next = new Set(previous);
      next.delete(midi);
      return next;
    });
  }, []);

  const startRecording = useCallback(() => {
    playerRef.current?.stop();
    recorderRef.current.start();
    setRecordedNotes([]);
    setIsRecording(true);
    // Held notes predate the recording and should not start halfway through.
  }, []);
  const stopRecording = useCallback(() => {
    setRecordedNotes(recorderRef.current.stop());
    setIsRecording(false);
  }, []);
  const clearRecording = useCallback(() => {
    playerRef.current?.stop();
    recorderRef.current.clear();
    setRecordedNotes([]);
    setIsRecording(false);
  }, []);

  const playSequence = useCallback(() => {
    if (isRecording || recordedNotes.length === 0 || playerRef.current?.isPlaying) return;
    try {
      if (!synthRef.current) {
        synthRef.current = new PolyphonicSynth({
          onVoiceStolen: onStolen,
          onError: () => setAudioError('The audio device could not play a note.'),
        });
      }
      if (!playerRef.current) {
        playerRef.current = new SequencePlayer({
          synth: synthRef.current,
          onNoteStart: (midi) => setPressedNotes((old) => new Set(old).add(midi)),
          onNoteEnd: (midi) => setPressedNotes((old) => {
            if (synthRef.current?.voices.has(midi)) return old;
            const next = new Set(old); next.delete(midi); return next;
          }),
          onStatusChange: (status, error) => {
            setPlaybackStatus(status);
            if (error) setAudioError('The sequence could not be played.');
          },
        });
      }
      // Unlock audio on the actual user gesture even when the recording starts
      // after a nonzero delta; browsers may reject autoplay from later timers.
      synthRef.current.ensureContext();
      setAudioError('');
      void playerRef.current.play(recordedNotes, playbackSpeed);
    } catch {
      setPlaybackStatus('error');
      setAudioError('Unable to start sequence playback.');
    }
  }, [isRecording, recordedNotes, playbackSpeed, onStolen]);

  const stopSequence = useCallback(() => playerRef.current?.stop(), []);

  useEffect(() => {
    const releaseAll = () => {
      synthRef.current?.allNotesOff();
      for (const midi of pressedNotesRef.current) recorderRef.current.noteOff(midi);
      pressedNotesRef.current = new Set();
      setPressedNotes((previous) => previous.size ? new Set() : previous);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') releaseAll();
    };
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', releaseAll);
      document.removeEventListener('visibilitychange', onVisibility);
      playerRef.current?.dispose();
      playerRef.current = null;
      void synthRef.current?.dispose().catch(() => {});
      synthRef.current = null;
    };
  }, []);

  // Use a ref so the global blur callback stays stable while notes change.
  const pressedNotesRef = useRef(pressedNotes);
  pressedNotesRef.current = pressedNotes;

  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="eyebrow">HW2 · Polyphonic Synthesizer & Recorder</p>
        <h1>88-Key Polyphonic Piano</h1>
        <p>Play overlapping chords with up to eight active notes. The ninth note releases the oldest voice. Record melodies, including overlapping note durations.</p>
      </header>
      <PianoKeyboard pressedNotes={pressedNotes} onNoteOn={onNoteOn} onNoteOff={onNoteOff} />
      <section className="status-panel" aria-label="Keyboard information">
        <p><strong>{PIANO_KEYS.length}</strong> generated keys · 52 white · 36 black · A0–C8</p>
        <p role="status" aria-live="polite">{pressedNotes.size === 0
          ? 'No active voices.'
          : `${pressedNotes.size} active ${pressedNotes.size === 1 ? 'voice' : 'voices'} (maximum 8).`}</p>
        {audioError && <p role="alert">{audioError}</p>}
      </section>
      <section className="status-panel recorder-panel" aria-label="Melody recorder">
        <h2>Note recorder</h2>
        <p>Record note starts and releases. Chords stay overlapping in the recorded timing. Replay notes in FIFO onset order while sustaining overlapping chords.</p>
        <div className="recorder-actions">
          <button type="button" onClick={startRecording} disabled={isRecording}>Start recording</button>
          <button type="button" onClick={stopRecording} disabled={!isRecording}>Stop recording</button>
          <button type="button" onClick={clearRecording}>Clear recording</button>
        </div>
        <div className="recorder-actions playback-controls">
          <label htmlFor="playback-speed">Playback speed</label>
          <select id="playback-speed" value={playbackSpeed} onChange={(event) => setPlaybackSpeed(Number(event.target.value))} disabled={playbackStatus === 'playing'}>
            <option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option>
          </select>
          <button type="button" onClick={playSequence} disabled={isRecording || recordedNotes.length === 0 || playbackStatus === 'playing'}>Play sequence</button>
          <button type="button" onClick={stopSequence} disabled={playbackStatus !== 'playing'}>Stop sequence</button>
        </div>
        <p role="status" aria-live="polite">{isRecording ? 'Recording notes…' : `${recordedNotes.length} notes recorded.`} Playback: {playbackStatus}.</p>
        {recordedNotes.length > 0 && (
          <div className="recording-scroll">
            <table>
              <caption>Recorded notes in FIFO onset order</caption>
              <thead><tr><th>Note</th><th>MIDI</th><th>Hz</th><th>Duration (ms)</th><th>Delta (ms)</th></tr></thead>
              <tbody>{recordedNotes.map((note, index) => (
                <tr key={`${index}-${note.midi}`}>
                  <td>{NOTES_BY_MIDI.get(note.midi)?.noteName}</td>
                  <td>{note.midi}</td><td>{note.freqHz.toFixed(2)}</td>
                  <td>{note.durationMs.toFixed(0)}</td><td>{note.deltaMs.toFixed(0)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
