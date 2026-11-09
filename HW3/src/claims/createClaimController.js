import { ClaimError } from './claimService.js';

/**
 * Per-drop synchronous claim lock and optimistic UI state.
 * service.claim({dropId,claimId,signal}) => {remainingStock?: number};
 * Only a genuine server-authoritative response should set remainingStock.
 * A 409 with remainingStock reconciles to the server, not a stale local baseline.
 */
export function createClaimController({ dropId, initialStock, claimService, createClaimId = () => globalThis.crypto.randomUUID(), canClaim = () => true }) {
  if (typeof dropId !== 'string' || !dropId || !Number.isSafeInteger(initialStock) || initialStock < 0) throw new TypeError('Invalid drop/stock');
  if (typeof claimService?.claim !== 'function' || typeof createClaimId !== 'function' || typeof canClaim !== 'function') throw new TypeError('Invalid claim controller dependencies');

  let baseStock = initialStock;
  let revision = 0;
  let active = null;
  // A lost response or abort does not prove that the authority rejected a claim.
  // Keep the same logical operation until a receipt or definitive 409 settles it.
  let unresolvedClaim = null;
  let snapshot = Object.freeze({ remainingStock: initialStock, pending: false, unresolved: false, status: 'idle', message: '' });
  const listeners = new Set();
  const publish = (status, message = '') => {
    snapshot = Object.freeze({ remainingStock: Math.max(0, baseStock - (active ? 1 : 0)), pending: Boolean(active), unresolved: Boolean(unresolvedClaim), status, message });
    for (const listener of listeners) listener();
  };
  const applyServerStock = value => {
    if (Number.isSafeInteger(value) && value >= 0) { baseStock = value; revision += 1; return true; }
    return false;
  };

  return {
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    getSnapshot() { return snapshot; },
    hasUnresolvedClaim() { return Boolean(unresolvedClaim); },
    /** A later authoritative stock notification can arrive while a claim is pending. */
    updateAuthoritativeStock(nextStock) {
      if (!Number.isSafeInteger(nextStock) || nextStock < 0) throw new TypeError('Invalid stock');
      applyServerStock(nextStock);
      publish(snapshot.status, snapshot.message);
    },
    async claim() {
      // Lock before any async boundary, including ID generation and service invocation.
      if (active || (!unresolvedClaim && (baseStock <= 0 || !canClaim()))) return false;
      const token = { controller: new AbortController(), startRevision: revision };
      active = token;
      publish('pending', unresolvedClaim ? 'Checking previous claim…' : 'Claiming…');
      try {
        if (!unresolvedClaim) {
          const claimId = createClaimId();
          if (typeof claimId !== 'string' || !claimId) throw new TypeError('Invalid claim ID');
          unresolvedClaim = { claimId, startRevision: token.startRevision };
        }
        const operation = unresolvedClaim;
        const response = await claimService.claim({ dropId, claimId: operation.claimId, signal: token.controller.signal });
        if (active !== token) return false;
        // A newer external stock value must not be overwritten by an older response.
        // A retried receipt can predate stock updates received between attempts.
        if (revision === operation.startRevision) {
          if (!applyServerStock(response?.remainingStock)) baseStock = Math.max(0, baseStock - 1);
        }
        unresolvedClaim = null;
        active = null;
        publish('success', 'Claim confirmed');
        return true;
      } catch (error) {
        if (active !== token) return false;
        const conflict = error?.status === 409;
        if (conflict && revision === token.startRevision) applyServerStock(error.remainingStock);
        if (conflict) unresolvedClaim = null;
        active = null;
        publish(conflict ? 'conflict' : 'error', conflict ? 'Claim unavailable. Stock has been updated.' : 'Claim outcome unknown. Retry the same claim to confirm its result.');
        return false;
      }
    },
    /** Abort this attempt; retain its ID if this controller is used again. */
    cancelPending() {
      if (!active) return;
      const previous = active;
      active = null;
      previous.controller.abort();
      publish('idle');
    },
  };
}

export { ClaimError };
