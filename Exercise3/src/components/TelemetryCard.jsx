/** Present assignment data through ordinary React text interpolation. */
export default function TelemetryCard({ squad }) {
  return (
    <article className="telemetry-card" aria-label={`${squad.name} telemetry`}>
      <h2>{squad.name}</h2>
      <dl>
        <div className="telemetry-metric"><dt>Map</dt><dd>{squad.map}</dd></div>
        <div className="telemetry-metric"><dt>Phase</dt><dd>{squad.phase}</dd></div>
        <div className="telemetry-metric telemetry-metric--number"><dt>Alive players</dt><dd>{squad.alive}</dd></div>
        <div className="telemetry-metric telemetry-metric--number"><dt>Kills</dt><dd>{squad.kills}</dd></div>
        <div className="telemetry-metric telemetry-metric--number"><dt>WWCD probability</dt><dd>{squad.wwcdProbability}%</dd></div>
        <div className="telemetry-metric"><dt>Squad status</dt><dd>{squad.status}</dd></div>
      </dl>
    </article>
  )
}
