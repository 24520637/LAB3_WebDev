import { useCallback, useEffect, useRef, useState } from 'react';
import { createDrumAudioController } from '../audio/drumAudioController.js';

/** Preload during effect; actual unlock/play is initiated only by user actions. */
export function useDrumAudio() {
  const controllerRef = useRef(null);
  const [audioError, setAudioError] = useState('');

  useEffect(() => {
    const controller = createDrumAudioController({ onError: setAudioError });
    controllerRef.current = controller;
    void controller.preload();
    return () => {
      controllerRef.current = null;
      void controller.dispose().catch(() => {
        // Cleanup is best-effort; the audio context has already been detached.
      });
    };
  }, []);

  const playPad = useCallback((padId) => {
    // Must be invoked synchronously from the original user event handler.
    void controllerRef.current?.trigger(padId);
  }, []);

  return { playPad, audioError };
}
