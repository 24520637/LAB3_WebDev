/**
 * Assignment sample values, not a live KRAFTON feed or calculated predictions.
 * wwcdProbability is expressed as a percentage from 0 to 100.
 * @typedef {Object} SquadTelemetry
 * @property {'ces' | 'te' | 'ge'} id
 * @property {string} name
 * @property {string} map
 * @property {string} phase
 * @property {number} alive
 * @property {number} kills
 * @property {number} wwcdProbability
 * @property {string} status
 */

/** @type {ReadonlyArray<Readonly<SquadTelemetry>>} */
export const PUBG_VN_SQUADS = Object.freeze([
  Object.freeze({
    id: 'ces',
    name: 'Cerberus Esports',
    map: 'Erangel',
    phase: 'Phase 6',
    alive: 4,
    kills: 14,
    wwcdProbability: 68,
    status: 'In Safe Zone',
  }),
  Object.freeze({
    id: 'te',
    name: 'The Expendables',
    map: 'Miramar',
    phase: 'Phase 7',
    alive: 4,
    kills: 18,
    wwcdProbability: 82,
    status: 'Holding High Ground',
  }),
  Object.freeze({
    id: 'ge',
    name: 'Genius Esports',
    map: 'Taego',
    phase: 'Phase 5',
    alive: 3,
    kills: 9,
    wwcdProbability: 41,
    status: 'Rotating Blue Zone',
  }),
])

/** Exact, case-sensitive lookup; unknown IDs return null without a fallback squad. */
export function getSquadTelemetry(squadId) {
  return PUBG_VN_SQUADS.find((squad) => squad.id === squadId) ?? null
}
