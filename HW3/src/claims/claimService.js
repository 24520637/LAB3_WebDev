/** A deterministic in-memory authority for an educational demo, NOT an HTTP backend. */
export class ClaimError extends Error {
  constructor(message, status, remainingStock) {
    super(message);
    this.name = 'ClaimError';
    this.status = status;
    if (remainingStock !== undefined) this.remainingStock = remainingStock;
  }
}

export function createMockClaimService(initialDrops) {
  const stock = new Map();
  for (const drop of initialDrops) {
    if (typeof drop.id !== 'string' || !drop.id || !Number.isSafeInteger(drop.remainingStock) || drop.remainingStock < 0 || stock.has(drop.id)) {
      throw new TypeError('Each drop needs a unique ID and nonnegative integer stock');
    }
    stock.set(drop.id, drop.remainingStock);
  }
  const receipts = new Map();
  return {
    getStock(dropId) { return stock.get(dropId); },
    /** Returns a Promise so callers use the same contract as a real API adapter. */
    async claim({ dropId, claimId, signal }) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      if (!stock.has(dropId) || typeof claimId !== 'string' || !claimId) {
        throw new ClaimError('Invalid claim request', 400);
      }
      const previous = receipts.get(claimId);
      if (previous) {
        if (previous.dropId !== dropId) throw new ClaimError('Claim ID already used for another drop', 409, stock.get(dropId));
        return previous.response;
      }
      const current = stock.get(dropId);
      if (current === 0) throw new ClaimError('Looted out', 409, 0);
      const response = Object.freeze({ claimId, dropId, remainingStock: current - 1 });
      stock.set(dropId, current - 1);
      receipts.set(claimId, { dropId, response });
      return response;
    },
  };
}

export function formatVnd(priceVnd) {
  if (!Number.isSafeInteger(priceVnd) || priceVnd < 0) throw new TypeError('priceVnd must be a nonnegative integer');
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(priceVnd);
}

/** HTTP adapter; the server is authoritative and must enforce idempotency/stock atomicity. */
export function createHttpClaimService({ endpoint, fetchImpl = globalThis.fetch }) {
  if (typeof endpoint !== 'string' || !endpoint || typeof fetchImpl !== 'function') throw new TypeError('Invalid HTTP claim configuration');
  return {
    async claim({ dropId, claimId, signal }) {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': claimId },
        body: JSON.stringify({ dropId, claimId }),
        signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new ClaimError(response.status === 409 ? 'Looted out' : 'Claim failed', response.status, data.remainingStock);
      }
      if (!Number.isSafeInteger(data.remainingStock) || data.remainingStock < 0) throw new Error('Invalid authoritative stock response');
      return { claimId, dropId, remainingStock: data.remainingStock };
    },
  };
}
