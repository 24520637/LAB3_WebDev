import { useId, useState } from 'react';
import { DEMO_SQUAD_STANDINGS } from '../data/pubgVnSquads.js';
import { selectSquadStandings } from '../leaderboard/standings.js';

/** Standings are caller-supplied or explicitly labeled demonstration data. */
export function PubgLeaderboard({ standings = DEMO_SQUAD_STANDINGS, demo = true }) {
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('wwcdCount');
  const [direction, setDirection] = useState('desc');
  const queryId = useId();
  const sortId = useId();
  const directionId = useId();
  const visible = selectSquadStandings(standings, { query, sortBy, direction });
  return (
    <section aria-labelledby="pubg-leaderboard-title" className="pubg-leaderboard">
      <h2 id="pubg-leaderboard-title">PUBG Vietnam Squad Leaderboard</h2>
      {demo && <p>Illustrative standings — not live tournament results.</p>}
      <label htmlFor={queryId}>Find squad</label>
      <input id={queryId} type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
      <label htmlFor={sortId}>Sort standings by</label>
      <select id={sortId} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
        <option value="wwcdCount">WWCD wins</option>
        <option value="placementPts">Placement points</option>
        <option value="killPts">Kill points</option>
      </select>
      <label htmlFor={directionId}>Sort direction</label>
      <select id={directionId} value={direction} onChange={(e) => setDirection(e.target.value)}>
        <option value="desc">Highest first</option><option value="asc">Lowest first</option>
      </select>
      <p role="status" aria-live="polite">{visible.length} of {standings.length} squads shown</p>
      {visible.length === 0 ? <p>No squads match your search.</p> : (
        <table>
          <caption>Squad standings</caption>
          <thead><tr><th scope="col">Squad</th><th scope="col">WWCD</th><th scope="col">Placement</th><th scope="col">Kills</th></tr></thead>
          <tbody>{visible.map((s) => <tr key={s.squadId}>
            <th scope="row">{s.squadName}</th><td>{s.wwcdCount}</td><td>{s.placementPts}</td><td>{s.killPts}</td>
          </tr>)}</tbody>
        </table>
      )}
    </section>
  );
}
