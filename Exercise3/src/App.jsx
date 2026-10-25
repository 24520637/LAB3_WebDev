import { useState } from 'react'
import PubgMatchTelemetry from './components/PubgMatchTelemetry.jsx'
import SquadSelector from './components/SquadSelector.jsx'

export default function App() {
  const [selectedSquadId, setSelectedSquadId] = useState('te')
  const [retryTick, setRetryTick] = useState(0)

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <p className="dashboard-kicker">PUBG / VIETNAM SERIES</p>
        <h1>PUBG Vietnam Series — Live Telemetry</h1>
        <p className="simulation-notice">Simulated match data. All statistics and WWCD probabilities are sample values, not a live KRAFTON feed.</p>
      </header>
      <SquadSelector selectedSquadId={selectedSquadId} onSelect={setSelectedSquadId} />
      <PubgMatchTelemetry
        selectedSquadId={selectedSquadId}
        retryTick={retryTick}
        onRetry={() => setRetryTick((tick) => tick + 1)}
      />
    </main>
  )
}
