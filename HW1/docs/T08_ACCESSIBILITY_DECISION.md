# T-08 — Transient pressed-state semantics

## Approved decision: Option B

The assignment requires `aria-pressed` on drum pads, and the user approved transient
`aria-pressed` synchronized with React state rather than a persistent toggle.

**Semantic limitation:** `aria-pressed` gives a native button *toggle button*
semantics in the accessibility tree. Real drum pads are momentary command buttons,
not on/off toggles. Screen readers may announce "toggle button, pressed/not pressed"
and may not announce brief state changes reliably. This is a deliberate project
requirement tradeoff, **not a claim of ideal semantics or WCAG compliance**.

## State contract

- A physical drum-key down sets the active physical pad; releasing it restores
  the last still-held mapped key or returns to idle. Window blur and composition
  cleanup release physical pressed state (existing T-06 behavior).
- Pointer down and native Enter/Space key down set a separate momentary native
  pressed state; pointer up/cancel/leave/lost capture, native Enter/Space key up,
  button blur, and window blur release it.
- `aria-pressed` and the `.is-active` visual class use the *same computed boolean*:
  the pad is active if its physical key is held **or** it is momentarily pressed
  through native button input.
- Only native `onClick` records a hit for native buttons. Pointer/key press-state
  handlers **never** call the hit-processing pathway; browser-native click behavior
  remains responsible for actual activation.
- Neither event handling nor state introduces a persistent toggle.

## Verification and remaining work

Node reducer/keyboard tests verify state transitions and history preservation.
The execution environment does not currently have installed React/Vite or a
browser-based accessibility test runner. Browser testing is still required for
accessibility-tree roles and state, real mouse/touch, Enter/Space, keydown/keyup,
blur recovery, and screen-reader interpretation. Do not claim accessibility
compliance until these tests have been run and documented.
