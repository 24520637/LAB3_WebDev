# AI Failure Audit

## Bug 01 — Invalid IQ values are used without feedback

- **Prompt:**

```text
Read PROJECT_RULES.md and TASK_DECOMPOSITION.md.
Implement P2 only using real React.
Create ScientistDirectory with useState for people, query, minIq, sortBy.
Implement case-insensitive search, numeric IQ filtering using valueAsNumber, and IQ-desc/age-asc sorting using toSorted().
Calculate visiblePeople during render.
Use controlled inputs, useId(), and stable person.id keys.
No useEffect for filtering/sorting.
Integrate into App only if needed.
Do not commit. Stop after P2.kể từ bây giờ, mỗi khi mày test nếu phát hiện lỗi thì phải ghi vào file AI_FAILURE_AUDIT.md.
```

- **Code:** `setMinIq(Number.isNaN(value) ? 0 : value)` ignores the field's `min="0"` and `step="1"` constraints.
**Original faulty code (before the fix):**
```jsx
function handleMinIqChange(event) {
  const value = event.target.valueAsNumber;
  setMinIq(Number.isNaN(value) ? 0 : value);
}

<input
  type="number"
  min="0"
  step="1"
  value={minIq}
  onChange={handleMinIqChange}
/>
```

The handler checks only NaN. Both -1 and 109.5 are numbers, so they reach state despite failing the HTML constraints.

- **Reproduce:** enter `-1`, then `109.5` in Minimum IQ.
- **Expected / actual:** reject or explain invalid input before applying it. Instead, -1 shows seven results and 109.5 shows six. Native validity is false (rangeUnderflow / stepMismatch), with no visible associated error, aria-invalid or aria-describedby.
- **Fix applied:** validate native input constraints and nonnegative integers before updating the numeric filter. Invalid drafts keep the last valid filter. Added associated guidance, aria-invalid, and an error alert.
- **Retest — PASS:** from IQ 160, -1 and 109.5 show the error and retain six results. The error is linked by aria-describedby. Correcting the input removes the error. Real keyboard typing -1 also passed.

## Bug 02 — Clearing IQ forces 0 and creates leading-zero artifacts

- **Prompt:**

```text
Read PROJECT_RULES.md and TASK_DECOMPOSITION.md.
Implement P2 only using real React.
Create ScientistDirectory with useState for people, query, minIq, sortBy.
Implement case-insensitive search, numeric IQ filtering using valueAsNumber, and IQ-desc/age-asc sorting using toSorted().
Calculate visiblePeople during render.
Use controlled inputs, useId(), and stable person.id keys.
No useEffect for filtering/sorting.
Integrate into App only if needed.
Do not commit. Stop after P2.kể từ bây giờ, mỗi khi mày test nếu phát hiện lỗi thì phải ghi vào file AI_FAILURE_AUDIT.md.
```

- **Code:** numeric-only state plus `value={minIq}` and `setMinIq(Number.isNaN(value) ? 0 : value)` discards the empty editing state.

**Original faulty code (before the fix):**

```jsx
const [minIq, setMinIq] = useState(160);

function handleMinIqChange(event) {
  const value = event.target.valueAsNumber;
  setMinIq(Number.isNaN(value) ? 0 : value);
}

<input
  type="number"
  min="0"
  step="1"
  value={minIq}
  onChange={handleMinIqChange}
/>
```

Clearing the input produces NaN. The handler replaces it with 0, and the controlled value writes that zero back into the field. Continued typing can then append digits to it. This is the same handler as Bug 01, but a separate editing-state defect.

- **Reproduce with keyboard:** set 160, select all, press Backspace, type 0, then type 1.
- **Expected / actual:** clearing should leave the field editable and empty. Actual DOM values: `0 -> 00 -> 001`; final valueAsNumber is 1. The inserted zero and leading zeros are symptoms of the same editing-state defect, not separate bugs.
- **Fix applied:** keep raw draft text/native validity separately from the applied numeric minimum. Empty drafts remain empty; valid drafts still use valueAsNumber. Normalize valid leading zeros on blur.
- **Retest — PASS:** clear 160 -> empty; type 1 -> 1; finish typing 160 -> 160. No extra zero is inserted. Intentionally typed 01 or 001 normalizes to 1 on blur; invalid/empty drafts retain the last valid results.

## Bug 03 — Scientist metadata labels and values are misaligned

- **Prompt:**

```text
Read PROJECT_RULES.md and TASK_DECOMPOSITION.md.
Implement P2 only using real React.
Create ScientistDirectory with useState for people, query, minIq, sortBy.
Implement case-insensitive search, numeric IQ filtering using valueAsNumber, and IQ-desc/age-asc sorting using toSorted().
Calculate visiblePeople during render.
Use controlled inputs, useId(), and stable person.id keys.
No useEffect for filtering/sorting.
Integrate into App only if needed.
Do not commit. Stop after P2.
```

- **Code:** unstyled `<dl><dt>Age</dt><dd>…</dd><dt>IQ</dt><dd>…</dd></dl>` relies on default block layout and dd indentation.

**Original faulty layout (before the fix):**

```jsx
<dl>
  <dt>Age</dt>
  <dd>{person.age}</dd>
  <dt>IQ</dt>
  <dd>{person.iq}</dd>
</dl>
```

No scoped layout styles were applied to this definition list. The browser rendered dt/dd as separate blocks and indented dd by 40px. The semantic markup itself is valid; the missing layout styling caused the alignment problem.

- **Reproduce:** view Johann Goethe's Age/IQ fields.
- **Expected / actual:** align each label and value on a readable row. Measured positions: Age (48,350), 82 (88,368), IQ (48,386), 210 (88,404); dd has margin-left 40px. This confirms stacked/indented metadata, matching the user's screenshot. No animation or time-based jitter was demonstrated.
- **Fix applied:** added ScientistDirectory.module.css. Metadata uses a two-column grid and zero dd margins. Controls use consistent columns on larger screens and stack at 400px or below.
- **Retest — PASS:** at 375px, Age/82 share y=508.23 and IQ/210 share y=530.23; values share x=108, labels x=48. At 320px both pairs also share their row positions. No horizontal overflow: scroll/client widths 360/360 at viewport 375 and 305/305 at viewport 320.

## Before-fix recheck results

- **PASS:** 13 browser cases covering IQ 0/109/110/160/210/211, Huong in both cases, trimmed mixed-case/partial/unmatched search, and complete age/IQ sort orders.
- **PASS:** keyboard Huong deletion -> zero results/focus Reset; Space restores Huong; repeated Reset returns exactly seven records. Console warn/error logs were empty.
- **PASS:** `npm run build`; `npm run` lists dev/build/preview. No test/lint scripts exist.
- **FAIL, reproduced:** validation (Bug 01), real keyboard editing (Bug 02), metadata alignment (Bug 03). Earlier passing logic tests did not cover the editing sequence or the user's alignment expectation.
- **Evidence:** screenshots plus fresh browser captures in the system temporary folder: `ex2-audit-leading-zero.png`, `ex2-audit-metadata-layout.png`. Numeric values and metadata geometry were read from the rendered DOM.
- **Unverified:** actual screen-reader speech and React DevTools Profiler UI; previous tool limitations still apply. No complete WCAG conformance claim.

## After-fix verification

- **PASS:** all three targeted bug retests above; 13 browser Search/Filter/Sort cases; keyboard Huong Delete/Reset; focus on Reset after deletion; repeated Reset restores exactly seven records.
- **PASS:** npm run build (18 modules, CSS module bundled); browser console warn/error logs empty; git diff --check.
- **Changed:** src/components/ScientistDirectory.jsx, new ScientistDirectory.module.css, audit and WBS. No dependencies installed, no commit or push.
- **Evidence:** system temporary folder, ex2-fixed-iq-layout.png.
- **Limits:** screen-reader speech and React DevTools Profiler UI remain unverified. Passing these code fixes does not establish full WCAG compliance.
