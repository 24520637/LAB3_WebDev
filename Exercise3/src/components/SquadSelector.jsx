import { PUBG_VN_SQUADS } from '../data/pubg-vn-telemetry-spec.js'

export default function SquadSelector({ selectedSquadId, onSelect }) {
  return (
    <fieldset className="squad-selector">
      <legend>Select a squad</legend>
      <section className="squad-buttons" aria-label="Squad controls">
        {PUBG_VN_SQUADS.map((squad) => (
          <button
            key={squad.id}
            type="button"
            aria-pressed={selectedSquadId === squad.id}
            onClick={() => onSelect(squad.id)}
          >
            {squad.id.toUpperCase()} — {squad.name}
            {selectedSquadId === squad.id && <> <span className="selection-label">Selected</span></>}
          </button>
        ))}
      </section>
    </fieldset>
  )
}
