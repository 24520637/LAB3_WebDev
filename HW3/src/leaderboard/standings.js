/** @typedef {{readonly squadId:string, readonly squadName:string, readonly wwcdCount:number, readonly placementPts:number, readonly killPts:number}} PubgVnSquadStanding */
export const STANDING_SORT_KEYS = Object.freeze(['wwcdCount', 'placementPts', 'killPts']);
const collator = new Intl.Collator('en', { sensitivity: 'base' });

/** Pure derived-state selector. Never sorts or modifies the input array or its records. */
export function selectSquadStandings(standings, { query = '', sortBy = 'wwcdCount', direction = 'desc' } = {}) {
  if (!Array.isArray(standings)) throw new TypeError('standings must be an array');
  if (typeof query !== 'string') throw new TypeError('query must be a string');
  if (!STANDING_SORT_KEYS.includes(sortBy)) throw new RangeError('Invalid standings sort key');
  if (direction !== 'asc' && direction !== 'desc') throw new RangeError('Invalid standings sort direction');
  const filter = query.trim().toLocaleLowerCase('vi-VN');
  const multiplier = direction === 'desc' ? -1 : 1;
  for (const standing of standings) {
    if (!Number.isFinite(standing[sortBy])) throw new TypeError('Standings points must be finite numbers');
  }
  return standings
    .filter((s) => s.squadName.toLocaleLowerCase('vi-VN').includes(filter))
    .sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      if (!Number.isFinite(aValue) || !Number.isFinite(bValue)) {
        throw new TypeError('Standings points must be finite numbers');
      }
      return (aValue - bValue) * multiplier || collator.compare(a.squadId, b.squadId);
    });
}
