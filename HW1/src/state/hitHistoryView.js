/** Convert the existing bounded reducer history to readable labels. */
export function getVisibleHits(hits, pads) {
  const byId = new Map(pads.map((pad) => [pad.id, pad]));
  return hits.flatMap((hit) => {
    const pad = byId.get(hit.padId);
    return pad ? [{ id: hit.id, label: pad.label, key: pad.key }] : [];
  });
}

/** A single short announcement, rather than re-announcing the whole list. */
export function getLatestHitAnnouncement(hits, pads) {
  const [latest] = getVisibleHits(hits.slice(0, 1), pads);
  return latest ? `Hit ${latest.id}: ${latest.label}, key ${latest.key}.` : '';
}
