# AI Failure Audit

## Confirmed findings

### Failure 1: Phase 2 accepted multipliers assigned to the wrong actor

- **Related prompt:** “`calculateEffortScores` accepts an incorrect actor multiplier, which can result in the `EM` signal being calculated using the `AI_DO` multiplier.”
- **Failing code:** `src/domain/effortAnalysis.js` validated that a multiplier was finite and nonnegative, but did not require the actor's Phase 1 multiplier.
- **Reproduction:** An `EM` signal with `{ steps: 1, multiplier: 50 }` was accepted and scored as 50 instead of being rejected under the Phase 1 contract (`EM: 0.1`, `AI_DO: 50`).
- **Cause:** The Phase 2 selector trusted every nonnegative multiplier instead of enforcing the actor-to-multiplier mapping used by the append-only log reducer.
- **Fix status:** Fixed. `calculateEffortScores` now rejects a multiplier that does not match `EFFORT_MULTIPLIER[actor]`.
- **Retest:** Added wrong-actor multiplier assertions to `tests/phase2.test.js`; `npm test` in `BonusHW` passed all 14 tests.

Only one distinct application logic defect was confirmed in this review. No additional defects are claimed.
