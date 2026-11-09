import { useEffect, useState } from 'react';
import { calculateRemainingMs } from '../utils/airdropClock.js';

const SYNC_INTERVAL_MS = 200;

/**
 * Countdown to an absolute target epoch. A positive serverOffsetMs indicates
 * the server's clock is ahead of the client's. This hook does not decide
 * DropPhase: reaching zero might indicate opening OR expiry.
 *
 * @param {number} targetEpochMs Target epoch in milliseconds.
 * @param {number} [serverOffsetMs=0] serverNow - clientNow (ms).
 * @returns {{remainingMs: number, isLive: boolean, hasReachedTarget: boolean}}
 */
export function usePubgAirdropTimer(targetEpochMs, serverOffsetMs = 0) {
  // Validate even on renders where the effect does not run (including SSR).
  const initialRemaining = calculateRemainingMs(targetEpochMs, serverOffsetMs);
  const [snapshot, setSnapshot] = useState(() => ({
    targetEpochMs,
    serverOffsetMs,
    remainingMs: initialRemaining,
  }));

  // Render new target/offset immediately; never display a value belonging to
  // previous props while waiting for an effect to run.
  const remainingMs = snapshot.targetEpochMs === targetEpochMs &&
    snapshot.serverOffsetMs === serverOffsetMs
    ? snapshot.remainingMs
    : initialRemaining;

  useEffect(() => {
    const syncClock = () => {
      const nextRemaining = calculateRemainingMs(targetEpochMs, serverOffsetMs);
      setSnapshot(previous => {
        if (previous.targetEpochMs === targetEpochMs &&
            previous.serverOffsetMs === serverOffsetMs &&
            previous.remainingMs === nextRemaining) {
          return previous;
        }
        return { targetEpochMs, serverOffsetMs, remainingMs: nextRemaining };
      });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') syncClock();
    };

    syncClock();
    const intervalId = window.setInterval(syncClock, SYNC_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [targetEpochMs, serverOffsetMs]);

  // Retained assignment alias: isLive only means the target has been reached,
  // not that the drop is still claimable. DropPhase owns that decision.
  const hasReachedTarget = remainingMs === 0;
  return { remainingMs, hasReachedTarget, isLive: hasReachedTarget };
}
