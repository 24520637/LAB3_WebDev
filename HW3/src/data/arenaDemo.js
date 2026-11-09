/** Demo fixtures only. No purchases, awards, or live official telemetry. */
export const DROP_FIXTURES = Object.freeze([
  Object.freeze({ id: 'pvs-vip', title: 'PVS Grand Finals VIP Ticket', priceVnd: 499000, remainingStock: 12 }),
  Object.freeze({ id: 'gcoin-crate', title: '5,000 G-Coin Contraband Crate', priceVnd: 199000, remainingStock: 20 }),
]);

export function createArenaDemoState(nowMs) {
  if (!Number.isFinite(nowMs)) throw new TypeError('Invalid demo start time');
  const deadline = nowMs + 15 * 60_000;
  return { deadline, drops: DROP_FIXTURES.map(drop => ({ ...drop, dropEpochMs: deadline })) };
}
