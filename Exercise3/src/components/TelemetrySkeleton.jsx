import '../styles/telemetry.css'

/** Fixed loading footprint; only the decorative placeholders pulse. */
export default function TelemetrySkeleton() {
  return (
    <section className="telemetry-skeleton" aria-label="Loading telemetry">
      <p className="telemetry-skeleton__caption">Receiving squad telemetry…</p>
      <span className="telemetry-skeleton__visual" aria-hidden="true">
        <span className="telemetry-skeleton__heading" />
        <span className="telemetry-skeleton__metrics">
          <span /><span /><span /><span /><span /><span />
        </span>
      </span>
    </section>
  )
}
