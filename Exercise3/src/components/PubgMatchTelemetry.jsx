import { useEffect, useReducer, useRef } from 'react'
import { createInitialTelemetryState, telemetryReducer } from '../state/telemetry-state.js'
import { fetchKraftonPubgTelemetry } from '../services/fetchKraftonPubgTelemetry.js'
import TelemetryCard from './TelemetryCard.jsx'

/**
 * Selection and retryTick are controlled inputs, separate from request state.
 * A parent can increment retryTick to request the same squad again.
 * Loading and error presentation remain plain text until later UI tasks.
 * @param {{selectedSquadId?: 'ces' | 'te' | 'ge', retryTick?: number}} props
 */
export default function PubgMatchTelemetry({ selectedSquadId = 'te', retryTick = 0 }) {
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
        dispatch({ type: 'REJECT', error: 'Telemetry request failed. Please try again.' })
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
    <section aria-label="Telemetry state" data-squad-id={selectedSquadId}>
      <p role="status">{state.status}: {message}</p>
      {state.status === 'SUCCESS' && <TelemetryCard squad={state.data} />}
    </section>
  )
}
