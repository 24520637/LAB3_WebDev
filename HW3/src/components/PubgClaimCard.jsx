import { usePubgClaim } from '../hooks/usePubgClaim.js';
import { formatVnd } from '../claims/claimService.js';

/** Render a ticket or G-Coin crate. Drop phase is owned by the parent. */
export function PubgClaimCard({ drop, phase, claimService }) {
  const claimable = phase === 'AIRDROP_LIVE';
  const { remainingStock, pending, status, message, claim } = usePubgClaim({
    dropId: drop.id,
    initialStock: drop.remainingStock,
    claimService,
    canClaim: () => claimable,
  });
  const disabled = !claimable || pending || remainingStock === 0;
  return (
    <article aria-labelledby={`drop-${drop.id}`} className="pubg-drop-card">
      <h2 id={`drop-${drop.id}`}>{drop.title}</h2>
      <p>Price: {formatVnd(drop.priceVnd)}</p>
      <p>Remaining: {remainingStock}</p>
      <p>Phase: {phase}</p>
      <button type="button" disabled={disabled} aria-busy={pending} onClick={() => { void claim(); }}>
        {pending ? 'Claiming…' : 'Claim drop'}
      </button>
      {status === 'error' || status === 'conflict'
        ? <p role="alert">{message}</p>
        : <p role="status" aria-live="polite">{message}</p>}
    </article>
  );
}
