# AI Failure Audit

## Confirmed findings

### Failure 1: Phase 2 accepted multipliers assigned to the wrong actor

- **Related prompt:** “`calculateEffortScores` accepts an incorrect actor multiplier, which can result in the `EM` signal being calculated using the `AI_DO` multiplier.”
- **Failing code:** `src/domain/effortAnalysis.js` validated that a multiplier was finite and nonnegative, but did not require the actor's Phase 1 multiplier.
- **Reproduction:** An `EM` signal with `{ steps: 1, multiplier: 50 }` was accepted and scored as 50 instead of being rejected under the Phase 1 contract (`EM: 0.1`, `AI_DO: 50`).
- **Cause:** The Phase 2 selector trusted every nonnegative multiplier instead of enforcing the actor-to-multiplier mapping used by the append-only log reducer.
- **Fix status:** Fixed. `calculateEffortScores` now rejects a multiplier that does not match `EFFORT_MULTIPLIER[actor]`.
- **Retest:** Added wrong-actor multiplier assertions to `tests/phase2.test.js`; `npm test` in `BonusHW` passed all 14 tests.

The Phase 2 review confirmed one distinct application logic defect. No additional Phase 2 defects are claimed.

### Failure 2: Wall-clock adjustment could strand a pending ghosting timeout

- **Related prompt:** PImplement Phase 3 of TASK_DECOMPOSITION.md only:
- T-05: Ghosting timer.
- T-06: Cancellation and cleanup.

Inspect the existing FSM and Phase 1 implementation before coding.

BUSINESS BEHAVIOR:

1. When the user sends a message during DATING_NO_LOVE, create a pending message with a stable identity.
2. Start a 5-second reply window for that specific message.
3. If a valid reply arrives before the deadline, cancel the pending timeout.
4. If no reply arrives within 5 seconds, transition to GHOSTED_EXIT exactly once.
5. If the user clicks Dừng Lại, cancel the pending operation and follow the approved exit behavior.
6. If a new message replaces the previous pending message, the previous timeout must no longer affect the relationship.
7. Changing to an ineligible phase must cancel the pending timeout.
8. Unmounting the component must clean up all pending resources.

TECHNICAL REQUIREMENTS:

- Use useEffect according to existing React conventions.
- Use clearTimeout to cancel browser timers.
- Use AbortController for signal-aware asynchronous operations where such operations actually exist.
- Use a stable message ID or identity guard to prevent stale callbacks from changing current state.
- Ensure timer cleanup works with React StrictMode.
- Avoid stale closures.
- Do not let unrelated effort-score changes restart the 5-second deadline.
- Do not start the timer merely because the component mounts unless that behavior has been explicitly approved.
- Do not claim that AbortController automatically clears setTimeout.
- Do not attempt to manually trigger JavaScript garbage collection.

TESTING:

Verify:
- Timer starts when a message is sent.
- At 4999ms, the relationship has not exited.
- At 5000ms, an unanswered pending message causes one exit.
- Reply before timeout prevents exit.
- Dừng Lại prevents the old timeout from changing state.
- A replacement message invalidates the previous message timer.
- Phase change cancels the pending timeout.
- Unmount cancels the pending timeout.
- StrictMode does not cause duplicate exits.

Use fake timers if supported by the existing test framework.

Do not implement the complete visual UI in this phase.

After implementation, report:
- Timer lifecycle.
- Cancellation strategy.
- AbortController usage and its actual purpose.
- Tests executed and actual results.
- Any remaining race conditions.

Do not commit or proceed to Phase 4.
- **Failing code:** The supplied Phase 3 timer and hook used `Date.now()` both to set the message deadline and to decide whether a fired timeout had reached that deadline.
- **Reproduction:** Send a message at wall-clock time `1000`, giving deadline `6000`; let the scheduled five-second timer fire after the system clock moves backward to `500`. The reducer rejects the timeout as premature, while the one-shot timer has already fired and is no longer scheduled. The pending message then has no active timeout.
- **Cause:** `Date.now()` is a wall clock and may move backward or forward due to clock synchronization or user changes; elapsed-time deadlines require a monotonic clock.
- **Fix status:** Fixed. The hook and timeout scheduler now use `performance.now()` for sent time, reply time, deadlines, and timeout checks.
- **Retest:** Added a fake-clock test that moves wall time backward while monotonic time reaches the deadline; the reducer exits to `GHOSTED_EXIT`. Final Phase 1–3 test results are recorded in the Phase 3 handoff.

Two distinct application logic defects have been confirmed across the Phase 2 and Phase 3 reviews. No additional defects are claimed.

### Failure 3: Phase 3 rejected valid high-resolution timestamps

- **Related prompt:** Implement Phase 3 of TASK_DECOMPOSITION.md only:
- T-05: Ghosting timer.
- T-06: Cancellation and cleanup.

Inspect the existing FSM and Phase 1 implementation before coding.

BUSINESS BEHAVIOR:

1. When the user sends a message during DATING_NO_LOVE, create a pending message with a stable identity.
2. Start a 5-second reply window for that specific message.
3. If a valid reply arrives before the deadline, cancel the pending timeout.
4. If no reply arrives within 5 seconds, transition to GHOSTED_EXIT exactly once.
5. If the user clicks Dừng Lại, cancel the pending operation and follow the approved exit behavior.
6. If a new message replaces the previous pending message, the previous timeout must no longer affect the relationship.
7. Changing to an ineligible phase must cancel the pending timeout.
8. Unmounting the component must clean up all pending resources.

TECHNICAL REQUIREMENTS:

- Use useEffect according to existing React conventions.
- Use clearTimeout to cancel browser timers.
- Use AbortController for signal-aware asynchronous operations where such operations actually exist.
- Use a stable message ID or identity guard to prevent stale callbacks from changing current state.
- Ensure timer cleanup works with React StrictMode.
- Avoid stale closures.
- Do not let unrelated effort-score changes restart the 5-second deadline.
- Do not start the timer merely because the component mounts unless that behavior has been explicitly approved.
- Do not claim that AbortController automatically clears setTimeout.
- Do not attempt to manually trigger JavaScript garbage collection.

TESTING:

Verify:
- Timer starts when a message is sent.
- At 4999ms, the relationship has not exited.
- At 5000ms, an unanswered pending message causes one exit.
- Reply before timeout prevents exit.
- Dừng Lại prevents the old timeout from changing state.
- A replacement message invalidates the previous message timer.
- Phase change cancels the pending timeout.
- Unmount cancels the pending timeout.
- StrictMode does not cause duplicate exits.

Use fake timers if supported by the existing test framework.

Do not implement the complete visual UI in this phase.

After implementation, report:
- Timer lifecycle.
- Cancellation strategy.
- AbortController usage and its actual purpose.
- Tests executed and actual results.
- Any remaining race conditions.

Do not commit or proceed to Phase 4.
- **Failing code:** `src/domain/ghostingState.js` required `sentAt` and the derived deadline to be safe integers.
- **Reproduction:** Dispatch `SEND_MESSAGE` with `sentAt: 1000.25`, a valid high-resolution timestamp shape returned by `performance.now()`. The reducer threw `RangeError` before creating a pending message, so no timeout could be scheduled.
- **Cause:** Validation assumed timestamps were integer milliseconds, while `performance.now()` is a high-resolution floating-point clock and may return fractional milliseconds.
- **Fix status:** Fixed. `sentAt` and the calculated deadline now require finite, non-negative values rather than integers; message sequence remains a safe integer.
- **Retest:** Added `high-resolution fractional timestamps from performance.now are accepted` to `tests/phase3.test.js`. The test failed before the fix with the reported `RangeError`; final Phase 1–3 test results are recorded in the handoff.

Three distinct application logic defects have been confirmed across the Phase 2 and Phase 3 reviews. No additional defects are claimed.
