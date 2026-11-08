# AI Failure Audit — Exercise 3

## Scope and evidence

T-10 automated regression review, 2026-10-25. One application accessibility
defect has been reproduced and fixed. The assignment's minimum of three
distinct bugs is **not met**; no additional bugs or DevTools evidence are invented.
Test infrastructure problems are excluded from the application defect count.

## Failure 01 — Selected label concatenated into the squad's accessible name

**Related implementation prompt (T-05, exact excerpt):**
> CES, TE, GE accessible squad buttons.
> Visible and aria-pressed selected state.

This identifies the implementation request, not proof that the prompt itself
caused the defect.

**Detection prompt (T-10, exact excerpt):**
> Add regression tests for:
> - Accessible squad buttons and six metrics.
> - Dashboard heading and selected state.

**Failing code:** `src/components/SquadSelector.jsx` rendered adjacent text
and a selected badge without a separating text node:

```jsx
{squad.id.toUpperCase()} — {squad.name}
{selectedSquadId === squad.id && <span className="selection-label">Selected</span>}
```

**Reproduction:** Run `npm test`. The T-10 test
`heading and exactly one visible selection survive loading, failure, retry and success`
renders App, selects GE, and checks the selected button's accessible name.
The first run reported:

```text
Expected: GE — Genius Esports Selected
Received: GE — Genius EsportsSelected
```

**Cause and impact:** JSX line formatting did not provide a separating text
node; the accessibility-name calculation concatenated the squad name and badge.
Visual flex spacing did not supply textual separation. This was demonstrated
with Testing Library's accessible-name assertion, not a screen-reader recording.

**Fix:** Insert a literal space before the badge, outside its span:

```jsx
{selectedSquadId === squad.id && <> <span className="selection-label">Selected</span></>}
```

An intermediate attempt placing the space inside the span still failed the
assertion. Moving it outside the span passed.

**Retest:** `npm test` passed all 96 tests across 7 files. The regression checks
the exact accessible name and sole visible selection through LOADING, ERROR,
Retry and SUCCESS. Fix is local; no commit was created by T-10.

**Limitations:** No new browser DevTools capture or screen-reader test was run
for this defect. CSS tests verify parsed declarations, including 220px sizing,
responsive breakpoints and reduced-motion overrides; they do not measure layout,
CLS, physical touch behavior or full WCAG compliance.
