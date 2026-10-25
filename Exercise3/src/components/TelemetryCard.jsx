/** Present assignment data through ordinary React text interpolation. */
export default function TelemetryCard({ squad }) {
  return (
    <article className="telemetry-card" aria-label={`${squad.name} telemetry`}>
      <h2>{squad.name}</h2>
      <dl>
        <dt>Map</dt><dd>{squad.map}</dd>
        <dt>Phase</dt><dd>{squad.phase}</dd>
        <dt>Alive players</dt><dd>{squad.alive}</dd>
        <dt>Kills</dt><dd>{squad.kills}</dd>
        <dt>WWCD probability</dt><dd>{squad.wwcdProbability}%</dd>
        <dt>Squad status</dt><dd>{squad.status}</dd>
      </dl>
    </article>
  )
}
