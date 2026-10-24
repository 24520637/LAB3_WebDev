# Lab 3 — Exercise 1: Semantic Engineer & Pro-Gamer Profile Card

## 1. Project Objective

Build a React 19 developer/pro-gamer profile card using semantic HTML, reusable skill badges, scoped CSS, a safe avatar fallback, and mobile-first layout. Integrate the existing P1/P2 implementation into a runnable application.

**Current state:** P1 and P2 are implemented and already committed. The application shell, dependency manifest/lockfile, and Vite configuration were added during integration because no runnable React starter existed. The QA audit on 2026-10-25 confirmed the normal app, production preview, real image-error fallback, long-content wrapping, empty collections, URL rejection, and multiple-card IDs. No assignment-scope code defect was found, so production source was not rewritten. This document distinguishes completed checks from remaining work; unchecked boxes are pending.

## 2. Exercise Scope and Constraints

### Verified project context

All relative paths below are rooted at `C:/Users/buing/OneDrive/Documents/WebDev/LAB3_WebDev/Exercises`.

| Item | Current finding |
| --- | --- |
| Rules | `PROJECT_RULES.md` is the actual rules file. No applicable `AGENTS.md` was found in the inspected ancestors or source directories. No project README was present. |
| Git | Repository root: `C:/Users/buing/OneDrive/Documents/WebDev/LAB3_WebDev`. Git is already initialized; do not initialize it again. |
| P1 | `src/components/DeveloperCard.jsx`, `src/components/SkillBadge.jsx`, and `src/assets/huong-avatar.png` exist. |
| P2 | `src/components/DeveloperCard.module.css` exists and is imported by DeveloperCard. SkillBadge receives its module class through its existing `className` prop. |
| Integration | `index.html` → `src/main.jsx` → `src/App.jsx` → DeveloperCard. No duplicate `src/index.jsx`, alternate entry point, or router was added. |
| Dependencies | `package.json` and `package-lock.json` pin React/React DOM 19.3.1, Vite 8.3.5, and @vitejs/plugin-react 6.1.2. These are local project dependencies, not reliance on the unrelated ancestor package. |
| Tooling | `vite.config.js` enables the React plugin and relative production asset paths. Node v26.8.2 and npm 11.19.1 were used. No project test/lint scripts or test framework are configured. |
| Earlier missing-starter finding | Accurate at planning/P1/P2 time, but resolved by the current integration. The absence of a starter was explained before adding minimal setup. |
| Lab 2 | Inspected `../LAB2_Exercises/js/mini-react.js`, `js/app.js`, `index.html`, `js/test-runner.js`, its rules/WBS, and relevant tests. Also inspected `C:/Users/buing/OneDrive/Documents/WebDev/LAB2_WebDev/LAB2_EXERCISES.zip`. Its MiniReact/Todo code remains unchanged. |
| Assignment materials | The user's supplied Exercise 1 requirements are available. Original slide visuals and Lab 2 Exercises 4.4/4.5 card source were not found in the inspected material; exact slide appearance remains unverified. |

### Requirements and agreed decisions

- Use real React function components, JSX, and `createRoot`; never transplant MiniReact's runtime.
- DeveloperCard contains zero JSX `div` elements. The HTML host's `div#root` is outside DeveloperCard and is permitted.
- Preserve `article`, `header`, `h2`, `dl`/`dt`/`dd`, and `ul`/`li`. Associate the article with the unique heading ID from React `useId`.
- Map `Object.entries(metrics)` to keyed Fragments, and skills to list items keyed by `skill.id`.
- Retain the user's name, **Huong Bui Nguyen Quynh**, and uploaded portrait. The user explicitly confirmed keeping the local photo. Do not replace it with a generated avatar or upload it to obtain an HTTPS URL.
- The bundled local portrait is the agreed exception to a literal remote HTTPS-avatar requirement. Any remote `avatarUrl` override must still parse as HTTPS; malformed or insecure overrides select initials. Local development uses HTTP loopback; this is not an insecure external avatar URL.
- Keep meaningful image alt text and explicit 96×128 attributes, matching the portrait's 3:4 aspect ratio. Preserve React-driven initials fallback without retry loops.
- CSS Modules own presentation; no inline style objects or global styling framework. Default rules are mobile-first; `min-width: 40rem` enhances the same DOM for wider screens.
- No forms, editing, filtering, fetching, persistence, animation, extra game functionality, or unrelated dependencies.

### Actual data contract

`src/App.jsx` owns a static `profile` object and passes it through `<DeveloperCard {...profile} />`.

| Prop | Actual value/shape |
| --- | --- |
| `name` | `Huong Bui Nguyen Quynh` |
| `role` | `Frontend Developer & Pro-Gamer` |
| `avatarUrl` | Imported `src/assets/huong-avatar.png`; remote alternatives must use HTTPS |
| `metrics` | Object: Projects = 12; Years of experience = 2; Matches won = 128 |
| `skills` | Array of unique `{ id, label }` entries for React 19, JavaScript, CSS, Valorant |
| SkillBadge props | `label` plus optional `className`; parent owns the `li` and key |

Role, metrics, and skills are user-authorized sample data, not factual biography or additional slide requirements. Props are read-only. Initials are derived from the first two name words; the current name gives HB. A blank name uses Developer/D. Empty collections render without invented content, and metric zero remains visible. Avatar failure is the only stateful behavior; no effect is needed.

## 3. Lab 2 → Lab 3 Knowledge Mapping

| Lab 2 concept | Classification | Actual transfer |
| --- | --- | --- |
| `createTextElement`, `createElement`, nested `props.children` | Conceptual only | JSX expresses the element/children tree; React creates its elements. No MiniReact VNodes are copied. |
| Recursive `renderToDOM`, class and ARIA attributes | Semantics directly used; renderer conceptual only | Preserve semantic structure and accessible naming. React owns mounting and updates. |
| `stateStore`, resetting `cursor`, setter closures | Conceptual only | Understand Hook ordering; actual React `useState` handles avatar failure. No custom state engine. |
| `app.js` spread/map updates | Immutable-data principle directly used; Todo editing not required | Profile inputs are read-only. There is no profile-editing state. |
| Derived `visibleTasks`, entity-ID lists | Directly used | Derive initials during render; map metrics/skills with stable keys. No redundant `useEffect` state. |
| Root event delegation | Conceptual only | React's `onError` handles image failure. No handler registry, root listener setup, or MiniReact event IDs. |
| Safe text rendering and accessibility | Directly used | JSX text interpolation, URL validation, semantic lists, meaningful alt, and named article. |
| Todo forms, filters, async feed/retry | Not required | Leave the existing Lab 2 functionality untouched; it is outside this static-card exercise. |
| Lab 2 tests | Verification lessons only | They do not establish correctness of the React card. Do not migrate MiniReact tests as application dependencies. |

## 4. Work Breakdown Structure (WBS)

Each task retains its objective, actual files, small steps, acceptance criteria, verification method, and dependencies. Checkmarks refer only to evidence described here or in section 7.

### EPIC 1: Establish actual architecture and data contract

#### TASK 1.1 — Resolve tooling and entry points

**Objective:** Make the existing components runnable without duplicate setup.
**Files:** `package.json`, `package-lock.json`, `vite.config.js`, `index.html`, `src/main.jsx`, this WBS.
**Steps:** Inspect existing files/Git first; explain missing setup; add only React/React DOM plus Vite/React plugin; configure scripts and one entry point.

**Acceptance criteria:**
- [x] Actual project paths, React 19 versions, CSS Module support, and Git root are recorded.
- [x] Scripts come from the real manifest; absent test/lint scripts are disclosed.
- [x] Original slide/source gaps remain explicit.

**Verification:** filesystem inspection, `npm ls --depth=0`, `npm run`, production build. **Dependencies:** none.

#### TASK 1.2 — Define profile inputs

**Objective:** Use compatible inputs and distinguish sample data from assignment facts.
**Files:** `src/App.jsx`, both component files, portrait asset.
**Steps:** Inspect existing props; use the contract in section 2; preserve IDs, read-only inputs, name, and chosen photo.

**Acceptance criteria:**
- [x] App supplies `name`, `role`, `avatarUrl`, metrics object, and skill-ID array.
- [x] Heading IDs and initials ownership are clear.
- [x] Fictional sample fields are explicitly identified.

**Verification:** source inspection and live rendered content. **Dependencies:** TASK 1.1.

### EPIC 2: Reusable SkillBadge

#### TASK 2.1 — Preserve focused skill presentation

**Objective:** Display one skill without introducing interaction.
**Files:** `src/components/SkillBadge.jsx`; DeveloperCard's list composition.
**Steps:** Reuse the existing function component; interpolate the label; pass the CSS Module class from its parent.

**Acceptance criteria:**
- [x] The same component renders all skill labels.
- [x] Badge is phrasing content inside a parent-owned `li`, without a button role or tab stop.
- [x] Existing `className` supports scoped styling.

**Verification:** source review, prior isolated React checks, live Skills list. **Dependencies:** TASK 1.2.

### EPIC 3: Semantic DeveloperCard and real-app integration

#### TASK 3.1 — Preserve named article and metrics

**Objective:** Maintain meaningful structure with no div wrappers.
**Files:** `src/components/DeveloperCard.jsx`.
**Steps:** Keep article/header/h2; connect `aria-labelledby` with `useId`; map metric entries to keyed Fragment term/value pairs.

**Acceptance criteria:**
- [x] DeveloperCard source and rendered card contain zero div elements.
- [x] Article references its visible heading ID.
- [x] Metrics use `Object.entries(metrics).map(...)` and stable property-name Fragment keys.
- [x] Prior isolated checks cover zero-valued metrics and distinct IDs for multiple cards.

**Verification:** source inspection, live DOM/accessibility tree, earlier isolated React checks. **Dependencies:** TASK 1.2.

#### TASK 3.2 — Preserve skills composition

**Objective:** Render reusable badges with stable identity.
**Files:** both component files.
**Steps:** Map the skills array; put `skill.id` on each mapped `li`; render SkillBadge inside.

**Acceptance criteria:**
- [x] Live structure is `ul` → `li` → badge.
- [x] Keys use stable skill IDs, not indexes or random values.
- [x] Earlier isolated checks cover duplicate labels, reorder, and empty arrays; live page has no key warning.

**Verification:** source, prior isolated tests, live browser console. **Dependencies:** TASK 2.1 and TASK 3.1.

#### TASK 3.3 — Preserve avatar safety and initials

**Objective:** Show the selected portrait and recover from load failure.
**Files:** DeveloperCard and `src/assets/huong-avatar.png`.
**Steps:** Keep the trusted imported photo; enforce HTTPS for remote overrides; keep alt/dimensions and the existing state-driven error replacement.

**Acceptance criteria:**
- [x] User-selected local photo loads in the actual app.
- [x] Meaningful alt and explicit 96×128 dimensions are present.
- [x] Earlier isolated React checks verify image-error → HB and no same-source error loop.
- [x] Earlier checks reject missing/malformed/insecure remote sources.
- [x] Force an actual local image response to HTTP 404 in the browser fixture: img is replaced by HB, accessible label remains, and fallback measures 96×128.

**Verification:** normal app image loaded/naturalWidth check; real-source browser fixture with intentional 404; two failed image requests across two separate fixture navigations, with no repeated error loop; HTTP and malformed override fixtures render initials without an img. **Dependencies:** TASK 3.2.

#### TASK 3.4 — Integrate App and mount it

**Objective:** Display the completed card through the actual application.
**Files:** `index.html`, `src/main.jsx`, `src/App.jsx`, `vite.config.js`, manifest/lockfile.
**Steps:** Add the missing single HTML host; mount App using `createRoot` and StrictMode; pass the existing sample contract; start the server and inspect the rendered page.

**Acceptance criteria:**
- [x] One entry-point chain renders App and DeveloperCard; no alternate entry or routing layer.
- [x] App uses a semantic main and h1; DeveloperCard keeps its h2.
- [x] JSX, CSS Modules, and imported portrait work through Vite.
- [x] Production build succeeds and the live browser shows the intended profile.

**Verification:** `npm run build`, `npm run dev`, actual page/AX/DOM inspection. **Dependencies:** TASK 1.1, TASK 3.3, and existing P2 styling.

### EPIC 4: Mobile-first scoped styling

#### TASK 4.1 — Keep the mobile baseline

**Objective:** Make default CSS support the narrow layout.
**Files:** DeveloperCard and `DeveloperCard.module.css`.
**Steps:** Reuse scoped classes/tokens; stack the header/metrics by default; wrap badges and long strings; keep fluid widths and border-box sizing.

**Acceptance criteria:**
- [x] Default rules provide the mobile layout without a media query.
- [x] Card/badge styles come through the CSS Module, without inline style objects.
- [x] Portrait is proportional; fallback has the same 3:4 intended footprint.

**Verification:** source, real build, live styles at 375px. **Dependencies:** TASK 3.1–3.3.

#### TASK 4.2 — Verify mobile overflow

**Objective:** Check the actual document at 375px.
**Files:** CSS Module; application host only if a measured issue needs correction.
**Steps:** Use a 375×812 viewport; inspect the entire document and image; compare scroll/client widths; avoid hiding overflow.

**Acceptance criteria:**
- [x] Normal integrated profile has scrollWidth = clientWidth = 375.
- [x] Profile, metrics, image, and skills are visible with wrapping and no clipped normal content.
- [x] Repeat in-browser with a 285-character name, 360-character skill labels, a 300-character metric value, zero metric, and forced avatar failure. No horizontal overflow at a 375px viewport.

**Verification:** browser viewport override, DOM geometry, mobile screenshot. **Dependencies:** TASK 3.4 and TASK 4.1.

#### TASK 4.3 — Verify laptop and mobile regression

**Objective:** Enhance width without changing DOM or breaking mobile.
**Files:** CSS Module.
**Steps:** Keep the `min-width: 40rem` enhancement; check both sides of the breakpoint and laptop width; return to 375px.

**Acceptance criteria:**
- [x] Header/metrics change to the intended columns at wider sizes.
- [x] No normal-profile overflow at 639, 640, 768, or 1366px.
- [x] Final return to 375px still has equal scroll/client widths.

**Verification:** actual browser measurements in section 7. **Dependencies:** TASK 4.2's normal-profile check.
**History note:** mobile CSS was authored and source-checked before laptop rules. Real-browser verification became possible only after integration; do not claim that browser testing happened before P2 implementation.

### EPIC 5: Accessibility, security, and quality verification

#### TASK 5.1 — Audit relevant card behavior

**Objective:** Verify safe text, semantics, accessible names, and contrast.
**Files:** App, component files, CSS Module, portrait.
**Steps:** Inspect AX/DOM and Console; use prior isolated negative cases; measure text colors; check applicable browser behaviors without inventing interactions.

**Acceptance criteria:**
- [x] Live heading, named card, image, description list, and skills list are understandable.
- [x] Earlier isolated checks verify HTML-like text stays text.
- [x] Actual computed production-preview colors meet text contrast thresholds: 17.85:1 heading, 7.58:1 role text, 7.15:1 badge text/background.
- [x] The static card introduces no interactive elements or tabindex stops; standalone SkillBadge also remains non-interactive.
- [ ] Complete browser zoom and any broader assistive-technology/WCAG review; no blanket WCAG compliance claim.

**Verification:** live AX/DOM, safe-text browser fixture, computed-color contrast calculations, and focusable-element inspection. Remaining zoom/full-accessibility audit is pending. **Dependencies:** TASK 4.3.

#### TASK 5.2 — Run actual configured checks

**Objective:** Record reproducible results without inventing test scripts.
**Files:** manifest/lockfile, app/configuration, WBS.
**Steps:** Run available scripts; review browser Console and Git diff; record missing tooling.

**Acceptance criteria:**
- [x] `npm run build` passes with bundled HTML/JS/CSS/portrait.
- [x] `npm run dev` starts the real app at the configured URL.
- [x] `npm ls --depth=0` resolves expected project dependencies.
- [x] Browser warning/error log is empty during ordinary rendering/resizing.
- [x] No test/lint script exists; these checks are explicitly not run.
- [x] `npm run preview` serves the production build at port 4173; the card and hashed portrait load, CSS Modules apply, and document widths are both 375.

**Verification:** section 7 command/browser results. **Dependencies:** TASK 3.4.

### EPIC 6: Commit review and final audit

#### TASK 6.1 — Verify existing P1 checkpoint

**Objective:** Preserve and inspect the required semantic commit.
**Files:** existing P1 component/asset changes.
**Steps:** Inspect existing history; do not duplicate, amend, or recreate the commit.

**Acceptance criteria:**
- [x] Existing `d21a7ac` has exact message `feat(ex1): implement semantic DeveloperCard and SkillBadge`.
- [x] Current work reuses its components and user-selected photo.

**Verification:** `git log` and source inspection. **Dependencies:** existing P1.
**Historical limitation:** the app shell was absent at that checkpoint; runnable integration was added later.

#### TASK 6.2 — Verify P2 and review integration separately

**Objective:** Preserve P2 history and prepare an accurate review of new setup.
**Files:** integration/configuration files and WBS only.
**Steps:** Confirm the existing P2 subject; inspect only the new integration diff; leave staging/committing to the user.

**Acceptance criteria:**
- [x] Existing `2350c9a` has exact message `style(ex1): add responsive 375px CSS module`.
- [x] Integration reuses P1/P2 without rewriting those component/style files.
- [ ] User reviews and, if desired, stages the integration files listed in section 9.

**Verification:** Git history/status/diff. **Dependencies:** TASK 5.2.

## 5. Task Dependencies and Suggested Implementation Order

Original feature sequence: contract → semantic components → avatar/keys → mobile CSS → laptop enhancement → quality checks.

Actual integration continuation: inspect committed P1/P2 → resolve missing setup in TASK 1.1 → TASK 3.4 → live TASKS 4.2/4.3 → TASK 5.2 → remaining accessibility/edge-case checks.

Both layout modes use the same card and semantic DOM. Do not rewrite historical commits to make the original plan appear fully verified earlier than it was.

## 6. Acceptance Criteria for Every Task

Every task above contains its acceptance gate. Image failure, long-content fixtures, computed-color contrast, static-card focus inspection, and production preview have now been verified. Browser zoom, a full WCAG/assistive-technology audit, and user review/staging remain pending. No external HTTPS avatar was fetched: the user chose a local portrait; remote HTTPS enforcement is supported by source review and rejection fixtures rather than a claim of verified external hosting.

Do not add tests or a lint framework solely to turn an unavailable command into a passing result.

## 7. Testing and Verification Plan

### Commands actually executed during integration

| Command | Result |
| --- | --- |
| `node --version`, `npm --version` | v26.8.2 / 11.19.1 |
| `npm install --save-exact react@19 react-dom@19` | Initial sandbox cache-permission error; approved retry succeeded |
| `npm install --save-dev --save-exact vite @vitejs/plugin-react` | Succeeded; install reported 0 vulnerabilities |
| `npm ls --depth=0` | React/React DOM 19.3.1, Vite 8.3.5, React plugin 6.1.2 |
| `npm run` | Lists only dev, build, preview |
| `npm run build` | Passed; output under ignored `dist/` includes HTML, JS, CSS and portrait |
| `npm run dev` | Passed; loopback server started at `http://127.0.0.1:5173/` |
| `git status --short`, `git log`, `git diff --check` | Used for actual repository/history/change review |

### Actual live-browser evidence

Page: `http://127.0.0.1:5173/`, ChatGPT in-app browser. The page exposes the h1, named profile card/h2, meaningful avatar, metrics, and Skills list. The image is loaded at 96×128. Card descendant div count is 0; heading ID matches article naming. Console warning/error capture returned an empty list.

| Viewport width | document scrollWidth | document clientWidth | Overflow check |
| --- | --- | --- | --- |
| 375 | 375 | 375 | true |
| 639 | 639 | 639 | true |
| 640 | 640 | 640 | true |
| 768 | 768 | 768 | true |
| 1366 | 1366 | 1366 | true |
| Return to 375 | 375 | 375 | true |

Check expression: `document.documentElement.scrollWidth <= document.documentElement.clientWidth`. The mobile check used height 812; laptop used height 900. Viewport overrides were reset after verification.

Mobile screenshot: `C:/Users/buing/.codex/visualizations/2026/10/24/01a16e86-bada-7050-9034-5fdf33b88a92/developer-profile-375.png` (outside the Git source tree).

Earlier isolated React/jsdom verification covered unique IDs, zero/empty metrics, immutable arrays, duplicate labels with distinct IDs, reordered skills, safe text, URL rejection, and image-error fallback. Those are historical isolated results, not newly executed project test scripts.

**Still not verified:** project test/lint commands (none configured), browser zoom, complete WCAG/assistive-technology audit, and an actual external HTTPS avatar request. No claim of full compliance or all-edge-case completion.

### QA audit — 2026-10-25

Production components, CSS, entry points, dependencies, and the selected photo were preserved. The audit used the real app on port 5173 and the production preview on port 4173. Additional browser fixtures were served by an in-memory Vite plugin on port 5174, importing the actual DeveloperCard, SkillBadge, CSS Module, and portrait. The temporary harness lived outside the repository and is removed after testing; no test pages, routes, dependencies, or fixture data were added to the product.

| Requested check | Status | Evidence |
| --- | --- | --- |
| 1. Zero div tags | PASS | Source regex matches no opening/closing div tags; normal and production-preview article descendant div count is 0. |
| 2. Semantics and naming | PASS | h1 → h2 hierarchy; article/header, alternating dt/dd children, ul/li; article heading reference matches h2 ID. Two-card fixture has distinct `_r_0_` and `_r_1_` IDs with correct references. |
| 3. Data rendering and keys | PASS | Source uses Object.entries(metrics).map, Fragment key=label, and li key=skill.id. Normal values, numeric zero, duplicate-label/distinct-ID skills, and empty arrays render without React key warnings. |
| 4. Avatar | PASS under agreed local-photo exception | Local image loads with meaningful alt and 96×128 dimensions. Intentional network 404 produces HB at 96×128 without a retry loop. HTTP/malformed remote overrides produce no img. No external HTTPS hosting/request is claimed. |
| 5. Reusable badge and CSS Modules | PASS | Separate badge rendered independently with the supplied className; card badges receive generated module classes and computed styles. Module custom properties are intentionally supplied by the card context. No inline presentation styles. |
| 6. 375px overflow | PASS | Normal dev app and production preview: scrollWidth=clientWidth=375. Failed-image and empty-data fixtures: 375=375. Long-content fixture: 360=360 at innerWidth 375; the 15px difference is a vertical scrollbar, not horizontal overflow. |
| 7. Build/run | PASS | npm run build succeeds; existing dev server responds HTTP 200; npm run preview starts and the production page renders with loaded hashed assets. |
| 8. Change boundaries | PASS | No production file changed during QA; no extra product requirement or dependency added. Existing integration files remain untracked; pre-existing ../Exercises.zip is untouched. Only this WBS is edited by the audit. |

Commands/checks actually executed in this audit:

- `npm run build` — PASS, Vite 8.3.5, 19 modules transformed.
- `npm run` and `npm ls --depth=0` — PASS; configured scripts/versions unchanged; no test/lint script exists.
- `curl.exe -I http://127.0.0.1:5173/` — PASS, HTTP 200 from the existing dev process; a duplicate dev server was not started.
- `npm run preview` — PASS at `http://127.0.0.1:4173/`; live DOM/AX, image loading, CSS, computed contrast, and 375px layout checked.
- Temporary harness: `node C:/Users/buing/.codex/visualizations/2026/10/24/01a16e86-bada-7050-9034-5fdf33b88a92/qa-audit.mjs` — real-source browser fixtures for image failure, long/safe text, empty data, HTTP/malformed URLs, and multiple cards/standalone badge.
- `curl.exe -s http://127.0.0.1:5174/__qa_stats.json` — two intentional image failures for two failure-page navigations; counter remains 2 after other fixture checks, demonstrating no repeated request loop.
- In-memory Node assertions — PASS for div/key/URL-guard/className invariants; SHA-256 baseline confirms every reviewed production/configuration/asset file is unchanged.
- `git status --short`, diff inspection, and `git diff --check` — audit change-boundary/whitespace review. No staging or commit performed.

Normal browser warning/error captures returned no messages. Intentional 404 responses are expected test network failures and are not application regressions. Long fixture contains an HTML-like skill string; it stays text and creates no injected img/script element.

Fallback screenshot (outside Git): `C:/Users/buing/.codex/visualizations/2026/10/24/01a16e86-bada-7050-9034-5fdf33b88a92/qa-avatar-fallback-375.png`. Browser viewport overrides are reset after testing. Temporary QA and preview servers are stopped; the original dev server is retained.

### Repeatable checks

- Inspect `src/components/DeveloperCard.jsx` for zero opening/closing div tags; missing files or search errors do not prove compliance.
- Review full metric/skill map callbacks, not just key search matches.
- Follow actual avatar source to the trusted local import or HTTPS remote override; unrelated HTTP text and loopback URLs are not external-avatar violations.
- Inspect CSS Module imports/classes, rendered DOM, and computed responsive rules.
- Recheck normal and edge fixtures at 375px after future desktop changes; never hide page overflow to pass the measurement.

## 8. Browser/DevTools Evidence Checklist

- [x] Normal profile visible through the real entry point.
- [x] Article naming matches its h2; no div descendants.
- [x] AX view exposes profile heading, image, metrics, and Skills list.
- [x] Uploaded image loaded with meaningful alt and explicit dimensions.
- [x] 375px normal-profile screenshot and equal document widths.
- [x] Breakpoint/laptop checks and final 375px regression.
- [x] CSS Module is loaded; no inline presentation styling.
- [x] No browser warning/error messages during normal rendering/resizing.
- [x] Forced image error and long-content browser fixtures at an actual 375px viewport.
- [x] Empty data, zero metrics, safe text, duplicate labels, URL rejection, distinct card IDs, and standalone badge fixtures.
- [x] Production preview, computed text contrast, and absence of static-card focus stops.
- [ ] Browser zoom and remaining full accessibility/assistive-technology checks.

## 9. Git Commit Plan

The two required commits already exist, in order:

1. `d21a7ac` — `feat(ex1): implement semantic DeveloperCard and SkillBadge`
2. `2350c9a` — `style(ex1): add responsive 375px CSS module`

No new commit, push, staging, history rewrite, or repository initialization is part of this integration.

Exact integration files to review before any future explicit staging:

- `index.html`
- `package.json`
- `package-lock.json`
- `vite.config.js`
- `src/main.jsx`
- `src/App.jsx`
- `TASK_DECOMPOSITION.md`

Existing P1/P2 source files and the portrait are reused, not restaged as new integration work. Do not stage `node_modules/`, `dist/`, Lab 2 references, or unrelated user edits. Inspect the staged diff if the user later chooses to stage; do not use blanket `git add .`.

QA boundary: the audit modifies only `TASK_DECOMPOSITION.md`. The existing untracked integration files and the user-created `../Exercises.zip` are left in their original state; they are not QA changes or automatically staged deliverables.

## 10. Final Definition of Done

- [x] Local React 19 manifest/lockfile, single entry point, and CSS Module-capable configuration exist.
- [x] App supplies the actual prop contract and preserves the user's chosen photo.
- [x] Semantic structure, article naming, metric/skill keys, zero div tags, and scoped styling remain intact.
- [x] Production build passes; real dev application displays the profile.
- [x] Normal profile has no horizontal overflow across tested mobile/breakpoint/laptop widths; long-content/fallback/empty fixtures also fit at 375px.
- [x] Real image-error fallback, production preview, computed text contrast, and multiple-card naming are verified in a browser.
- [x] Existing P1/P2 commit messages are verified; current integration is uncommitted.
- [ ] Finish browser zoom and the remaining full accessibility/assistive-technology review before claiming comprehensive WCAG compliance. No confirmed assignment-scope code defect remains from this audit.

**How to run:** from the Exercises directory, use `npm ci` on a fresh checkout, then `npm run dev`; open `http://127.0.0.1:5173/`. Use `npm run build` for production output and `npm run preview` to serve that output at `http://127.0.0.1:4173/` (preview was executed and verified during QA).
