/** Phase 2 (T-04): pure selectors over the Phase 1 append-only effort log. */
import { EFFORT_MULTIPLIER, EffortActor } from './effortLog.js';
import { RelationshipPhase } from './relationshipMachine.js';

/**
 * Calculate scores from the current log. Does not mutate or cache source data.
 * Signals are expected to have passed through the Phase 1 effortLogReducer.
 * @param {ReadonlyArray<{id: string, actor: 'EM'|'AI_DO', steps: number, multiplier: number}>} log
 * @returns {{emScore: number, rivalScore: number}}
 */
export function calculateEffortScores(log) {
  if (!Array.isArray(log)) throw new TypeError('Effort log must be an array');
  let emScore = 0;
  let rivalScore = 0;
  for (const signal of log) {
    if (!signal || typeof signal !== 'object' ||
        (signal.actor !== EffortActor.EM && signal.actor !== EffortActor.AI_DO) ||
        typeof signal.steps !== 'number' || !Number.isFinite(signal.steps) || signal.steps < 0 ||
        typeof signal.multiplier !== 'number' || !Number.isFinite(signal.multiplier) ||
        signal.multiplier < 0) {
      throw new TypeError('Invalid effort signal in log');
    }
    if (signal.multiplier !== EFFORT_MULTIPLIER[signal.actor]) {
      throw new RangeError(`Invalid multiplier for ${signal.actor}`);
    }
    const impact = signal.steps * signal.multiplier;
    if (!Number.isFinite(impact)) throw new RangeError('Effort impact is not finite');
    if (signal.actor === EffortActor.EM) emScore += impact;
    else rivalScore += impact;
    if (!Number.isFinite(emScore) || !Number.isFinite(rivalScore)) {
      throw new RangeError('Effort score exceeds finite range');
    }
  }
  return { emScore, rivalScore };
}

/** Pure view model recomputed from current canonical phase and action log. */
export function analyzeRelationship(phase, log) {
  if (!Object.values(RelationshipPhase).includes(phase)) {
    throw new TypeError(`Unknown relationship phase: ${String(phase)}`);
  }
  const { emScore, rivalScore } = calculateEffortScores(log);
  return {
    emScore,
    rivalScore,
    redFlagWarning: phase === RelationshipPhase.DATING_NO_LOVE && emScore < rivalScore,
  };
}
