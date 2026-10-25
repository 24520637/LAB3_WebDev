
# TASK DECOMPOSITION — LAB 3 EXERCISE 2
## Interactive Scientist & Pioneer Directory

**Project:** LAB 3 - Exercise 2  
**Framework:** React (React 19)  
---

# 1. PROJECT OBJECTIVE

Transform the legacy static `smartPeople` array into an interactive React directory.

The completed application must allow users to:

1. Search scientists by name.
2. Filter scientists by minimum IQ.
3. Sort scientists by IQ or age.
4. Delete individual scientists.
5. Restore the original dataset using Reset.
6. Receive accessible result-count updates.

The implementation must demonstrate:

- React functional components.
- React `useState()`.
- Derived state.
- Immutable array operations.
- React reconciliation with stable keys.
- Accessible controlled inputs.
- React `useId()`.
- ES2023 `.toSorted()`.

Do not use `useEffect()` for filtering or sorting.

---

# 2. INSPECTION BASELINE

## 2.1 Available evidence

The uploaded archives provide the following information:

| Source | Finding |
|---|---|
| Exercise2.zip | Contains `Exercise2/PROJECT_RULES.md` |
| Exercise1.zip | Contains a separate React/Vite application |
| Exercise1 package.json | React 19.3.1 and Vite 8.3.5 |
| Exercise1 src/main.jsx | React entry point using createRoot |
| Exercise1 src/App.jsx | Existing Exercise 1 component integration |
| LAB2_EXERCISES ZIP | MiniReact engine, Todo app, and tests |
| Exercise 2 specification | Requirements and reference component contract supplied |

The Exercise 1 application is a possible integration reference, not proof that Exercise 2 has an existing React host.

## 2.2 Missing or unverified evidence

The following have not been verified in an actual Exercise 2 checkout:

- Git status and active branch.
- Existing TASK_DECOMPOSITION.md.
- Existing React application source.
- Exercise 2 package.json.
- Exercise 2 index.html.
- Exercise 2 React entry point.
- Exercise 2 App component.
- Existing tests and test runner.
- Installed dependencies.
- Build output.
- Browser behavior.
- React DevTools Profiler results.
- Original Slide 20 source file.

All related work remains TODO until verified.

---

# 3. LAB 2 INHERITANCE

LAB 2 concepts should be adapted to real React.

| LAB 2 source | Concept | Exercise 2 application | Treatment |
|---|---|---|---|
| `Exercises/js/mini-react.js` | State updates and rendering | React useState and reconciliation | Reference only |
| `Exercises/js/app.js` | Todo lists, filtering and state changes | Scientist list, derived filtering and deletion | Adapt concepts |
| `Exercises/js/checkpoint2-verify.js` | Rendering and event verification | Testing updates, list identity and behavior | Adapt test strategy |
| `Exercises/PROJECT_RULE.md` | Accessibility, semantics, safe rendering | Accessible controls, keys and status messages | Reuse relevant principles |

## 3.1 Concepts to inherit

### Immutable state

Update arrays without modifying previous state.

Example:

```jsx
setPeople((prev) =>
  prev.filter((person) => person.id !== id)
);
```

### Derived state

Calculate displayed results from current data and inputs.

Do not create a separate state variable for visiblePeople.

### Stable keys

Use stable identifiers:

```jsx
<li key={person.id}>
```

Never use the array index as the key.

### Accessibility

Reuse relevant semantic HTML and keyboard accessibility practices.

### React rendering

React handles DOM reconciliation automatically.

Do not copy LAB 2's custom:

- MiniReact runtime.
- renderToDOM implementation.
- Custom state cursor.
- Root DOM replacement strategy.
- Custom event delegation system.

## 3.2 Excluded LAB 2 topics

Not required for Exercise 2:

- AbortController.
- Network fetching.
- Timers.
- Async loading state machines.
- Effect cleanup.
- WebSocket synchronization.

---

# 4. REQUIRED DATASET

The directory must contain seven initial records.

```jsx
export const SMART_PEOPLE = [
  {
    id: 'sp-1',
    name: 'Johann Goethe',
    age: 82,
    iq: 210
  },
  {
    id: 'sp-2',
    name: 'Albert Einstein',
    age: 76,
    iq: 205
  },
  {
    id: 'sp-3',
    name: 'Leonardo da Vinci',
    age: 67,
    iq: 180
  },
  {
    id: 'sp-4',
    name: 'Isaac Newton',
    age: 84,
    iq: 190
  },
  {
    id: 'sp-5',
    name: 'James Maxwell',
    age: 48,
    iq: 190
  },
  {
    id: 'sp-6',
    name: 'William Sidis',
    age: 46,
    iq: 200
  },
  {
    id: 'sp-huong',
    name: 'Huong Bui Nguyen Quynh',
    age: 21,
    iq: 109
  }
];
```

## Dataset rules

- Exactly seven initial records.
- Every record has id, name, age and iq.
- Every ID is unique.
- IDs remain stable during filtering and sorting.
- Preserve all six original records.
- Include `sp-huong` exactly as specified.
- Never mutate SMART_PEOPLE.
- Reset must restore all seven records.

### Important default behavior

The reference contract uses:

```jsx
const [minIq, setMinIq] = useState(160);
```

Therefore:

- Initial stored records: 7.
- Initial displayed records: 6.
- Huong is hidden initially because IQ 109 is below 160.
- Setting minimum IQ to 109 or lower must allow Huong to appear.

---

# 5. WORK BREAKDOWN STRUCTURE

## P0A — Inspect Existing Project


### Objective

Identify the actual Exercise 2 project structure before deciding whether a React/Vite setup is required.

### Tasks

- [ ] P0A.1 Locate the Exercise 2 project root.
- [ ] P0A.2 Read PROJECT_RULES.md or applicable rules.
- [ ] P0A.3 Read the existing TASK_DECOMPOSITION.md if present.
- [ ] P0A.4 Inspect Git status and branch.
- [ ] P0A.5 Inspect package.json if present.
- [ ] P0A.6 Inspect index.html if present.
- [ ] P0A.7 Inspect src/main.jsx or equivalent.
- [ ] P0A.8 Inspect src/App.jsx or equivalent.
- [ ] P0A.9 Inspect existing components and styles.
- [ ] P0A.10 Identify existing build and test scripts.
- [ ] P0A.11 Check compatibility with ES2023 toSorted().
- [ ] P0A.12 Determine whether Exercise 2 is standalone or shares an existing React host.

### Dependencies

None.

### Expected files

Inspect existing files only.

### Verification commands

```bash
pwd
git status --short
git branch --show-current
```

Inspect files using the available shell, for example:

```bash
find . -maxdepth 3 -type f
```

If package.json exists:

```bash
npm run
```

Check Node support for toSorted:

```bash
node -p "typeof [].toSorted"
```

Also verify target browser support.

### Acceptance criteria

- [ ] Actual project root verified.
- [ ] Existing files identified.
- [ ] Applicable project rules reviewed.
- [ ] Git status documented if Git is available.
- [ ] Existing scripts documented.
- [ ] Missing files identified.
- [ ] Hosting decision recorded.

### Suggested commit

None. Inspection must not create a commit.

---

## P0B — Conditional React/Vite Project Setup


### Objective

Make Exercise 2 runnable if the verified project is standalone or incomplete.

Do not create unnecessary setup files.

### Possible project conditions

**Case A — Complete React project**

If the project already has a working React application:

- Keep the existing setup.
- Reuse the current entry point.
- Reuse the current App component.
- Do not create duplicate files.
- Mark P0B as SKIPPED only after verifying the host works.

**Case B — Partial React project**

If only some setup files exist:

- Identify the missing pieces.
- Preserve working configuration.
- Create only what is required.
- Do not overwrite existing components.

**Case C — Standalone project without React setup**

Plan the minimum React/Vite configuration.

### Proposed structure if setup is missing

```text
Exercise2/
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js           (if needed)
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── data/
│   │   └── smartPeople.js
│   ├── components/
│   │   └── ScientistDirectory.jsx
│   └── styles/
│       └── app.css         (if needed)
├── PROJECT_RULES.md
└── TASK_DECOMPOSITION.md
```

This is a proposed structure, not a verified current tree.

### Tasks

- [ ] P0B.1 Classify the actual project as Case A, B or C.
- [ ] P0B.2 Determine the required React version.
- [ ] P0B.3 Determine whether Vite is already configured.
- [ ] P0B.4 Plan package.json only if missing.
- [ ] P0B.5 Plan index.html only if missing.
- [ ] P0B.6 Plan src/main.jsx only if missing.
- [ ] P0B.7 Plan src/App.jsx only if missing.
- [ ] P0B.8 Add Vite configuration only if needed.
- [ ] P0B.9 Preserve existing React and CSS conventions.
- [ ] P0B.10 Obtain approval before installing dependencies.
- [ ] P0B.11 Verify the development server.
- [ ] P0B.12 Verify the production build.

### Minimum setup requirements

If the project requires initialization, it must provide:

- React and React DOM.
- A compatible bundler (Vite if approved).
- One HTML root element.
- One React createRoot entry.
- One application App component.
- An npm development script.
- An npm build script.

Do not introduce:

- React Router unless required.
- Redux.
- UI frameworks.
- Extra state libraries.
- Duplicate entry points.

### Verification

After setup has been authorized and implemented:

```bash
npm run
npm run dev
npm run build
```

Run only scripts that actually exist.

### Acceptance criteria

- [ ] Required setup files exist.
- [ ] Only one React entry point exists.
- [ ] App mounts correctly.
- [ ] Development server works.
- [ ] Build works.
- [ ] No unrelated components are overwritten.
- [ ] No unnecessary dependencies are installed.

### Commit scope

The instructor requires exactly three feature commit messages.

If bootstrap is necessary, include it in the first feature commit only if approved by the instructor/project rules.

Do not invent a fourth mandatory commit.

---

## P1 — Normalize SMART_PEOPLE Dataset


### Objective

Create the initial dataset with unique, stable identifiers.

### Tasks

- [x] P1.1 Create or update the existing appropriate data module.
- [x] P1.2 Define SMART_PEOPLE.
- [x] P1.3 Add six original required scientists.
- [x] P1.4 Add the exact sp-huong record.
- [x] P1.5 Verify name, age and IQ types.
- [x] P1.6 Verify all seven IDs are unique.
- [x] P1.7 Ensure the source array is not mutated.
- [x] P1.8 Prepare initial-state and Reset data contracts.

### Dependencies

P0A and P0B (completed or verified unnecessary).

### Expected files

```text
src/data/smartPeople.js
```

Use the existing project location if different.

### Acceptance criteria

- [x] Exactly seven records.
- [x] IDs are unique.
- [x] Six original records unchanged.
- [x] Huong record has correct data.
- [x] All IQ and age values are numbers.
- [x] Dataset can be imported without modification.
- [x] Reset can restore the complete source dataset (array-copy data contract only; UI not implemented).

### Verification

Review the source data and check unique IDs.

Example check, if the data module can be imported by Node:

```bash
node --input-type=module -e "import('./src/data/smartPeople.js').then(({SMART_PEOPLE:p}) => console.log(p.length, new Set(p.map(x => x.id)).size))"
```

Expected values:

```text
7 7
```

### Required Git commit

```text
feat(ex2): normalize smartPeople schema with stable IDs
```

Commit only after implementation and relevant verification are complete and committing is authorized.

---

## P2 — Search, IQ Filter and Sorting


### Objective

Create the interactive Scientist Directory using React state and derived rendering.

### Tasks

- [ ] P2.1 Create ScientistDirectory function component.
- [ ] P2.2 Import React useState and useId.
- [ ] P2.3 Initialize people from SMART_PEOPLE.
- [ ] P2.4 Initialize query as an empty string.
- [ ] P2.5 Initialize minIq as 160.
- [ ] P2.6 Initialize sortBy as iq-desc.
- [ ] P2.7 Create controlled name-search input.
- [ ] P2.8 Create controlled minimum-IQ numeric input.
- [ ] P2.9 Use event.target.valueAsNumber.
- [ ] P2.10 Handle NaN for empty numeric input.
- [ ] P2.11 Create controlled sorting selector.
- [ ] P2.12 Implement case-insensitive partial search.
- [ ] P2.13 Implement numeric minimum-IQ filtering.
- [ ] P2.14 Implement IQ-descending sorting.
- [ ] P2.15 Implement age-ascending sorting.
- [ ] P2.16 Use ES2023 toSorted().
- [ ] P2.17 Calculate visiblePeople during render.
- [ ] P2.18 Render scientists using stable ID keys.
- [ ] P2.19 Integrate the directory into the existing App if needed.

### Required React state

```jsx
const [people, setPeople] = useState(SMART_PEOPLE);
const [query, setQuery] = useState('');
const [minIq, setMinIq] = useState(160);
const [sortBy, setSortBy] = useState('iq-desc');
```

### Required derived pipeline

```jsx
const visiblePeople = people
  .filter((person) =>
    person.name
      .toLowerCase()
      .includes(query.trim().toLowerCase()) &&
    person.iq >= minIq
  )
  .toSorted((a, b) =>
    sortBy === 'iq-desc'
      ? b.iq - a.iq
      : a.age - b.age
  );
```

### Important restrictions

- No useEffect for filtering.
- No useEffect for sorting.
- No visiblePeople useState.
- No mutation of people.
- No in-place sort().
- No index-based React keys.
- Use actual React hooks.

### Dependencies

P1 and a verified runnable React host.

### Expected files

```text
src/components/ScientistDirectory.jsx
src/App.jsx   (only if integration is necessary)
```

### Acceptance criteria

- [ ] Search updates immediately.
- [ ] Name search is case-insensitive.
- [ ] Partial names are supported.
- [ ] Minimum IQ is numeric.
- [ ] IQ sorting works.
- [ ] Age sorting works.
- [ ] Derived list recalculates correctly.
- [ ] Original people state is not mutated.
- [ ] Each rendered list item uses person.id.
- [ ] All inputs are controlled and labeled.

### Required Huong test cases

| Action | Expected result |
|---|---|
| Initial minimum IQ 160 | Six scientists visible |
| Minimum IQ 109 | Seven scientists visible |
| Minimum IQ 110 | Huong hidden |
| Minimum IQ 0 + search huong | Only Huong |
| Minimum IQ 0 + search HUONG | Only Huong |
| Minimum IQ 0 + sort age ascending | Huong appears first |
| Minimum IQ 0 + sort IQ descending | Huong appears last |

### Verification

Use the actual configured development server.

Manually exercise all filters and sort modes.

Inspect:

- Browser console.
- React DevTools.
- Actual DOM keys and list identity.
- Controlled input values.

### Required Git commit

```text
feat(ex2): add search, IQ filter & toSorted
```

---

## P3 — Delete, Reset and Accessibility


### Objective

Implement immutable deletion, dataset restoration and accessible announcements.

### Tasks

- [ ] P3.1 Implement handleDelete(id).
- [ ] P3.2 Remove records using prev.filter().
- [ ] P3.3 Identify scientists by their stable IDs.
- [ ] P3.4 Implement Reset.
- [ ] P3.5 Restore a fresh SMART_PEOPLE array snapshot.
- [ ] P3.6 Confirm Reset includes sp-huong.
- [ ] P3.7 Add the live result counter.
- [ ] P3.8 Use role="status".
- [ ] P3.9 Use aria-live="polite".
- [ ] P3.10 Display zero-result feedback.
- [ ] P3.11 Add accessible Delete button names.
- [ ] P3.12 Add keyboard-accessible Reset control.
- [ ] P3.13 Verify visible focus.
- [ ] P3.14 Verify appropriate focus after deletion.

### Deletion contract

```jsx
const handleDelete = (id) => {
  setPeople((prev) =>
    prev.filter((person) => person.id !== id)
  );
};
```

### Reset contract

```jsx
const handleReset = () => {
  setPeople([...SMART_PEOPLE]);
};
```

Reset restores the original people dataset.

By default, Reset does not clear query, minIq or sortBy unless the instructor explicitly requires that behavior.

### Accessible counter

```jsx
<p role="status" aria-live="polite">
  Found {visiblePeople.length} pioneers
</p>
```

### Dependencies

P2.

### Expected files

```text
src/components/ScientistDirectory.jsx
```

Existing styles may be adjusted if needed.

### Acceptance criteria

- [ ] Delete removes exactly one matching record.
- [ ] Deletion does not mutate source data.
- [ ] Reset restores all seven records.
- [ ] Huong can be deleted and restored.
- [ ] Repeated Reset does not create duplicates.
- [ ] Result count updates correctly.
- [ ] Empty results are announced.
- [ ] Buttons work with keyboard activation.
- [ ] Focus remains usable after deletion.
- [ ] Remaining list keys are stable.

### Manual verification

1. Set minimum IQ to 0.
2. Search for Huong.
3. Delete Huong.
4. Confirm zero matching results.
5. Click Reset.
6. Confirm Huong is restored.
7. Clear the search.
8. Confirm all seven records are present.
9. Delete Johann Goethe.
10. Confirm other list items retain their identity.

Repeat important interactions using the keyboard.

### Required Git commit

```text
feat(ex2): add delete/reset & live status
```

---

## P4 — QA, Build and Rendering Verification


### Objective

Verify behavior and accessibility using real execution evidence.

### Tasks

- [ ] P4.1 Verify all seven source records.
- [ ] P4.2 Verify search case sensitivity rules.
- [ ] P4.3 Verify partial search.
- [ ] P4.4 Verify minimum IQ boundaries.
- [ ] P4.5 Verify both sort modes.
- [ ] P4.6 Verify stable keys.
- [ ] P4.7 Verify deletion and reset.
- [ ] P4.8 Verify empty results.
- [ ] P4.9 Verify controlled input labels.
- [ ] P4.10 Verify live result announcements.
- [ ] P4.11 Verify keyboard navigation.
- [ ] P4.12 Verify focus after deletion.
- [ ] P4.13 Verify responsive behavior at 375px.
- [ ] P4.14 Check console warnings/errors.
- [ ] P4.15 Run configured build and test scripts.
- [ ] P4.16 Verify React rendering using DevTools Profiler.
- [ ] P4.17 Record actual results and limitations.

### Required boundary tests

| Test | Expected result |
|---|---|
| IQ = 0 | Seven visible |
| IQ = 109 | Seven visible |
| IQ = 110 | Six visible |
| IQ = 160 | Six visible |
| IQ = 210 | Johann Goethe visible |
| IQ = 211 | Zero visible |
| Search EINSTEIN | Albert Einstein |
| Search non-existent text | Zero visible |
| Age ascending | Huong first |
| IQ descending | Johann first |
| Delete Huong | Only Huong removed |
| Reset | Seven original records restored |

### Build verification

Check configured scripts:

```bash
npm run
```

If available:

```bash
npm run build
```

Run a test command only if it exists in package.json.

Do not claim tests passed when a test runner is not configured.

### Responsive verification

At exactly 375px width, verify:

- No horizontal page overflow.
- Inputs remain readable.
- Buttons remain accessible.
- Names and IQ values remain visible.
- Keyboard focus is visible.

Browser console measurement:

```js
document.documentElement.scrollWidth <=
document.documentElement.clientWidth
```

Expected result:

```text
true
```

### React rendering checkpoint

Use React DevTools Profiler.

Required checks:

- Typing one character should not cause avoidable extra committed updates.
- List identity remains stable after deletion.
- Remaining records do not remount unnecessarily.
- Controls remain responsive.

The reference checkpoint requests exactly one render pass per search character.

Development Strict Mode may invoke render functions more than once for diagnostics. Record the profiling mode and actual result before making any performance claim.

### Acceptance criteria

- [ ] Functional scenarios verified.
- [ ] Build passed or failure documented.
- [ ] Tests passed or unavailable scripts reported.
- [ ] No React key warnings.
- [ ] Accessibility manually checked.
- [ ] 375px layout verified.
- [ ] Profiler evidence captured.
- [ ] No results fabricated.

### Suggested commit

No fourth mandatory commit.

Fix relevant issues within their corresponding feature phase before committing.

---

## P5 — Evidence Collection and Final Git Review


### Objective

Collect verifiable proof that Exercise 2 satisfies its requirements.

### Tasks

- [ ] P5.1 Capture initial directory screenshot.
- [ ] P5.2 Capture minimum-IQ filtering.
- [ ] P5.3 Capture case-insensitive name search.
- [ ] P5.4 Capture IQ sorting.
- [ ] P5.5 Capture age sorting with Huong first.
- [ ] P5.6 Capture deletion of Huong.
- [ ] P5.7 Capture Reset restoring Huong.
- [ ] P5.8 Capture zero-results display.
- [ ] P5.9 Capture accessibility evidence.
- [ ] P5.10 Capture 375px layout.
- [ ] P5.11 Record build/test commands and actual output.
- [ ] P5.12 Record React Profiler results.
- [ ] P5.13 Verify required Git commit history.
- [ ] P5.14 Confirm unrelated files were preserved.

### Git verification

After authorized commits:

```bash
git status --short
git log -3 --oneline
git diff --check
```

### Required commit sequence

```text
1. feat(ex2): normalize smartPeople schema with stable IDs

2. feat(ex2): add search, IQ filter & toSorted

3. feat(ex2): add delete/reset & live status
```

Do not fabricate hashes or claim commits exist before they are created.

### Acceptance criteria

- [ ] Evidence files exist.
- [ ] Screenshots show actual behavior.
- [ ] Build/test outputs are recorded.
- [ ] All seven records were verified.
- [ ] Huong-specific tests completed.
- [ ] Three mandatory commits verified if authorized.
- [ ] Unrelated changes preserved.
- [ ] Remaining limitations documented.

---

# 6. COMPLETION REGISTER

| Phase | Status |
|---|---|
| P0A — Inspect project | INSPECTED; target-browser support not verified |
| P0B — Conditional React/Vite setup | FILES CREATED; runtime verification blocked by missing dependencies |
| P1 — Dataset normalization | DONE — data contract verified; no UI implemented |
| P2 — Search, IQ filter and sorting | TODO |
| P3 — Delete, Reset and accessibility | TODO |
| P4 — QA and build verification | NOT RUN |
| P5 — Evidence and Git verification | NOT RUN |

Do not change TODO to DONE without corresponding evidence.

## P1 execution record — 2026-10-25

Implemented only `src/data/smartPeople.js`: named `SMART_PEOPLE` export with all seven exact records from section 4. No existing UI or filtering was changed. Node assertions verified exact WBS values, seven unique string IDs, numeric finite age/IQ, stable IDs across independent module evaluations, unchanged source, and a fresh complete array-copy contract for initial state/Reset. Syntax check and diff whitespace check passed. The initial verification-script failure and its passing retest are recorded in `AI_FAILURE_AUDIT.md`, as required by the user's new instruction overriding the original audit exclusion. Browser/build checks were not rerun; P0B's dependency blocker remains. No dependencies installed, no commit or push. Stop after P1.

## P0A/P0B execution record — 2026-10-25

- Scope: P0A and P0B only. No dataset, directory features, dependency installation, commit or push.
- Exercise 2 root: `C:/Users/buing/OneDrive/Documents/WebDev/LAB3_WebDev/Exercise2`.
- Git root: parent `LAB3_WebDev`; branch `main`, initially synchronized with `origin/main`. Initial status contained only the untracked `Exercise1.zip`; it was preserved.
- Read `PROJECT_RULES.md` and this WBS before implementation. No `AGENTS.md` was found in the inspected project tree or checked ancestor locations.
- Original Exercise 2 tree contained only these two Markdown files, including hidden-file inspection. No package manifest, lockfile, HTML entry, React entry, components, styles, tests, Vite configuration or local dependencies existed. No repository-root package manifest or shared dependency directory was found.
- Classification: Case C. Hosting decision: standalone Exercise 2, based on the actual empty host and the user's explicit Exercise 2-only boundary. Exercise 1 was inspected read-only as an archive reference, never extracted or modified.
- Reference files inspected inside `Exercise1.zip`: `Exercises/package.json`, `vite.config.js`, `src/main.jsx`, and `src/App.jsx`. They use React/React DOM 19.3.1, Vite 8.3.5, React plugin 6.1.2, ESM, `createRoot`, StrictMode, and the automatic JSX runtime. These versions are reused as existing repository conventions, not asserted to be instructor-mandated versions or registry-verified availability.
- Added only `package.json`, `index.html`, `vite.config.js`, `src/main.jsx`, and a semantic placeholder `src/App.jsx`. There is one HTML root and one React entry. The React plugin configuration preserves the reference JSX convention. Development/preview ports are 5174/4174 to allow Exercise 1's 5173/4173 ports to remain available.
- No lockfile was fabricated; no dependencies were installed or copied. Root ignore rules already cover `node_modules`, `dist`, and Vite caches.

### Actual verification results

| Check | Result |
|---|---|
| Git status / branch / root | PASSED: actual locations and initial state recorded above |
| `node --version` / `npm --version` | PASSED: v26.8.2 / 11.19.1 |
| `node -p typeof([].toSorted)` | PASSED: `function` |
| `npm run` | PASSED: lists `dev`, `build`, `preview`; no test/lint scripts |
| `npm run dev` | FAILED: `'vite' is not recognized`; server did not start |
| `npm run build` | FAILED: `'vite' is not recognized`; no production build produced |
| `npm ls --depth=0` | FAILED: ELSPROBLEMS; all four declared dependencies are missing |
| `git diff --check` | PASSED for tracked changes |
| Browser mount and browser `toSorted()` | NOT RUN: no runnable server; target browser unspecified |
| Tests / lint | NOT RUN: no configured scripts or test runner |
| Preview | NOT RUN: no successful production build |

P0B is not marked DONE or SKIPPED: installing the declared dependencies requires user approval, and development/build/browser acceptance criteria remain unverified. Stop here; P1–P5 remain unchanged. Local PowerShell launches failed with a Windows CET support error; inspection and npm commands were run using `cmd.exe` instead.

---

# 7. UNRESOLVED QUESTIONS

## Q1 — Standalone or shared application?

The Exercise 2 archive contains rules but no React starter.

Verify whether implementation belongs in:

- A standalone Exercise2 project.
- The existing Exercise 1 React project.
- Another instructor-provided application.

Do not decide solely from the ZIP contents.

## Q2 — Reset scope

The reference Reset behavior restores people data.

Confirm whether controls should remain unchanged or return to defaults.

## Q3 — React/Vite versions

If creating a standalone project, confirm the permitted dependency versions and setup conventions.

Do not assume Exercise 1 versions are mandatory for Exercise 2.

## Q4 — ES2023 support

Confirm that Node and target browsers support `.toSorted()`.

Do not silently replace it with mutable `.sort()`.

## Q5 — Git setup scope

If standalone bootstrap files are required, confirm whether they should be included in the first required feature commit.

## Q6 — Testing environment

Determine the actual test runner, build scripts and approved evidence location.

Do not install a new testing dependency without approval.

---

# 8. OUT-OF-SCOPE WORK

Do not implement:

- `AI_FAILURE_AUDIT.md` is now required by the user's 2026-10-25 instruction and is excluded from this out-of-scope list. Record real testing failures; the minimum three-bug target must not be met with fabricated findings.
- Adversarial prompts.
- Failure experiments.
- API fetching.
- AbortController.
- Timers.
- Effect cleanup.
- Loading state machines.
- Custom MiniReact rendering.
- Redux or unrelated state libraries.
- Extra directory features beyond the assignment.


---

# 9. FINAL ACCEPTANCE CHECKLIST

Exercise 2 is complete only when:

- [ ] Actual project setup is verified.
- [ ] React application runs successfully.
- [ ] Dataset contains seven exact records.
- [ ] Huong record is included.
- [ ] Name search works.
- [ ] Numeric IQ filter works.
- [ ] IQ descending sorting works.
- [ ] Age ascending sorting works.
- [ ] Derived state is used without filtering effects.
- [ ] Delete works immutably.
- [ ] Reset restores all seven records.
- [ ] Stable React keys are used.
- [ ] useId associates labels and controls.
- [ ] Accessible live result counter works.
- [ ] Keyboard and focus behavior is verified.
- [ ] Responsive layout is verified.
- [ ] Available build/tests pass or limitations are documented.
- [ ] React rendering behavior is inspected.
- [ ] Required evidence is collected.
- [ ] Three mandatory commits are verified if authorized.
- [ ] Unrelated project files remain intact.

