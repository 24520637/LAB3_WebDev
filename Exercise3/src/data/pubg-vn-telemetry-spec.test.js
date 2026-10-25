import { expect, test } from 'vitest'
import { getSquadTelemetry, PUBG_VN_SQUADS } from './pubg-vn-telemetry-spec.js'

test('matches every field of the three assignment records exactly', () => {
  expect(PUBG_VN_SQUADS).toEqual([
    { id: 'ces', name: 'Cerberus Esports', map: 'Erangel', phase: 'Phase 6', alive: 4, kills: 14, wwcdProbability: 68, status: 'In Safe Zone' },
    { id: 'te', name: 'The Expendables', map: 'Miramar', phase: 'Phase 7', alive: 4, kills: 18, wwcdProbability: 82, status: 'Holding High Ground' },
    { id: 'ge', name: 'Genius Esports', map: 'Taego', phase: 'Phase 5', alive: 3, kills: 9, wwcdProbability: 41, status: 'Rotating Blue Zone' },
  ])
  expect(new Set(PUBG_VN_SQUADS.map(({ id }) => id)).size).toBe(3)
})

test.each(['ces', 'te', 'ge'])('looks up the exact %s record', (id) => {
  expect(getSquadTelemetry(id)).toBe(PUBG_VN_SQUADS.find((squad) => squad.id === id))
})

test.each(['unknown', 'TE', '', null, undefined, '__proto__'])('returns null for unknown ID %s', (id) => {
  expect(getSquadTelemetry(id)).toBeNull()
})
