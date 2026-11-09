import { useEffect, useState } from 'react';
import { DRUM_PADS } from '../data/pads.js';
import { getVisibleHits, getLatestHitAnnouncement } from '../state/hitHistoryView.js';

const ANNOUNCEMENT_DELAY_MS = 300;

/** A visible ordered history and a separate, concise polite announcement. */
export default function HitHistory({ hits }) {
  const entries = getVisibleHits(hits, DRUM_PADS);
  const latestId = hits[0]?.id ?? null;
  const [announcement, setAnnouncement] = useState('');

  // Coalesce bursts: only the final hit of a rapid sequence is announced.
  useEffect(() => {
    if (latestId === null) return undefined;
    const timeout = setTimeout(() => {
      setAnnouncement(getLatestHitAnnouncement(hits, DRUM_PADS));
    }, ANNOUNCEMENT_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [hits, latestId]);

  return (
    <section className="hit-history" aria-labelledby="hit-history-title">
      <h2 id="hit-history-title">Recent drum hits</h2>
      {entries.length === 0 ? (
        <p className="hit-history-empty">No hits yet. Activate a drum pad to begin.</p>
      ) : (
        <ol className="hit-history-list" aria-label="Recent hits, newest first" aria-live="off">
          {entries.map((entry) => (
            <li key={entry.id}>
              <span>{entry.label}</span>
              <kbd>{entry.key}</kbd>
            </li>
          ))}
        </ol>
      )}
      <output className="visually-hidden" aria-live="polite" aria-atomic="true">
        {announcement}
      </output>
    </section>
  );
}
