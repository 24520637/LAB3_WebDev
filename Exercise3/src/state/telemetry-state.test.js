import { expect, test } from 'vitest'
import { getSquadTelemetry } from '../data/pubg-vn-telemetry-spec.js'
import { createInitialTelemetryState, telemetryReducer } from './telemetry-state.js'

const data = getSquadTelemetry('te')
const error = 'Satellite packet timeout'

test('starts with exactly one IDLE state object and null data/error', () => {
  expect(createInitialTelemetryState()).toEqual({ status: 'IDLE', data: null, error: null })
  expect(createInitialTelemetryState()).not.toBe(createInitialTelemetryState())
})

test('success and error paths maintain the exclusive data/error contract', () => {
  const idle = Object.freeze(createInitialTelemetryState())
  const loading = Object.freeze(telemetryReducer(idle, { type: 'LOAD' }))
  const success = Object.freeze(telemetryReducer(loading, { type: 'RESOLVE', data }))
  expect(success).toEqual({ status: 'SUCCESS', data, error: null })
  const nextLoading = Object.freeze(telemetryReducer(success, { type: 'LOAD' }))
  expect(nextLoading).toEqual({ status: 'LOADING', data: null, error: null })
  const failure = Object.freeze(telemetryReducer(nextLoading, { type: 'REJECT', error }))
  expect(failure).toEqual({ status: 'ERROR', data: null, error })
  const retryLoading = telemetryReducer(failure, { type: 'LOAD' })
  expect(retryLoading).toEqual({ status: 'LOADING', data: null, error: null })
  expect(telemetryReducer(retryLoading, { type: 'RESOLVE', data })).toEqual(success)
  expect(idle).toEqual({ status: 'IDLE', data: null, error: null })
})

test.each([
  { status: 'IDLE', data: null, error: null },
  { status: 'LOADING', data: null, error: null },
  { status: 'SUCCESS', data, error: null },
  { status: 'ERROR', data: null, error },
])('LOAD from $status clears output and permits superseding requests', (state) => {
  Object.freeze(state)
  const next = telemetryReducer(state, { type: 'LOAD' })
  expect(next).toEqual({ status: 'LOADING', data: null, error: null })
  expect(next).not.toBe(state)
})

test.each(['IDLE', 'SUCCESS', 'ERROR'])('settlement outside LOADING preserves %s', (status) => {
  const state = { status, data: status === 'SUCCESS' ? data : null, error: status === 'ERROR' ? error : null }
  expect(telemetryReducer(state, { type: 'RESOLVE', data })).toBe(state)
  expect(telemetryReducer(state, { type: 'REJECT', error })).toBe(state)
})

test('rejects missing success data and invalid error payloads', () => {
  const state = telemetryReducer(createInitialTelemetryState(), { type: 'LOAD' })
  expect(() => telemetryReducer(state, { type: 'RESOLVE', data: null })).toThrow(TypeError)
  for (const invalid of [null, undefined, '', '   ', new Error('internal details')]) {
    expect(() => telemetryReducer(state, { type: 'REJECT', error: invalid })).toThrow(TypeError)
  }
  expect(() => telemetryReducer(state, { type: 'UNKNOWN' })).toThrow('Unknown telemetry action')
})
