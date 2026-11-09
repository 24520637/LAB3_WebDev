import { useEffect } from 'react';
import { createDrumKeyboardController } from './drumKeyboardController.js';

/** Bridge physical-key events to the same callback used by native buttons. */
export function useDrumKeyboard(padMap, onHit, onActiveChange, isEnabled = true) {
  useEffect(() => {
    if (!isEnabled) return undefined;
    return createDrumKeyboardController({
      hostWindow: window,
      padMap,
      onHit,
      onActiveChange,
    });
  }, [padMap, onHit, onActiveChange, isEnabled]);
}
