import {
  RelationshipEvent,
  RelationshipPhase,
  transitionRelationship,
} from './relationshipMachine.js';

export const GhostingAction = Object.freeze({
  SEND_MESSAGE: 'SEND_MESSAGE',
  RECEIVE_REPLY: 'RECEIVE_REPLY',
  REPLY_TIMEOUT: 'REPLY_TIMEOUT',
  STOP: 'STOP',
  RELATIONSHIP_EVENT: 'RELATIONSHIP_EVENT',
});

export const REPLY_WINDOW_MS = 5000;

/** Pure initial state, independent of React. A relationship alone never starts a timer. */
export function createGhostingState(phase = RelationshipPhase.DATING_NO_LOVE) {
  if (!Object.values(RelationshipPhase).includes(phase)) {
    throw new TypeError('Invalid initial relationship phase');
  }
  return { phase, pendingMessage: null, messageSequence: 0 };
}

function validId(id) {
  return typeof id === 'string' && id.trim().length > 0;
}

/** Apply events atomically and ignore stale replies or timeout callbacks. */
export function ghostingReducer(state, action) {
  if (!state || typeof state !== 'object' || !action || typeof action !== 'object') {
    throw new TypeError('Invalid ghosting state/action');
  }

  switch (action.type) {
    case GhostingAction.SEND_MESSAGE: {
      if (state.phase !== RelationshipPhase.DATING_NO_LOVE) return state;
      if (!validId(action.id)) throw new TypeError('Message ID must be non-empty');
      if (!Number.isFinite(action.sentAt) || action.sentAt < 0) {
        throw new RangeError('sentAt must be a finite non-negative timestamp');
      }
      if (state.pendingMessage?.id === action.id) {
        throw new Error('A replacement message must use a new ID');
      }

      const deadline = action.sentAt + REPLY_WINDOW_MS;
      if (!Number.isFinite(deadline)) {
        throw new RangeError('Message deadline exceeds finite range');
      }
      const sequence = state.messageSequence + 1;
      if (!Number.isSafeInteger(sequence)) {
        throw new RangeError('Message sequence overflow');
      }

      return {
        ...state,
        messageSequence: sequence,
        pendingMessage: Object.freeze({ id: action.id, sequence, sentAt: action.sentAt, deadline }),
      };
    }

    case GhostingAction.RECEIVE_REPLY: {
      const pending = state.pendingMessage;
      if (!pending || state.phase !== RelationshipPhase.DATING_NO_LOVE ||
          action.id !== pending.id || action.sequence !== pending.sequence) return state;
      if (!Number.isFinite(action.receivedAt) || action.receivedAt < pending.sentAt ||
          action.receivedAt >= pending.deadline) return state;
      return { ...state, pendingMessage: null };
    }

    case GhostingAction.REPLY_TIMEOUT: {
      const pending = state.pendingMessage;
      if (!pending || state.phase !== RelationshipPhase.DATING_NO_LOVE ||
          action.id !== pending.id || action.sequence !== pending.sequence) return state;
      if (!Number.isFinite(action.now) || action.now < pending.deadline) return state;

      return {
        ...state,
        phase: transitionRelationship(state.phase, RelationshipEvent.EXIT),
        pendingMessage: null,
      };
    }

    case GhostingAction.STOP:
      if (state.phase !== RelationshipPhase.DATING_NO_LOVE) return state;
      return {
        ...state,
        phase: transitionRelationship(state.phase, RelationshipEvent.EXIT),
        pendingMessage: null,
      };

    case GhostingAction.RELATIONSHIP_EVENT:
      return {
        ...state,
        phase: transitionRelationship(state.phase, action.event),
        pendingMessage: null,
      };

    default:
      throw new TypeError(`Unknown ghosting action: ${String(action.type)}`);
  }
}
