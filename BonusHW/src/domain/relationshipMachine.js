/** Pure relationship state machine — Phase 1 (T-02). No React or DOM dependencies. */
export const RelationshipPhase = Object.freeze({
  FRIENDS: 'FRIENDS',
  DATING_NO_LOVE: 'DATING_NO_LOVE',
  OFFICIAL_LOVE: 'OFFICIAL_LOVE',
  GHOSTED_EXIT: 'GHOSTED_EXIT',
});

export const RelationshipEvent = Object.freeze({
  START_DATING: 'START_DATING',
  CONFIRM_MUTUAL_COMMITMENT: 'CONFIRM_MUTUAL_COMMITMENT',
  EXIT: 'EXIT',
});

const TRANSITIONS = Object.freeze({
  [RelationshipPhase.FRIENDS]: Object.freeze({
    [RelationshipEvent.START_DATING]: RelationshipPhase.DATING_NO_LOVE,
  }),
  [RelationshipPhase.DATING_NO_LOVE]: Object.freeze({
    [RelationshipEvent.CONFIRM_MUTUAL_COMMITMENT]: RelationshipPhase.OFFICIAL_LOVE,
    [RelationshipEvent.EXIT]: RelationshipPhase.GHOSTED_EXIT,
  }),
  [RelationshipPhase.OFFICIAL_LOVE]: Object.freeze({}),
  [RelationshipPhase.GHOSTED_EXIT]: Object.freeze({}),
});

/**
 * Unknown inputs and prohibited transitions throw; callers can catch errors
 * and leave their existing phase unchanged. No reset event is defined.
 * @param {string} phase
 * @param {string} event
 * @returns {string}
 */
export function transitionRelationship(phase, event) {
  if (!Object.values(RelationshipPhase).includes(phase)) {
    throw new TypeError(`Unknown relationship phase: ${String(phase)}`);
  }
  if (!Object.values(RelationshipEvent).includes(event)) {
    throw new TypeError(`Unknown relationship event: ${String(event)}`);
  }
  const nextPhase = TRANSITIONS[phase][event];
  if (nextPhase === undefined) {
    throw new Error(`Invalid relationship transition: ${phase} + ${event}`);
  }
  return nextPhase;
}

/** Pure reducer entry point; stores exactly one canonical phase string. */
export function relationshipReducer(phase = RelationshipPhase.FRIENDS, action) {
  if (!action || typeof action !== 'object' || Array.isArray(action)) {
    throw new TypeError('Relationship action must be an object');
  }
  return transitionRelationship(phase, action.type);
}
