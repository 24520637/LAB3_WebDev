import { useCallback, useEffect, useReducer, useRef } from 'react';
import {
  GhostingAction,
  createGhostingState,
  ghostingReducer,
} from '../domain/ghostingState.js';
import { scheduleGhostingTimeout } from '../domain/ghostingTimer.js';

/**
 * Headless React lifecycle for the message-triggered ghosting timer.
 * The hook owns one canonical relationship phase and no UI or effort state.
 */
export function useGhostingLifecycle(initialPhase) {
  const [state, dispatch] = useReducer(ghostingReducer, initialPhase, createGhostingState);
  const nextMessageId = useRef(0);
  const pending = state.pendingMessage;

  useEffect(() => {
    if (state.phase !== 'DATING_NO_LOVE' || !pending) return undefined;
    return scheduleGhostingTimeout(pending, identity => {
      dispatch({ type: GhostingAction.REPLY_TIMEOUT, ...identity });
    });
  }, [state.phase, pending?.id, pending?.sequence, pending?.deadline]);

  const sendMessage = useCallback(() => {
    nextMessageId.current += 1;
    const id = `message-${nextMessageId.current}`;
    dispatch({
      type: GhostingAction.SEND_MESSAGE,
      id,
      sentAt: performance.now(),
    });
    return id;
  }, []);

  const receiveReply = useCallback((id, sequence) => {
    dispatch({
      type: GhostingAction.RECEIVE_REPLY,
      id,
      sequence,
      receivedAt: performance.now(),
    });
  }, []);

  const stop = useCallback(() => dispatch({ type: GhostingAction.STOP }), []);
  const changeRelationship = useCallback(event => {
    dispatch({ type: GhostingAction.RELATIONSHIP_EVENT, event });
  }, []);

  return {
    phase: state.phase,
    pendingMessage: pending,
    sendMessage,
    receiveReply,
    stop,
    changeRelationship,
  };
}
