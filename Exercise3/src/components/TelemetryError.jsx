import { useId } from 'react'
import '../styles/telemetry.css'

/** Safe text supplied by the request coordinator; never raw exception details. */
export default function TelemetryError({ message, onRetry }) {
  const headingId = useId()

  return (
    <section className="telemetry-error" role="alert" aria-labelledby={headingId}>
      <h2 id={headingId}>Blue-Zone Link Lost</h2>
      <p>{message}</p>
      <button type="button" onClick={onRetry}>Reconnect Satellite</button>
    </section>
  )
}
