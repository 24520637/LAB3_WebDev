# Lab 3 — Exercise 1: Semantic Engineer & Pro-Gamer Profile Card

## 1. Project Objective

Plan a React 19 profile card composed of `DeveloperCard` and reusable `SkillBadge` function components. Combine the developer-card and user-profile concepts attributed to Lab 2 Exercises 4.4 and 4.5 in the user's specification. Prioritize semantic structure, safe avatar handling, accessible content, and mobile-first development: implement and verify the 375px layout first, then progressively enhance the same card for laptop screens.

**Current deliverable:** this document only. All implementation tasks, application checks, and Git commits below are future work. An unchecked box means pending, not a failed test. No production code or dependencies are introduced by this plan.

## 2. Exercise Scope and Constraints

### Inspection findings and source boundaries

Paths below are relative to `C:/Users/buing/OneDrive/Documents/WebDev/LAB3_WebDev/Exercises`, unless an absolute path is given.

| Item | Observed evidence and planning consequence |
| --- | --- |
| Current Lab 3 directory | Contains only `PROJECT_RULES.md` before this document was created. Its rules were read and govern this plan. |
| Requested instruction files | No `PROJECT_RULE.md`, `AGENTS.md`, `README.md`, `package.json`, or existing `TASK_DECOMPOSITION.md` in this directory; no ancestor `AGENTS.md` found. The actual rules filename is plural: `PROJECT_RULES.md`. |
| Lab 3 starter | No `src`, React entry point, stylesheet, lockfile, project dependencies, test runner, or build configuration found here. Sibling `../HomeWork` is empty. React 19 installation and CSS Module support remain unverified. |
| Ancestor package | `C:/Users/buing/package.json` exists, with MongoDB and development dependencies including Testing Library, jsdom, and tsx. It does not establish a Lab 3 React app, scripts, or supported test setup. Do not adopt it as this project's configuration. |
| Git | `git status --short` and `git rev-parse --show-toplevel` report that this directory is not a Git repository. Commit tasks require the actual intended repository first. |
| Lab 2 archive | Inspected `C:/Users/buing/OneDrive/Documents/WebDev/LAB2_WebDev/LAB2_EXERCISES.zip`: contains an `Exercises/` tree with JavaScript, tests, HTML, CSS, rules, and planning documents. Read `Exercises/js/mini-react.js` and `Exercises/js/app.js` directly from the archive without extracting files. |
| Existing Lab 2 copy | Inspected `../LAB2_Exercises/js/mini-react.js`, `../LAB2_Exercises/js/app.js`, `../LAB2_Exercises/index.html`, `../LAB2_Exercises/js/test-runner.js`, `../LAB2_Exercises/PROJECT_RULE.md`, and its existing `TASK_DECOMPOSITION.md`. Core runtime/app behavior matches the archive content inspected. Lab 2 rules and milestone messages are historical context, not Lab 3 acceptance requirements. |
| Relevant Lab 2 tests | Read `../LAB2_Exercises/tests/createTextElement.test.js`, `createElement.test.js`, `renderToDOM.test.js`, `stateStore.test.js`, `stateCursor.test.js`, `task-2-6-test.js`, and `task-2-9-test.js`. They use Node test/assert APIs; some use jsdom and others mock DOM objects. These are MiniReact tests, not a verified Lab 3 test suite. |
| Slide and Exercises 4.4/4.5 | No slide file or implementation for those two cards was found in the inspected Lab 3 tree or archive listing. Use the requirements supplied in the user's request; exact visual design, metric names, skill labels, and profile content are unverified. Do not invent additional slide requirements. |

### Required boundaries

- Use real React 19 and the actual starter's conventions once available. Never copy MiniReact, its state engine, renderer, or delegation registry into Lab 3.
- `DeveloperCard.jsx` must contain zero opening or closing `div` tags. Choose semantic elements by meaning; a Fragment adds no DOM wrapper.
- Associate the root `article` with its heading through `aria-labelledby`. Use `header`, a suitable heading, optional `hgroup` for a heading and related subtitle, `dl`/`dt`/`dd` for metrics, and `ul`/`li` for skills.
- Render metrics through `Object.entries(metrics).map(...)`; use a keyed React `Fragment` to group each term/value pair. Use stable `skill.id` keys for skills.
- Use `DeveloperCard.module.css`, scoped classes, and useful CSS custom properties. No inline style objects or replacement global styling system.
- Remote avatar sources must use HTTPS. Provide meaningful image alt text, explicit width and height, and visible initials when loading fails.
- Fit the page at 375px without horizontal overflow; verify applicable WCAG 2.2 AA contrast and accessibility requirements.
- Follow mobile-first CSS: default rules provide the mobile layout without a media query. Complete the 375px acceptance gate before adding laptop enhancements through content-driven `min-width` media queries where needed. Reuse the same components and semantic DOM at every width.
- Do not add forms, editing, filtering, fetching, persistence, animation, ranking systems, UI libraries, or extra interactions. “Pro-Gamer” describes the assigned profile concept; it does not require a game.
- Hooks and effects are not general requirements for a static card. A small React `onError` handler and real React state are appropriate if chosen to implement the required avatar fallback; no custom hook engine or `useEffect` synchronization is needed.

### Proposed implementation paths

**Every path in this table is proposed and currently absent.** Confirm the starter root in TASK 1.1 before creating files. If the supplied starter differs, update this document and verification commands to its verified paths.

| Proposed path | Purpose |
| --- | --- |
| `src/components/DeveloperCard.jsx` | Card structure, metrics, skill composition, avatar fallback |
| `src/components/SkillBadge.jsx` | Reusable, non-interactive skill label |
| `src/components/DeveloperCard.module.css` | Scoped card and badge styling, responsive rules, tokens |

The application entry point, sample-data location, test files, and package scripts are **unresolved**. Reuse their actual locations when supplied; this plan does not invent filenames or commands for them. Share module classes with `SkillBadge` through an explicit `className` prop to avoid requiring an extra stylesheet.

## 3. Lab 2 → Lab 3 Knowledge Mapping

| Inspected Lab 2 concept | Classification | Transfer to this exercise |
| --- | --- | --- |
| Exercise 1: `createTextElement` returns `TEXT_ELEMENT` with `props.children`; `createElement` normalizes primitive/nested children | Conceptual only | Understand JSX as a tree of elements, props, and children. Let React handle element creation; do not construct MiniReact VNodes. |
| Exercise 1: `renderToDOM` recursively mounts children and preserves ARIA/class attributes | DOM semantics directly used; mounting algorithm conceptual only | Choose meaningful HTML and preserve accessible names in JSX. React owns DOM updates and mounting through the real starter. |
| Exercise 2: persistent `stateStore`, resetting `cursor`, setter closures in `useState` | Conceptual only | Explain stable Hook ordering. If fallback needs state, import the actual Hook from React and call it at component top level. No state engine is implemented. |
| `app.js`: append with spread; update an item with `map` and object spread | Read-only/immutable data directly used; editing flow not required | Do not mutate profile props, metrics, or skills. No Todo-style state updates or editing controls are required. |
| `app.js`: `visibleTasks` is derived with `filter` during render; list uses entity IDs | Directly used | Map metrics and skills from props; derive initials during render. Use metric property names and skill IDs as stable keys, not indexes or random values. |
| `setupEventDelegation`: root listeners, handler Map, nearest matching ancestor | Conceptual only | Rely on React's event system for any fallback handler; do not transplant listener setup, handler IDs, or `this`-based form logic. |
| Safe text nodes, blocked dangerous URL schemes, semantic headings and ARIA | Principles directly used | Render text through ordinary JSX interpolation; validate avatar protocol independently. Lab 2's scheme blocklist does not itself enforce HTTPS-only sources. |
| Lab 2 test coverage for text safety, children, cursor slots, rerendering, delegation | Verification ideas directly used; runtime tests not required | Verify this card's output and failures with the real app and available tools; MiniReact tests cannot establish React card correctness. |
| Todo forms, click filters, lifecycle loading/retry and asynchronous feeds | Not required | Do not add them. `useEffect`, forms, and general event handlers are not mandatory; only the required image-failure behavior may need a small handler. |

## 4. Work Breakdown Structure (WBS)

Each task includes its own acceptance criteria so a beginner can finish and verify one slice at a time. File labels retain the observed/proposed distinction above.

### EPIC 1: Inspect project and establish component/data contract

#### TASK 1.1 — Resolve starter and tooling prerequisites

**Objective:** Know where implementation will run before creating components.

**Files involved:** verified `PROJECT_RULES.md`, this `TASK_DECOMPOSITION.md`, and the Lab 2 references in section 2. Starter/configuration paths remain unresolved.

**Steps:**
1. Review the findings above. Obtain or locate the intended Lab 3 starter and original slide when available.
2. Inspect its actual README, package manifest, lockfile, scripts, React/React DOM versions, JSX setup, CSS Module handling, entry point, tests, and Git root.
3. Record the confirmed paths and exact available commands here. Resolve React 19 or build-support gaps before feature implementation; do not silently scaffold a different app or install tools.

**Acceptance criteria:**
- [ ] Actual starter root, entry point, React 19 dependencies, CSS Module support, and Git root are recorded.
- [ ] Available build/lint/test commands are copied from real configuration, or their absence is stated.
- [ ] Proposed paths are confirmed or corrected; missing slide details remain explicitly unresolved.

**Verification:** filesystem/configuration inspection and Git root check. **Dependencies:** none. **Current status:** blocked for future implementation by missing starter; inspection findings above are already recorded.

#### TASK 1.2 — Agree on the smallest profile data contract

**Objective:** Give both components clear inputs without adding features.

**Files involved:** this document; proposed component files; sample-data location to be verified in TASK 1.1.

**Steps:**
1. Record the profile name, short role/subtitle, avatar URL, metrics object, and skills array needed by the supplied card content. Do not invent biography fields or metrics as slide facts.
2. Define `DeveloperCard` inputs for those fields. Define each skill as a stable unique `id` plus visible `label`; define `SkillBadge` inputs as `label` and optional styling `className`.
3. Define readable metric labels with string/number values, including numeric zero. Use unique metric property names as keys.
4. Choose a heading ID strategy that remains unique for multiple card instances: caller-provided unique ID or React `useId`. Derive initials from the name, with a documented neutral fallback for an empty name.
5. Keep avatar-failure state local if necessary; initials, metric entries, and skill labels remain derived values. Limit this static contract to fixed avatar props; dynamic avatar editing is outside scope.

**Acceptance criteria:**
- [ ] Props, data types, stable IDs, metric labels, initials behavior, and heading ID ownership are recorded.
- [ ] Values are read-only; zero metrics remain visible and empty collections render without errors or invented placeholder features.
- [ ] Exact profile content is confirmed from supplied material or clearly marked as provisional sample content.

**Verification:** trace one sample profile through both component contracts on paper. **Dependencies:** TASK 1.1.

### EPIC 2: Implement semantic SkillBadge

#### TASK 2.1 — Build a reusable display-only badge

**Objective:** Render one skill consistently wherever the card uses it.

**Files involved:** proposed `src/components/SkillBadge.jsx`.

**Steps:**
1. Create a function component using the confirmed module/export convention.
2. Render the supplied label as JSX text in a small phrasing element such as `span`. Here it represents a short label, not a structural wrapper.
3. Accept a `className` for later CSS Module integration. Let the card own the surrounding `li` and list keys.
4. Avoid a button role, click handler, or tab stop because the badge has no action.

**Acceptance criteria:**
- [ ] Two different labels can use the same component without duplicated badge markup in the card.
- [ ] Labels render as text, including HTML-like input; the badge creates no interactive control.
- [ ] List-item ownership and styling input match TASK 1.2.

**Verification:** source review and rendering in the actual application when integrated in TASK 3.2. **Dependencies:** TASK 1.2.

### EPIC 3: Implement semantic DeveloperCard and metrics

#### TASK 3.1 — Build the named article and metric pairs

**Objective:** Express the profile as meaningful HTML without `div` elements.

**Files involved:** proposed `src/components/DeveloperCard.jsx`.

**Steps:**
1. Render an `article`, a `header`, and a heading at the level appropriate to the host page. Use `hgroup` only if grouping the heading and subtitle helps express their relationship.
2. Point `aria-labelledby` at the heading's unique ID; keep the same ID for that mounted instance.
3. Render `Object.entries(metrics).map(...)` inside a `dl`. Return an explicitly imported React `Fragment` keyed by the metric property name, containing a `dt` followed by its `dd`.
4. Use ordinary JSX text for names, labels, and values. Avoid raw HTML insertion and extra wrappers; the short Fragment syntax cannot accept a key.

**Acceptance criteria:**
- [ ] Component source contains zero opening/closing `div` tags, and rendered card descendants contain none.
- [ ] Article accessible name resolves to its visible heading; two instances have distinct heading IDs.
- [ ] Every metric is a correct `dt`/`dd` pair from `Object.entries(metrics).map(...)`, with a stable Fragment key; numeric zero renders.

**Verification:** source inspection from section 7, rendered Elements panel, accessibility tree, and normal/empty/zero metric fixtures. **Dependencies:** TASK 1.2.

#### TASK 3.2 — Compose the skills and mount through the real app

**Objective:** Show the complete data-driven card through the starter's real entry point.

**Files involved:** proposed component files; actual host/sample-data files identified in TASK 1.1.

**Steps:**
1. Render a `ul` containing one `li` per skill. Put `key={skill.id}` on the mapped `li`, and render `SkillBadge` inside it.
2. Connect the card to the confirmed host page using the contracted profile data. Reuse the starter's React mounting setup; do not use MiniReact or legacy `ReactDOM.render`.
3. Check ordinary data, an empty skill array, duplicate visible labels with different IDs, and two card instances using temporary fixtures or existing test facilities.

**Acceptance criteria:**
- [ ] The real app displays the card and reusable badges with valid `ul` → `li` structure.
- [ ] Keys use stable unique IDs and are not generated during render; duplicate labels do not collide.
- [ ] No missing-key, duplicate-key, or mounting warnings appear; empty arrays do not crash.

**Verification:** real-entry-point rendering, source review, and Console inspection. **Dependencies:** TASK 2.1 and TASK 3.1.

#### TASK 3.3 — Add HTTPS avatar handling and initials fallback

**Objective:** Keep identity understandable when the avatar fails.

**Files involved:** proposed `src/components/DeveloperCard.jsx`; confirmed sample-data location.

**Steps:**
1. Inspect the actual avatar literal and incoming URL. Accept only an absolute URL whose parsed protocol is `https:`; missing, malformed, or insecure values select initials without issuing that image request.
2. Give the successful `img` meaningful alt text such as a portrait description including the profile name, plus explicit positive `width` and `height` attributes.
3. On load failure, use React's `onError` and minimal local state if needed to replace the failed image with visible initials. Do not repeatedly assign another failing URL or manually register DOM listeners.
4. Derive initials during render. Give the fallback an understandable accessible identity without repeating the person's name unnecessarily; document whether nearby heading text already provides it.

**Acceptance criteria:**
- [ ] Actual avatar sources are HTTPS-only; insecure/malformed values render initials without being requested.
- [ ] Successful image has meaningful alt text and explicit dimensions.
- [ ] Blocking the HTTPS image request produces readable initials, no broken-image icon, and no retry loop.
- [ ] Fallback does not require `useEffect`, copied MiniReact state code, or unrelated interactions.

**Verification:** inspect source and `img` attributes; use DevTools request blocking and invalid URL fixtures; inspect fallback accessible output. **Dependencies:** TASK 3.2.

### EPIC 4: Implement mobile-first CSS Module, then enhance for laptop

#### TASK 4.1 — Build the default mobile presentation after semantic checkpoint

**Objective:** Style the existing semantics for a 375px viewport through the required module before developing the laptop layout.

**Files involved:** proposed `src/components/DeveloperCard.module.css` and both proposed component files.

**Steps:**
1. After TASK 6.1, create/import the module and apply its classes to the existing elements. Pass the badge class through `SkillBadge`'s styling prop.
2. Define a small set of card-scoped custom properties for repeated colors, spacing, and shape values. Use classes for variants or fixed avatar/fallback dimensions.
3. Write default CSS for mobile: use a simple stacked layout, readable typography, metric alignment, and wrapping skills. Work with DevTools set to 375 CSS pixels; do not start with a laptop layout and shrink it afterward.
4. Keep the mobile baseline outside media queries. Do not add laptop-specific overrides until TASK 4.2 passes; retain the existing semantic DOM and avoid inline style objects.

**Acceptance criteria:**
- [ ] Computed styles come from the imported CSS Module and card/badge classes.
- [ ] Neither component uses inline style objects; custom properties live in CSS.
- [ ] Default rules provide the mobile layout without requiring a media query; laptop-specific enhancements have not been added yet.
- [ ] Semantic markup, keys, image dimensions, and fallback behavior still satisfy EPIC 3.

**Verification:** source imports, default CSS rule inspection, and DevTools Styles/Computed inspection at 375px. **Dependencies:** TASK 6.1.

#### TASK 4.2 — Pass the 375px mobile acceptance gate

**Objective:** Verify the mobile baseline is complete before beginning laptop enhancements.

**Files involved:** proposed `src/components/DeveloperCard.module.css`; verified host styles/viewport configuration only if an actual integration issue requires a minimal correction.

**Steps:**
1. Use border-box sizing, fluid widths bounded by the parent, flexible layout, and wrapping skills. Avoid fixed minimum widths larger than available space.
2. Allow long names, skill labels, and metric values to wrap; use appropriate `min-width` and overflow wrapping on flex/grid children.
3. Preserve the image/fallback footprint. Confirm the actual HTML entry point has a responsive viewport declaration.
4. Emulate a 375 CSS-pixel viewport and inspect the entire document, not only the card. Fix the source of overflow rather than hiding it with page-wide `overflow-x: hidden`.
5. Record the mobile results, including ordinary content, long text, and image failure. Fix any mobile failures before starting TASK 4.3.

**Acceptance criteria:**
- [ ] At 375px, `document.documentElement.scrollWidth <= document.documentElement.clientWidth` is `true`.
- [ ] Standard content, long labels, and the failed-image state remain readable without clipping or horizontal scrolling.
- [ ] Mobile measurements and fixture results are recorded before laptop enhancement work starts.

**Verification:** device emulation, Console width measurement, and visual inspection at 375px. **Dependencies:** TASK 4.1.

#### TASK 4.3 — Enhance the verified mobile card for laptop

**Objective:** Use additional screen space while preserving the completed mobile behavior.

**Files involved:** proposed `src/components/DeveloperCard.module.css`; verified host styles only if a real integration issue requires a minimal correction.

**Steps:**
1. Start only after TASK 4.2 passes. Gradually widen the viewport and observe where spacing or layout can benefit from more room.
2. Keep fluid defaults when they already work. Add `min-width` media queries only where needed, choosing breakpoints from the content rather than assuming an existing breakpoint configuration.
3. Adjust card maximum width, spacing, or column arrangement where useful; preserve reading order, semantics, and the same React components. Do not create a separate laptop component or introduce features.
4. Inspect a laptop-sized viewport, for example 1366px wide, and record the actual dimensions used. This is a suggested verification width, not an additional slide requirement. Resize through intermediate widths to check wrapping and overflow around each breakpoint.
5. Return to 375px and repeat the mobile checks with ordinary content, long text, and avatar fallback after all laptop changes.

**Acceptance criteria:**
- [ ] Laptop enhancements are added only after the mobile acceptance gate; any width-based overrides use `min-width` queries.
- [ ] The same card is readable at the recorded laptop width and intermediate widths without horizontal overflow or duplicated markup.
- [ ] Final 375px regression checks still pass, including long content and fallback; both mobile and laptop evidence are recorded.

**Verification:** CSS source review, viewport resizing, Console width measurements, and final return to 375px. **Dependencies:** TASK 4.2.

### EPIC 5: Security, accessibility, and quality verification

#### TASK 5.1 — Audit semantics, names, contrast, and safe text

**Objective:** Verify the finished card's applicable quality requirements.

**Files involved:** proposed component/module files and confirmed host/sample-data files; no new tooling assumed.

**Steps:**
1. Follow the source, DOM, accessibility-tree, avatar, and contrast checks in sections 7–8.
2. Check names, heading order, description-list relationships, skill list structure, and image/fallback output. Do not add ARIA roles that duplicate native semantics unnecessarily.
3. Measure actual foreground/background pairs for text, badges, and initials. Check keyboard navigation only for real host interactions; do not add focusable static card content.
4. Temporarily supply HTML-like text as a profile name/skill label. Confirm it appears literally and creates no injected elements; restore the intended profile afterward.

**Acceptance criteria:**
- [ ] Required semantic/name relationships and safe text output are evidenced.
- [ ] Applicable text contrast meets 4.5:1 for normal text or 3:1 for qualifying large text; relevant non-text UI indicators meet 3:1 where applicable.
- [ ] No unintended focus stops exist; any existing affected interaction remains keyboard-operable with visible focus.
- [ ] Findings are fixed or recorded as unresolved; no blanket WCAG compliance claim rests on an automated score.

**Verification:** manual inspection, available contrast measurement, and the evidence checklist. **Dependencies:** TASK 4.3.

#### TASK 5.2 — Run available project checks and record outcomes

**Objective:** Distinguish verified behavior from planned verification.

**Files involved:** actual package/configuration/test paths found in TASK 1.1; proposed component/module files; this document for results.

**Steps:**
1. Run only the real starter's available build, lint, and relevant test commands. Record exact commands, outcomes, and failures.
2. If an existing component test setup exists, cover card naming, metric pairs including zero, skills with IDs, and failed-avatar behavior using its conventions.
3. If no such setup exists, perform the manual checks and mark automated checks unavailable. Do not install a test framework or create pretend test paths for this assignment.
4. Reload the real application and review Console messages after normal rendering and intentional avatar failure. An intentionally blocked image may produce a network error; distinguish that expected diagnostic from React warnings or application failures.

**Acceptance criteria:**
- [ ] Every relevant available command has a recorded result; unavailable checks explain why.
- [ ] No unexplained application error or React warning remains.
- [ ] Final 375px, laptop, semantic, avatar, and CSS Module checks have recorded evidence, not inferred success.

**Verification:** command output and actual browser evidence. **Dependencies:** TASK 5.1.

### EPIC 6: Git commits and final audit

#### TASK 6.1 — Record the semantic component checkpoint

**Objective:** Create the first future atomic commit before styling begins.

**Files involved:** proposed component files and verified host/sample-data files; exact staging set resolved after TASK 1.1.

**Steps:**
1. In the confirmed Git repository, inspect status/diff and verify TASKS 2.1–3.3. Keep this checkpoint renderable without importing a nonexistent CSS Module.
2. Stage only semantic component implementation, required host/data integration, and directly relevant existing-test changes, if any. Review the staged diff.
3. Use exactly `feat(ex1): implement semantic DeveloperCard and SkillBadge`.

**Acceptance criteria:**
- [ ] Commit contains working semantic structure, data rendering, keys, and safe avatar/fallback behavior.
- [ ] It contains no responsive styling work, unresolved imports, or unrelated changes.
- [ ] The actual recorded commit message matches the required first message.

**Verification:** staged diff, real-entry-point check, then commit inspection. **Dependencies:** TASK 3.3 and verified Git prerequisites from TASK 1.1. **Timing:** before EPIC 4, despite its placement in this Git epic.

#### TASK 6.2 — Record responsive styling and audit final delivery

**Objective:** Create the second future atomic commit and confirm the exercise is ready.

**Files involved:** proposed module and the minimal class/import changes in component files; only verified host corrections and related verification documentation if applicable.

**Steps:**
1. Confirm EPIC 5 results and section 10. Review staged changes against the semantic checkpoint.
2. Stage module styling, its imports/class wiring, and only responsive host fixes actually needed. Remove temporary fixtures/debugging artifacts from the intended diff.
3. Use exactly `style(ex1): add responsive 375px CSS module`.
4. Inspect both commits and the working tree. Record remaining unrelated changes without staging them or discarding them.

**Acceptance criteria:**
- [ ] Second commit contains the scoped responsive presentation and required wiring, with the exact second message.
- [ ] Both commits are independently coherent and ordered semantic implementation → responsive styling.
- [ ] Final diff includes no copied runtime, secrets, dependencies added without agreement, or unrelated files.
- [ ] Evidence and unchecked limitations accurately reflect the final version.

**Verification:** `git status --short`, staged diff, `git show --stat`, and `git log -2 --format=%s` in the confirmed repository. **Dependencies:** TASK 5.2 and TASK 6.1.

## 5. Task Dependencies and Suggested Implementation Order

Execute in this order:

`1.1 → 1.2 → 2.1 → 3.1 → 3.2 → 3.3 → 6.1 → 4.1 → 4.2 → 4.3 → 5.1 → 5.2 → 6.2`

The styling sequence is mandatory: **mobile default CSS → pass 375px checks → enhance for laptop → recheck 375px**. Component/data and semantic work comes first because both layouts use the same structure. Mobile-first describes the order of responsive styling, not a separate mobile application.

TASKS 2.1 and 3.1 can be developed independently after the contract; both must finish before integration. Resolve the missing starter before implementation. The first commit is deliberately placed before CSS work so neither commit depends on unstaged styling files. Defer all commit execution until the future implementation work is authorized; this documentation request creates none.

## 6. Acceptance Criteria for Every Task

The checkboxes embedded in each task are that task's acceptance gate. Use this coverage index during review:

| Task | Completion evidence |
| --- | --- |
| 1.1 | Confirmed starter, React 19/tooling, paths, scripts, and Git root |
| 1.2 | Profile/badge contract, IDs, zero/empty-data and initials decisions |
| 2.1 | Reusable non-interactive badge and safe text output |
| 3.1 | Zero div tags, named article, keyed Fragment metric pairs |
| 3.2 | Real-app integration, semantic skills list, stable IDs, no key warnings |
| 3.3 | HTTPS-only avatar, alt/dimensions, successful initials fallback |
| 4.1 | Loaded CSS Module with default mobile rules, scoped classes/tokens, no inline styles |
| 4.2 | Recorded 375px mobile acceptance gate before laptop work |
| 4.3 | Laptop/intermediate-width evidence, content-driven min-width overrides if needed, final 375px regression |
| 5.1 | Semantic/accessibility, measured contrast, safe-text evidence |
| 5.2 | Actual configured check results and browser outcomes |
| 6.1 | First exact-message commit with reviewed semantic staging |
| 6.2 | Second exact-message commit, reviewed history/diff and final audit |

Only check a criterion after its verification method has been executed. If a prerequisite is missing, report **not run — prerequisite missing**, not passed.

## 7. Testing and Verification Plan

**Current status:** repository/archive inspection completed; implementation, application tests, builds, browser checks, contrast measurements, and commits **not run**. There is no Lab 3 app to execute. Historical Lab 2 test assertions were read, not executed or certified.

### Source inspection after implementation

Run these only after TASK 1.1 confirms the proposed paths. They are planned commands, not current results:

```sh
rg -n -i '<\s*/?\s*div\b' src/components/DeveloperCard.jsx
rg -n 'Object\.entries|Fragment|aria-labelledby|key=' src/components/DeveloperCard.jsx
rg -n 'style\s*=|\.module\.css|className' src/components/DeveloperCard.jsx src/components/SkillBadge.jsx
```

- For the first command, zero matches is expected; ripgrep exit code 1 means no matches, while a missing-file/error result does not prove compliance. Review source manually for unusual multiline markup and check rendered descendants too.
- For metrics/keys, inspect the complete mapping callbacks: search matches alone do not establish correct placement. Verify Fragment keys use metric property names and mapped skill list items use `skill.id`.
- Inspect the module import and class references; inspect all component style usage manually. There must be no inline style objects, even if a search misses an unusual spelling.
- Locate the actual avatar value in the confirmed sample data and follow it to `img.src`. Inspect avatar literals specifically, then verify the parsed protocol and rendered `currentSrc`/Network request are HTTPS. Do not treat unrelated `http://` text in documentation or development tooling as an avatar failure.
- Review ordinary JSX interpolation and the absence of unsafe HTML insertion or executable string handlers. Do not copy Lab 2 URL filtering as a substitute for HTTPS enforcement.

### Planned scenario matrix

| Scenario | Expected result | Method | Status |
| --- | --- | --- | --- |
| Normal profile | Correct name/subtitle, all metric pairs and skills, successful avatar | Real app, DOM and accessibility inspection | Not run |
| Metric value zero; empty collections | Zero remains visible; no missing items from truthiness mistakes; no crash | Temporary fixtures or existing test setup | Not run |
| Reordered skills; duplicate labels with distinct IDs | Stable ID keys; no duplicate/missing-key warnings | Source review and real rerender via available fixtures | Not run |
| Two cards | Unique heading IDs and correct article names | DOM and accessibility inspection | Not run |
| Failed HTTPS avatar | Visible initials, usable accessible identity, no retry loop | Block its request in DevTools and reload | Not run |
| Missing/malformed/non-HTTPS avatar | Initials; rejected URL not requested | Temporary data fixtures plus Network panel | Not run |
| Long name/skill/value at 375px | Readable wrapping and no horizontal overflow | Device toolbar plus Console measurement | Not run |
| Laptop enhancement after mobile acceptance | Readable same-card layout at a recorded laptop width and intermediate widths; no overflow | Resize viewport, inspect CSS min-width rules, measure document width | Not run |
| Return to 375px after laptop work | Normal/long content and avatar fallback still fit the mobile layout | Repeat mobile fixtures and Console measurement | Not run |
| HTML-like profile/skill text | Literal text, no injected element | Fixture, Elements panel, available component tests | Not run |
| Final visual colors | Applicable measured contrast thresholds satisfied | Contrast tool using computed color pairs | Not run |
| Project build/lint/tests | Actual configured checks succeed or failures are recorded | Commands discovered in TASK 1.1 | Not run; no Lab 3 configuration |

Use existing test infrastructure if present; do not translate MiniReact runtime tests into required React implementation tasks. Automated checks complement manual semantics, image failure, and responsive checks.

## 8. Browser/DevTools Evidence Checklist

For each future check, record the browser/version, page route, viewport, relevant fixture, result, and evidence reference. Evidence may be captured through the review workflow; this documentation-only task creates no screenshots or extra files.

- [ ] **Elements:** card is an `article` containing its `header`; heading ID matches `aria-labelledby`; no descendant `div`; metrics are `dl` → `dt`/`dd`; skills are `ul` → `li`.
- [ ] **Accessibility tree:** article has the profile heading as its accessible name; heading, term/value content, list/items, and avatar/fallback identity are understandable. Inspect corresponding DOM as well: browsers may flatten `header`/`hgroup` or expose them generically rather than as literal tag-named accessibility nodes.
- [ ] **Avatar:** successful `img` exposes meaningful alt, width, and height; source and request use HTTPS. Request-blocked reload shows initials, reserves the styled footprint, and avoids repeated failed requests.
- [ ] **375px viewport:** enable Chrome DevTools device toolbar in responsive mode, set width to 375 CSS pixels, record height, and reload. Capture the whole card with normal and long-content/fallback fixtures.
- [ ] **Overflow:** in that page's Console, evaluate `document.documentElement.scrollWidth <= document.documentElement.clientWidth`; record both widths and the Boolean result. Expected: `true`.
- [ ] **CSS:** Styles/Computed points to `DeveloperCard.module.css` through the bundler's module output; scoped classes are applied to card and badges; no inline style dependence exists.
- [ ] **Console:** no React key, invalid-nesting, or other unexplained warnings after normal rendering/reload and available rerender checks. Label expected request-blocking diagnostics separately.
- [ ] **Contrast:** record computed foreground/background colors and measured ratio for body text, metadata, badge text, and initials. Check 4.5:1 normal text / 3:1 qualifying large text; assess applicable non-text indicators separately.
- [ ] **Keyboard/zoom:** static content adds no tab stops; existing affected controls retain visible focus and keyboard use. Check readable wrapping under browser zoom as a supporting accessibility check, recording the zoom used.
- [ ] **Mobile-first sequence:** record TASK 4.2 results before laptop work; confirm default mobile rules and any `min-width` enhancement queries in the CSS Module.
- [ ] **Laptop and intermediate widths:** after the mobile gate passes, record the selected laptop dimensions and confirm readable content and no overflow through intermediate widths.
- [ ] **Mobile regression:** after laptop enhancements, return to 375px and repeat normal/long-content/fallback checks and the document-width measurement; record the final results.

## 9. Git Commit Plan

**No commits were created.** Current directory has no Git repository. Resolve its intended starter/repository before attempting these future steps; do not initialize a separate repository or make a setup commit merely to satisfy this plan.

| Checkpoint | Exact message | Files to stage after confirming paths |
| --- | --- | --- |
| TASK 6.1 | `feat(ex1): implement semantic DeveloperCard and SkillBadge` | Proposed `src/components/DeveloperCard.jsx`, `src/components/SkillBadge.jsx`; only actual host/sample-data changes needed to display the card and directly relevant tests if already supported. No CSS Module import until that module exists. |
| TASK 6.2 | `style(ex1): add responsive 375px CSS module` | Proposed `src/components/DeveloperCard.module.css`, including mobile defaults and subsequent laptop enhancements; component hunks adding module imports/classes and badge class wiring; minimal verified host responsive corrections if needed. Include related evidence/documentation updates only after explicit diff review. |

Keep both the mobile baseline and subsequent laptop enhancements in the second required commit. TASKS 4.1–4.3 are ordered work steps, not extra commits; the two required commit messages remain unchanged.

Use explicit file paths and `git add -p` for tracked files mixing relevant and unrelated changes. Inspect `git diff --cached` before each commit; avoid blanket `git add .`. Do not stage Lab 2 references, archives, dependencies, generated output, secrets, or unrelated work. Treat this WBS as planning documentation, not automatic content for either implementation commit. After each checkpoint, verify its tree is runnable; after the second, inspect both exact subjects and confirm all intended work is committed without requiring unrelated user changes to be removed.

## 10. Final Definition of Done

This checklist defines completion of the **future exercise implementation**, not a claim that implementation is complete today.

- [ ] Actual starter paths, React 19 setup, CSS Module support, commands, and Git root are confirmed.
- [ ] `DeveloperCard` and reusable `SkillBadge` implement the agreed profile contract using real React.
- [ ] DeveloperCard source and rendered card contain zero div tags; article naming, heading hierarchy, metrics, and skills are semantic.
- [ ] Metrics use `Object.entries(metrics).map(...)` with keyed Fragments; skill keys use stable unique IDs.
- [ ] Avatars are HTTPS-only with meaningful alt, explicit dimensions, and verified initials on failure.
- [ ] CSS is provided through `DeveloperCard.module.css`, scoped classes, and appropriate custom properties; no inline style objects remain.
- [ ] 375px measurements prove no horizontal document overflow; long-content and fallback checks remain readable.
- [ ] Mobile default CSS was implemented and verified before laptop enhancements; laptop/intermediate-width checks and the final return-to-375px regression are evidenced.
- [ ] Applicable contrast, accessibility-tree, safe-text, and Console checks have recorded results.
- [ ] Available configured build/lint/tests are run; absent or blocked checks and unresolved issues are clearly disclosed.
- [ ] Both required atomic commits exist with exact messages and focused staging, and the final diff is reviewed.
- [ ] Temporary fixtures/debug output are removed and no MiniReact runtime or unrelated features were introduced.

**Planning-deliverable boundary:** creating this document fulfills the current requested change. Future implementation remains gated on the missing Lab 3 starter; original slide visuals and Exercises 4.4/4.5 content remain unverified. Do not mark the implementation checkboxes complete based on this plan alone.
