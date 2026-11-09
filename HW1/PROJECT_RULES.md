# Project Rules

Read these rules before working on the project. Follow the user's request, the existing codebase, and the acceptance criteria. These rules incorporate the banned patterns and engineering standards from Lab 02 and Lab 03.

## 1. Core Engineering Principles

- Inspect relevant files and understand the existing implementation before changing it.
- Keep changes focused. Reuse existing patterns and tools; avoid unnecessary abstractions and dependencies.
- Treat AI-generated code as a draft, not verified production code. The developer is responsible for understanding and validating the result.
- Use semantic HTML for structure, CSS for presentation, and JavaScript/React for behavior and state.
- Prefer deterministic, testable behavior with explicit inputs, outputs, state transitions, and error handling.
- Do not claim a feature, test, audit, or deployment works unless it was actually verified.
- Ask the user before making decisions that significantly affect scope, architecture, behavior, data, or user experience.

## 2. Strictly Banned JavaScript and DOM Patterns

- **Do not use `var`.** Use `const` by default and `let` only when reassignment is required.
- **Do not create implicit globals.** Declare variables explicitly and keep state within the appropriate module, function, or component.
- **Do not use `keypress`, `event.keyCode`, or `event.which`.** Use `keydown`/`keyup` and `event.key` or `event.code`, choosing the one appropriate to the interaction.
- **Do not use inline HTML event attributes** such as `onclick="..."`. In vanilla JavaScript, use `addEventListener`; where the architecture calls for it, use event delegation. In React, use JSX event props such as `onClick`.
- **Do not insert untrusted or user-provided content with raw `innerHTML` or `outerHTML`.** Prefer `textContent`, `createTextNode`, DOM APIs, or normal React text interpolation. Never use `dangerouslySetInnerHTML` with untrusted content. If HTML rendering is an explicit requirement, use a reviewed sanitizer and test the security boundary.
- **Do not use outdated standalone Babel-in-browser setups for a modern app.** Follow the repository's supported build tool (for example, Vite or another configured bundler).
- Do not use `eval()` or construct executable code from user input.
- Do not use blocking `window.alert()` for application feedback. Render an accessible inline status/error message and provide a recovery action where appropriate.
- Do not interleave repeated DOM geometry reads and writes in a loop without need. Avoid layout thrashing; batch reads and writes and profile before optimizing.
- Do not silently swallow errors, return fake success, or log secrets and personal data.

## 3. React Rules (Apply When This Repository Uses React)

### Modern React entry points and components
- Use the project's installed React version and existing build setup. For React 18/19 apps, mount with `createRoot` from `react-dom/client`; **do not use `ReactDOM.render()`**.
- Prefer function components and Hooks for new React UI. **Do not introduce `class extends React.Component`** for new features or refactors unless the user explicitly requests a legacy-class exercise.
- Do not use `Component.defaultProps` on function components. Use ES parameter defaults, for example `function Button({ label = 'Save' })`.
- Follow the automatic JSX runtime and the repository's conventions. Do not add `import * as React from 'react'` solely to make JSX work in a modern configured project; import the specific APIs actually used.
- Give action buttons an explicit `type="button"` unless they are intended to submit a form.
- Use props for data flowing into components; do not mutate received props.

### State and rendering
- **Never mutate React state in place.** Do not use patterns such as `items.push(x); setItems(items)` or mutate an object and pass the same reference back. Use immutable updates (`map`, `filter`, spread, or other appropriate immutable transformations).
- Use stable, unique entity IDs as keys for dynamic lists. **Do not use array indexes or non-unique display values as keys** when entries can be inserted, removed, reordered, or duplicated. Do not generate a new key on every render.
- Avoid redundant state. Derive filtered, sorted, counted, and formatted values during render or in a suitable memoization step instead of mirroring them in state and synchronizing them with `useEffect`.
- Do not use mutating `sort()` directly on state/props arrays. Copy first or use `toSorted()` when supported by the project's target runtime.
- Keep Hooks at the top level of function components or custom Hooks. Do not call Hooks inside conditions, loops, or nested callbacks.
- Keep state transitions explicit. For multi-state asynchronous UI, prefer a clear state model (for example, `IDLE`, `LOADING`, `SUCCESS`, `EMPTY`, `ERROR`) rather than contradictory boolean combinations.

### Effects and asynchronous work
- Use `useEffect` to synchronize with external systems, not to calculate values that can be derived during render.
- Every effect that starts a timer, interval, event listener, subscription, network request, or other external resource must clean it up when dependencies change or the component unmounts.
- Keep effect dependency arrays honest. Do not use an empty dependency array to conceal dependencies or freeze stale values.
- Abort obsolete fetches with `AbortController` when appropriate. Do not present an intentional `AbortError` as a normal user-facing failure.
- Guard against stale responses and race conditions when users change the selected item or query while a request is in flight.
- Clean up Web Audio resources where applicable: stop/disconnect active nodes and release associated resources when no longer needed.
- Do not start timers or external side effects during component construction/render. Start them in an appropriate effect or explicit event handler and clean them up.
- Avoid redundant `useEffect` chains that trigger unnecessary extra renders.

### Accessibility and semantic markup
- Use semantic landmarks and elements such as `header`, `nav`, `main`, `section`, `article`, `footer`, `figure`, `output`, and description lists where they match the content.
- Avoid unnecessary wrapper elements and “div soup.” If the project specification requires zero `<div>` elements in a component, treat that as a strict acceptance criterion. Otherwise, use `<div>` only when no more meaningful element fits.
- Maintain a logical heading hierarchy. Do not use multiple `<h1>` elements merely to style key/value fields; use headings at the correct level and `<dl>`, `<dt>`, and `<dd>` for term/value metadata.
- Associate every form control with a visible `<label>` or an appropriate accessible name. In React, use `useId()` when a stable generated ID is needed to connect a label and control.
- All interactive functionality must be keyboard-accessible. Provide visible focus styles; do not remove focus outlines without a clear replacement.
- Use appropriate live regions such as `role="status"`, `aria-live`, or `role="alert"` for status and error feedback. Do not rely on color alone to convey meaning.
- Provide meaningful image alternative text when an image conveys content; use empty alt text for purely decorative images.
- Follow the project's accessibility target (including WCAG 2.2 AA where specified). Verify contrast and keyboard behavior rather than assuming compliance.

## 4. CSS, Layout, and Asset Rules

- Prefer scoped styles, CSS Modules, or the styling approach already established in the repository.
- Reuse design tokens and CSS custom properties where available; avoid scattering duplicate values without reason.
- Test responsive layouts at the required viewport sizes. Where the project requires it, verify 375px width and ensure there is no unintended horizontal overflow.
- Reserve image dimensions when possible to reduce layout shifts.
- Use HTTPS for remote assets and APIs. Do not introduce insecure `http://` image or API URLs into a deployed HTTPS application.
- Do not add a UI library stylesheet or dependency that is incompatible with the installed major version. Check the package version and existing setup first.
- Respect reduced-motion preferences when adding animations.
- Optimize only when measurements or profiling show a meaningful issue. Do not add memoization speculatively.

## 5. Security and Data Handling

- Treat user input, URL parameters, API responses, and external content as untrusted.
- Validate input at the appropriate boundary and provide clear messages for invalid values.
- Render user-provided text as text, not executable markup.
- Never commit secrets, API keys, credentials, private tokens, or personal information. Use the project's environment-variable conventions and keep secret files out of version control.
- Do not weaken authentication, authorization, validation, or security controls to make a test pass.
- Do not expose stack traces or internal implementation details to end users.
- Avoid logging sensitive data. Keep error logs useful but appropriately redacted.

## 6. Task Decomposition and AI Workflow

Do not ask an AI agent to implement an entire large feature in one unbounded prompt. Follow this workflow:

1. **Understand and slice:** Identify the goal, scope, acceptance criteria, dependencies, and edge cases. Break the work into small, independently verifiable tasks.
2. **Contract first:** Define relevant component props, data shapes, API inputs/outputs, state transitions, and invariants before implementation. Use TypeScript types or concise JSDoc where appropriate.
3. **Atomic implementation:** Implement one focused sub-task or functional slice at a time. Follow existing conventions and avoid unrelated refactors.
4. **Independent verification:** Run targeted tests, inspect the browser/DevTools where relevant, review accessibility and responsive behavior, and inspect the Git diff.
5. **Document and commit:** Update related documentation and tests. Use small, meaningful commits when asked to commit.

Before implementation, check whether `TASK_DECOMPOSITION.md` or an equivalent WBS exists. Update it when the task is large enough to require decomposition. Do not create duplicate planning files if the repository already has an established equivalent.

## 7. Testing and Verification

- Per the user's 2026-10-25 instruction, record only confirmed logic or behavior bugs caused by application code in `AI_FAILURE_AUDIT.md`, with the related prompt, failing code, reproduction evidence, cause, fix status, and retest results. Exclude environment, dependency installation, server startup, browser-tool, and verification-script issues. The audit requires at least three distinct evidenced bugs; never invent defects or count repeated symptoms as separate bugs. Record honestly when fewer have been found.

- Test through the real application entry point when feasible, not only by invoking an isolated helper.
- Cover normal behavior, invalid input, empty data, loading, success, failure, retry, and relevant edge cases.
- For async flows, test cancellation, stale responses, rapid repeated actions, and cleanup where applicable.
- For keyboard interactions, verify expected keys and ensure typing in inputs does not accidentally trigger global shortcuts.
- Inspect the rendered DOM and accessibility tree for semantic structure, accessible names, focus behavior, and keyboard navigation.
- Use the project's existing test runner, linter, type checker, and build scripts. Do not add tools without a clear need or approval.
- Report each check accurately as **passed**, **failed**, or **not run**. If a check cannot run, state why.
- Never claim a Lighthouse score, WCAG compliance, zero overflow, XSS resistance, or memory-leak prevention without evidence from the relevant check.

## 8. Git and Change Boundaries

- Do not change unrelated code or introduce dependencies without approval.
- Do not delete, overwrite, or move files or data outside the task's scope.
- Do not commit, push, deploy, or modify external services unless the user asks.
- When commits are requested, make them small and focused, with messages that describe the change (for example, `fix(ui): handle empty results state`).
- Review `git diff` and `git status` before finishing. Do not include secrets, generated clutter, or unrelated edits.
- Do not claim a commit, push, deployment, or external action succeeded unless its result was verified.

## 9. Required Workflow for Every Task

1. Understand the goal, scope, and acceptance criteria. Ask one focused question if a critical decision is ambiguous.
2. Inspect relevant source files, tests, documentation, package scripts, and current Git state.
3. Identify the smallest complete change and any integration points.
4. Implement the change using the project's established patterns and the rules above.
5. Test the behavior and relevant edge cases; inspect the real UI when applicable.
6. Review the final diff for omissions, regressions, security issues, and unrelated changes.
7. Summarize what changed and list the checks actually run, including failures and checks not run.

## 10. Building a Module or Feature

Before implementing a module, define:
- **Responsibility:** what the module owns and what it explicitly does not own.
- **Inputs and outputs:** props, function arguments, return values, events, API contracts, or persisted data.
- **State model:** valid states and allowed transitions, especially for asynchronous behavior.
- **Integration points:** where the module connects to the existing application.
- **Failure behavior:** invalid input, network errors, cancellation, empty data, and recovery.
- **Verification:** tests and real-entry-point checks that demonstrate the acceptance criteria.

Implement the complete user-facing flow, including loading, empty, success, and failure states where relevant. Keep the interface simple and avoid extra layers or configuration without a clear need.

## 11. Final Response Format

When finishing a task, report:
- **Changed:** the files and behavior changed.
- **Verified:** the exact tests, commands, or manual checks actually completed.
- **Not verified:** relevant checks that could not be run, and why.
- **Risks or follow-ups:** only if there are real outstanding issues.

Do not claim work is complete when important acceptance criteria remain unverified.
