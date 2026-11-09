import { useCallback, useEffect, useState } from 'react';
import { PianoKeyboard } from './components/PianoKeyboard.jsx';
import { PIANO_KEYS } from './utils/generatePianoKeys.js';

export default function App() {
  const [pressedNotes, setPressedNotes] = useState(() => new Set());

  // Functional updates ensure callbacks never depend on pressedNotes.
  const onNoteOn = useCallback((midi) => {
    setPressedNotes((previous) => {
      if (previous.has(midi)) return previous;
      const next = new Set(previous);
      next.add(midi);
      return next;
    });
  }, []);

  const onNoteOff = useCallback((midi) => {
    setPressedNotes((previous) => {
      if (!previous.has(midi)) return previous;
      const next = new Set(previous);
      next.delete(midi);
      return next;
    });
  }, []);

  // Focus changes outside the app must never leave a pressed key stuck.
  useEffect(() => {
    const releaseAll = () => setPressedNotes((previous) => previous.size ? new Set() : previous);
    window.addEventListener('blur', releaseAll);
    return () => window.removeEventListener('blur', releaseAll);
  }, []);

  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="eyebrow">HW2 · Phase C</p>
        <h1>88-Key Polyphonic Piano</h1>
        <p>Memoized 88-key piano with reliable pointer and keyboard controls. Sound and sequencing are not implemented yet.</p>
      </header>
      <PianoKeyboard pressedNotes={pressedNotes} onNoteOn={onNoteOn} onNoteOff={onNoteOff} />
      <section className="status-panel" aria-label="Keyboard information">
        <p><strong>{PIANO_KEYS.length}</strong> generated keys · 52 white · 36 black · A0–C8</p>
        <p role="status" aria-live="polite">{pressedNotes.size === 0
          ? 'No keys pressed.'
          : `${pressedNotes.size} ${pressedNotes.size === 1 ? 'key' : 'keys'} pressed.`}</p>
      </section>
    </main>
  );
}
