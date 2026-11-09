/** @typedef {{readonly id:string,readonly occurredAtMs:number,readonly squadId:string,readonly actor:string,readonly target:string,readonly type:string}} KillFeedEvent */

/** Pure filter and newest-first sort, with event-ID tie breaking. Does not mutate callers' data. */
export function selectKillFeed(events, { squadId = 'all', query = '', type = 'all' } = {}) {
  if (!Array.isArray(events)) throw new TypeError('events must be an array');
  if (typeof query !== 'string') throw new TypeError('query must be a string');
  if (typeof squadId !== 'string' || typeof type !== 'string') throw new TypeError('Invalid feed filter');
  const term = query.trim().toLocaleLowerCase('vi-VN');
  const ids = new Set();
  for (const event of events) {
    if (typeof event.id !== 'string' || !event.id || ids.has(event.id)) throw new TypeError('Event IDs must be unique nonempty strings');
    if (!Number.isFinite(event.occurredAtMs)) throw new TypeError('Invalid event timestamp');
    ids.add(event.id);
  }
  return events.filter((event) =>
    (squadId === 'all' || event.squadId === squadId) &&
    (type === 'all' || event.type === type) &&
    (event.actor.toLocaleLowerCase('vi-VN').includes(term) ||
      event.target.toLocaleLowerCase('vi-VN').includes(term) ||
      event.squadId.toLocaleLowerCase('vi-VN').includes(term))
  ).sort((a, b) => b.occurredAtMs - a.occurredAtMs || a.id.localeCompare(b.id));
}
