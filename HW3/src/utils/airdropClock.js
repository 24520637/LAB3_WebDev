/**
 * Return milliseconds until an absolute UNIX epoch target.
 * serverOffsetMs is serverNow - clientNow; positive means the server is ahead.
 * A target that has already passed returns zero rather than a negative number.
 * This utility is deliberately free of timers and React dependencies.
 *
 * @param {number} targetEpochMs Absolute target time in milliseconds.
 * @param {number} [serverOffsetMs=0] Server minus client clock offset in ms.
 * @param {number} [nowEpochMs=Date.now()] Observed client epoch time in ms.
 * @returns {number} Nonnegative remaining milliseconds.
 */
export function calculateRemainingMs(targetEpochMs, serverOffsetMs = 0, nowEpochMs = Date.now()) {
  for (const [name, value] of [
    ['targetEpochMs', targetEpochMs],
    ['serverOffsetMs', serverOffsetMs],
    ['nowEpochMs', nowEpochMs],
  ]) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new TypeError(`${name} must be a finite number of milliseconds`);
    }
  }

  return Math.max(0, targetEpochMs - (nowEpochMs + serverOffsetMs));
}
