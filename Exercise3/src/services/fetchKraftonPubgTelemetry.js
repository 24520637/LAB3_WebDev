import { getSquadTelemetry } from '../data/pubg-vn-telemetry-spec.js'

/**
 * Local timer simulation, not an HTTP request or live KRAFTON feed.
 * Invalid IDs reject before allocating resources. Cancellation always rejects
 * with AbortError, including signals aborted with a custom reason.
 * Each valid, non-aborted attempt samples random() once after the delay;
 * values below 0.35 simulate packet loss (not a guaranteed sample frequency).
 *
 * @param {string} squadId
 * @param {{signal?: AbortSignal, delayMs?: number, random?: () => number}} options
 * @returns {Promise<Readonly<import('../data/pubg-vn-telemetry-spec.js').SquadTelemetry>>}
 */
export function fetchKraftonPubgTelemetry(
  squadId,
  { signal, delayMs = 1200, random = Math.random } = {},
) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Telemetry request aborted', 'AbortError'))
      return
    }

    const squad = getSquadTelemetry(squadId)
    if (!squad) {
      reject(new Error('Unknown squad ID'))
      return
    }
    if (!Number.isFinite(delayMs) || delayMs < 0 || delayMs > 2147483647) {
      reject(new RangeError('delayMs must be a valid non-negative timer delay'))
      return
    }
    if (typeof random !== 'function') {
      reject(new TypeError('random must be a function'))
      return
    }

    let settled = false

    function finish(error, data) {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      if (error) reject(error)
      else resolve(data)
    }

    function onAbort() {
      finish(new DOMException('Telemetry request aborted', 'AbortError'))
    }

    signal?.addEventListener('abort', onAbort, { once: true })
    const timer = setTimeout(() => {
      try {
        const sample = random()
        if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
          throw new RangeError('random must return a number in [0, 1)')
        }
        if (sample < 0.35) {
          finish(new Error('Satellite packet timeout'))
        } else {
          finish(null, squad)
        }
      } catch (error) {
        finish(error)
      }
    }, delayMs)
  })
}
