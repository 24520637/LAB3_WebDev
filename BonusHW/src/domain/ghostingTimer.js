/**
 * Schedule one cancellable native timeout. The reducer validates the current
 * message identity and deadline again when the callback fires.
 */
export function scheduleGhostingTimeout(pendingMessage, onTimeout, {
  now = () => performance.now(),
  setTimer = setTimeout,
  clearTimer = clearTimeout,
} = {}) {
  if (!pendingMessage || typeof onTimeout !== 'function') {
    throw new TypeError('Pending message and timeout callback are required');
  }

  const { id, sequence, deadline } = pendingMessage;
  if (typeof id !== 'string' || !Number.isSafeInteger(sequence) ||
      !Number.isFinite(deadline)) {
    throw new TypeError('Invalid pending message');
  }

  let active = true;
  const timer = setTimer(() => {
    if (!active) return;
    active = false;
    onTimeout({ id, sequence, now: now() });
  }, Math.max(0, deadline - now()));

  return () => {
    if (!active) return;
    active = false;
    clearTimer(timer);
  };
}
