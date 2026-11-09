import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { createClaimController } from '../claims/createClaimController.js';

/** One controller per drop ID; callers should supply a stable claimService. */
export function usePubgClaim({ dropId, initialStock, claimService, canClaim }) {
  const canClaimRef = useRef(canClaim);
  canClaimRef.current = canClaim;
  const controller = useMemo(() => createClaimController({
    dropId, initialStock, claimService, canClaim: () => canClaimRef.current?.() ?? true,
  }), [dropId, claimService]);

  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useEffect(() => {
    controller.updateAuthoritativeStock(initialStock);
  }, [controller, initialStock]);
  useEffect(() => () => controller.cancelPending(), [controller]);
  return { ...state, claim: controller.claim, updateAuthoritativeStock: controller.updateAuthoritativeStock };
}
