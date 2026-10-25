import { useState } from 'react'
import PubgMatchTelemetry from './components/PubgMatchTelemetry.jsx'
import SquadSelector from './components/SquadSelector.jsx'

export default function App() {
  const [selectedSquadId, setSelectedSquadId] = useState('te')

  return (
    <main>
      <header>
        <h1>PUBG Vietnam Series — Live Telemetry</h1>
        <p>Simulated match data. All statistics and WWCD probabilities are sample values, not a live KRAFTON feed.</p>
      </header>
      <SquadSelector selectedSquadId={selectedSquadId} onSelect={setSelectedSquadId} />
      <PubgMatchTelemetry selectedSquadId={selectedSquadId} />
    </main>
  )
}
