import { afterEach, beforeEach, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'

const dashboardCss = readFileSync('src/index.css', 'utf8')
const telemetryCss = readFileSync('src/styles/telemetry.css', 'utf8')

let style
beforeEach(() => {
  style = document.createElement('style')
  style.textContent = `${dashboardCss}\n${telemetryCss}`
  document.head.append(style)
})
afterEach(() => style.remove())

// Inspect parsed declarations, not jsdom geometry: jsdom has no layout engine.
function declaration(selector, property, media) {
  const rules = [...style.sheet.cssRules].flatMap((rule) => {
    if (media) return rule.conditionText === media ? [...rule.cssRules] : []
    return rule.selectorText ? [rule] : []
  })
  return rules.filter((rule) => rule.selectorText?.split(',').map((part) => part.trim()).includes(selector))
    .map((rule) => rule.style.getPropertyValue(property)).filter(Boolean).at(-1)
}

test('skeleton reserves a 220px border-box footprint and panel retains its minimum', () => {
  expect(declaration('.telemetry-skeleton', 'height')).toBe('220px')
  expect(declaration('.telemetry-skeleton', 'min-height')).toBe('220px')
  expect(declaration('.telemetry-skeleton', 'box-sizing')).toBe('border-box')
  expect(declaration('.telemetry-skeleton', 'max-width')).toBe('100%')
  expect(declaration('.telemetry-panel', 'min-height')).toBe('220px')
})

test('reduced motion disables decorative pulse and button transitions', () => {
  expect(declaration('.telemetry-skeleton__visual', 'animation')).toContain('telemetry-blue-zone-pulse')
  expect(declaration('.telemetry-skeleton__visual', 'animation', '(prefers-reduced-motion: reduce)')).toBe('none')
  expect(declaration('.squad-buttons button', 'transition', '(prefers-reduced-motion: reduce)')).toBe('none')
})

test('phone defaults progressively enhance at tablet and laptop breakpoints', () => {
  expect(declaration('.squad-buttons', 'display')).toBe('grid')
  expect(declaration('.squad-buttons', 'grid-template-columns')).toBeUndefined()
  expect(declaration('.telemetry-card dl', 'grid-template-columns')).toBe('repeat(2, minmax(0, 1fr))')
  expect(declaration('.squad-buttons', 'grid-template-columns', '(min-width: 768px)')).toBe('repeat(3, minmax(0, 1fr))')
  expect(declaration('.telemetry-card dl', 'grid-template-columns', '(min-width: 768px)')).toBe('repeat(3, minmax(0, 1fr))')
  expect(declaration('.dashboard-header', 'grid-template-columns', '(min-width: 1024px)')).toBe('minmax(0, 1.65fr) minmax(0, 1fr)')
  expect(`${dashboardCss}\n${telemetryCss}`).not.toMatch(/overflow(?:-x)?\s*:\s*(?:hidden|clip)/)
})

test('selection and keyboard focus have explicit styles and controls reserve usable heights', () => {
  expect(declaration(".squad-buttons button[aria-pressed='true']", 'background')).toBe('var(--selected)')
  for (const selector of ['.squad-buttons button', '.telemetry-error button']) {
    expect(parseFloat(declaration(selector, 'min-height'))).toBeGreaterThanOrEqual(44)
    expect(declaration(`${selector}:focus-visible`, 'outline')).toBe('3px solid var(--focus)')
    expect(declaration(`${selector}:focus-visible`, 'outline-offset')).toBe('4px')
  }
})
