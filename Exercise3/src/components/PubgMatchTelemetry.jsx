import { useEffect, useReducer, useRef } from 'react'
import { createInitialTelemetryState, telemetryReducer } from '../state/telemetry-state.js'
import { fetchKraftonPubgTelemetry } from '../services/fetchKraftonPubgTelemetry.js'
import TelemetryCard from './TelemetryCard.jsx'
import TelemetrySkeleton from './TelemetrySkeleton.jsx'
import TelemetryError from './TelemetryError.jsx'

/**
 * Selection and retryTick are controlled inputs, separate from request state.
 * onRetry asks the parent to increment retryTick for the current squad.
 * @param {{selectedSquadId?: 'ces' | 'te' | 'ge', retryTick?: number, onRetry: () => void}} props
 */
export default function PubgMatchTelemetry({ selectedSquadId = 'te', retryTick = 0, onRetry }) {
  const [state, dispatch] = useReducer(telemetryReducer, undefined, createInitialTelemetryState)
  const currentRequest = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    const requestId = Symbol('telemetry request')
    currentRequest.current = requestId

    async function loadTelemetry() {
      dispatch({ type: 'LOAD' })
      try {
        const data = await fetchKraftonPubgTelemetry(selectedSquadId, { signal: controller.signal })
        if (currentRequest.current !== requestId || controller.signal.aborted) return
        dispatch({ type: 'RESOLVE', data })
      } catch (error) {
        if (currentRequest.current !== requestId || controller.signal.aborted || error?.name === 'AbortError') return
        const message = error?.message === 'Satellite packet timeout'
          ? 'Satellite packet timeout. Reconnect to request fresh simulated telemetry.'
          : 'Telemetry request failed. Please try again.'
        dispatch({ type: 'REJECT', error: message })
      }
    }

    loadTelemetry()
    return () => {
      // Invalidate before aborting, including on unmount and Strict Mode cleanup.
      if (currentRequest.current === requestId) currentRequest.current = null
      controller.abort()
    }
  }, [selectedSquadId, retryTick])

  let message = 'Telemetry has not started.'
  if (state.status === 'LOADING') message = 'Loading telemetry.'
  if (state.status === 'SUCCESS') message = `Telemetry received for ${state.data.name}.`
  if (state.status === 'ERROR') message = state.error

  return (
    <section className="telemetry" aria-label="Telemetry state" data-squad-id={selectedSquadId} data-status={state.status}>
      <p className="telemetry-status" role="status" aria-live={state.status === 'ERROR' ? 'off' : 'polite'}>{state.status}: {message}</p>
      <section className="telemetry-panel" aria-label="Telemetry panel" aria-busy={state.status === 'LOADING'}>
        {state.status === 'LOADING' && <TelemetrySkeleton />}
        {state.status === 'SUCCESS' && <TelemetryCard squad={state.data} />}
        {state.status === 'ERROR' && <TelemetryError message={state.error} onRetry={onRetry} />}
      </section>
    </section>
  )
}
