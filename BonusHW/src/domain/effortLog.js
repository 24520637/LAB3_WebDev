/** Immutable append-only effort log — Phase 1 (T-03). */
export const EffortActor = Object.freeze({ EM: 'EM', AI_DO: 'AI_DO' });

// Values follow the WBS worked example (100 * 0.1; 1 * 50).
export const EFFORT_MULTIPLIER = Object.freeze({
  [EffortActor.EM]: 0.1,
  [EffortActor.AI_DO]: 50,
});

export const EffortAction = Object.freeze({ APPEND_EFFORT: 'APPEND_EFFORT' });

function validateSignal(signal) {
  if (!signal || typeof signal !== 'object' || Array.isArray(signal)) {
    throw new TypeError('Effort signal must be an object');
  }
  const { id, actor, steps, multiplier } = signal;
  if (typeof id !== 'string' || id.trim() === '') {
    throw new TypeError('Effort id must be a non-empty string');
  }
  if (!Object.hasOwn(EFFORT_MULTIPLIER, actor)) {
    throw new TypeError('Effort actor must be EM or AI_DO');
  }
  if (typeof steps !== 'number' || !Number.isFinite(steps) || steps < 0) {
    throw new RangeError('Effort steps must be a finite non-negative number');
  }
  if (typeof multiplier !== 'number' || !Number.isFinite(multiplier) || multiplier < 0) {
    throw new RangeError('Effort multiplier must be a finite non-negative number');
  }
  if (multiplier !== EFFORT_MULTIPLIER[actor]) {
    throw new RangeError(`Invalid multiplier for ${actor}`);
  }
  if (!Number.isFinite(steps * multiplier)) {
    throw new RangeError('Effort impact must be finite');
  }
  return Object.freeze({ id, actor, steps, multiplier });
}

/**
 * Pure reducer. Returns new array and new immutable record for each append.
 * Invalid payloads throw before any changes to the previous log.
 */
export function effortLogReducer(log = [], action) {
  if (!Array.isArray(log)) throw new TypeError('Effort log must be an array');
  if (!action || typeof action !== 'object' || Array.isArray(action)) {
    throw new TypeError('Effort action must be an object');
  }
  if (action.type !== EffortAction.APPEND_EFFORT) {
    throw new TypeError(`Unknown effort action: ${String(action.type)}`);
  }
  const entry = validateSignal(action.signal);
  if (log.some(existing => existing.id === entry.id)) {
    throw new Error(`Duplicate effort id: ${entry.id}`);
  }
  return [...log, entry];
}
