import { useCallback, useEffect, useRef, useState } from 'react';
import { createDrumAudioController } from '../audio/drumAudioController.js';
import { createAudioLevelSampler } from '../audio/audioLevelSampler.js';

/** Preload during effect; only user actions call unlock/play. */
export function useDrumAudio() {
  const controllerRef = useRef(null);
  const [audioError, setAudioError] = useState('');
  const [dbfs, setDbfs] = useState(null);

  useEffect(() => {
    let sampler;
    const controller = createDrumAudioController({
      onError: setAudioError,
      onActivityChange: (active) => sampler?.setActive(active),
    });
    controllerRef.current = controller;
    sampler = createAudioLevelSampler({
      readDbfs: () => controller.readDbfs(),
      onLevel: setDbfs,
    });
    setDbfs(controller.readDbfs());
    void controller.preload();
    return () => {
      controllerRef.current = null;
      sampler.dispose();
      void controller.dispose().catch(() => {
        // Context disposal is best-effort on unmount.
      });
    };
  }, []);

  const playPad = useCallback((padId) => {
    // This is called directly from genuine button/key callbacks.
    void controllerRef.current?.trigger(padId);
  }, []);

  return { playPad, audioError, dbfs };
}
