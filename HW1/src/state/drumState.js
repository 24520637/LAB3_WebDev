import { DRUM_PADS } from '../data/pads.js';

export const MAX_HIT_HISTORY = 20;

export const initialDrumState = Object.freeze({
  activePadId: null,
  nativePressedPadId: null,
  nextHitId: 1,
  hitHistory: [],
});

const PAD_IDS = new Set(DRUM_PADS.map((pad) => pad.id));

/**
 * Pure reducer. Every input source can dispatch the same HIT action.
 * History is newest-first and IDs remain unique even when hits are rapid.
 */
export function drumReducer(state, action) {
  switch (action.type) {
    case 'HIT': {
      if (!PAD_IDS.has(action.padId)) return state;

      return {
        ...state,
        // Native clicks are momentary; don't overwrite a held physical key.
        activePadId: action.activate === false ? state.activePadId : action.padId,
        nextHitId: state.nextHitId + 1,
        hitHistory: [
          { id: state.nextHitId, padId: action.padId },
          ...state.hitHistory,
        ].slice(0, MAX_HIT_HISTORY),
      };
    }

    // Native pointer/Enter/Space press is independent of held physical drum keys.
    // These are momentary states, NOT persistent on/off toggles.
    case 'SET_NATIVE_PRESSED':
      if (action.padId !== null && !PAD_IDS.has(action.padId)) return state;
      return state.nativePressedPadId === action.padId
        ? state
        : { ...state, nativePressedPadId: action.padId };

    case 'RELEASE_NATIVE_PRESSED':
      return state.nativePressedPadId === action.padId
        ? { ...state, nativePressedPadId: null }
        : state;

    case 'SET_ACTIVE':
      if (action.padId !== null && !PAD_IDS.has(action.padId)) return state;
      return state.activePadId === action.padId
        ? state
        : { ...state, activePadId: action.padId };

    case 'RELEASE':
      return state.activePadId === action.padId
        ? { ...state, activePadId: null }
        : state;

    default:
      return state;
  }
}
