/**
 * @typedef {{status: 'IDLE', data: null, error: null}
 * | {status: 'LOADING', data: null, error: null}
 * | {status: 'SUCCESS', data: import('../data/pubg-vn-telemetry-spec.js').SquadTelemetry, error: null}
 * | {status: 'ERROR', data: null, error: string}} TelemetryState
 */

/** @returns {TelemetryState} */
export function createInitialTelemetryState() {
  return { status: 'IDLE', data: null, error: null }
}

/**
 * Pure UI state transitions only; no requests, timers, or cancellation here.
 * LOAD starts or supersedes an attempt from any status, clearing old output.
 * RESOLVE/REJECT settle only LOADING; callers must guard request identity first.
 * Retry will trigger a new LOAD via a separate retryTick in the later effect task.
 * @param {TelemetryState} state
 * @param {{type: 'LOAD'}
 * | {type: 'RESOLVE', data: import('../data/pubg-vn-telemetry-spec.js').SquadTelemetry}
 * | {type: 'REJECT', error: string}} action
 * @returns {TelemetryState}
 */
export function telemetryReducer(state, action) {
  switch (action.type) {
    case 'LOAD':
      return { status: 'LOADING', data: null, error: null }
    case 'RESOLVE':
      if (state.status !== 'LOADING') return state
      if (!action.data || typeof action.data !== 'object') {
        throw new TypeError('RESOLVE requires squad telemetry data')
      }
      return { status: 'SUCCESS', data: action.data, error: null }
    case 'REJECT':
      if (state.status !== 'LOADING') return state
      if (typeof action.error !== 'string' || !action.error.trim()) {
        throw new TypeError('REJECT requires a safe, non-empty error message')
      }
      return { status: 'ERROR', data: null, error: action.error }
    default:
      throw new Error(`Unknown telemetry action: ${action.type}`)
  }
}
