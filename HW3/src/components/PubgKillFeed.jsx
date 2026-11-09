import { useId, useState } from 'react';
import { DEMO_KILL_EVENTS } from '../data/pubgKillEvents.js';
import { DEMO_SQUAD_STANDINGS } from '../data/pubgVnSquads.js';
import { selectKillFeed } from '../killfeed/selectKillFeed.js';

/** Small accessible list, deliberately not virtualized: source Slide 22 scroller is unavailable. */
export function PubgKillFeed({ events = DEMO_KILL_EVENTS, squads = DEMO_SQUAD_STANDINGS, demo = true }) {
  const [squadId, setSquadId] = useState('all');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const squadInputId = useId();
  const textInputId = useId();
  const typeInputId = useId();
  const visible = selectKillFeed(events, { squadId, query, type });
  const types = [...new Set(events.map((event) => event.type))].sort();
  return (
    <section className="pubg-kill-feed" aria-labelledby="pubg-kill-feed-title">
      <h2 id="pubg-kill-feed-title">PUBG Vietnam Kill Feed</h2>
      {demo && <p>Simulated events — not a live match feed.</p>}
      <label htmlFor={squadInputId}>Filter by squad</label>
      <select id={squadInputId} value={squadId} onChange={(e) => setSquadId(e.target.value)}>
        <option value="all">All squads</option>
        {squads.map((s) => <option key={s.squadId} value={s.squadId}>{s.squadName}</option>)}
      </select>
      <label htmlFor={textInputId}>Search player</label>
      <input id={textInputId} type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
      <label htmlFor={typeInputId}>Filter event type</label>
      <select id={typeInputId} value={type} onChange={(e) => setType(e.target.value)}>
        <option value="all">All events</option>
        {types.map((value) => <option key={value} value={value}>{value}</option>)}
      </select>
      <p role="status" aria-live="polite">{visible.length} of {events.length} events shown</p>
      {visible.length === 0 ? <p>No events match the selected filters.</p> : (
        <ol aria-label="Newest events first">
          {visible.map((event) => <li key={event.id}>
            <time dateTime={new Date(event.occurredAtMs).toISOString()}>{new Date(event.occurredAtMs).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</time>
            {' — '}{event.actor} {event.type.toLowerCase()} {event.target}
          </li>)}
        </ol>
      )}
    </section>
  );
}
