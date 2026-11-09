import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { DRUM_PADS } from '../data/pads.js';
import { drumReducer, initialDrumState } from '../state/drumState.js';
import { useDrumKeyboard } from '../hooks/useDrumKeyboard.js';
import DrumPad from './DrumPad.jsx';

/** Buttons and physical keys share one hit-processing pathway. */
export default function DrumKit() {
  const [drumState, dispatch] = useReducer(drumReducer, initialDrumState);
  const padMap = useMemo(() => new Map(DRUM_PADS.map((pad) => [pad.code, pad])), []);

  const onHit = useCallback((padId, activate = true) => {
    dispatch({ type: 'HIT', padId, activate });
  }, []);
  const onActiveChange = useCallback((padId) => {
    dispatch({ type: 'SET_ACTIVE', padId });
  }, []);

  const onNativePress = useCallback((padId) => {
    dispatch({ type: 'SET_NATIVE_PRESSED', padId });
  }, []);
  const onNativeRelease = useCallback((padId) => {
    dispatch({ type: 'RELEASE_NATIVE_PRESSED', padId });
  }, []);

  // A lost window focus must never strand native pressed state.
  useEffect(() => {
    const resetNativePress = () => dispatch({ type: 'SET_NATIVE_PRESSED', padId: null });
    window.addEventListener('blur', resetNativePress);
    return () => window.removeEventListener('blur', resetNativePress);
  }, []);

  useDrumKeyboard(padMap, onHit, onActiveChange);

  return (
    <section className="drum-kit" aria-label="Drum pads">
      <div className="drum-pad-grid">
        {DRUM_PADS.map((pad) => (
          <DrumPad
            key={pad.id}
            pad={pad}
            isActive={
              drumState.activePadId === pad.id ||
              drumState.nativePressedPadId === pad.id
            }
            onPress={onNativePress}
            onRelease={onNativeRelease}
            onHit={onHit}
          />
        ))}
      </div>
    </section>
  );
}
