import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import App from './App.jsx'
import TelemetryCard from './components/TelemetryCard.jsx'
import { getSquadTelemetry } from './data/pubg-vn-telemetry-spec.js'
import { fetchKraftonPubgTelemetry } from './services/fetchKraftonPubgTelemetry.js'

vi.mock('./services/fetchKraftonPubgTelemetry.js', () => ({ fetchKraftonPubgTelemetry: vi.fn() }))

let requests
beforeEach(() => {
  requests = []
  vi.mocked(fetchKraftonPubgTelemetry).mockImplementation((id, { signal }) => new Promise((resolve, reject) => {
    requests.push({ id, signal, resolve, reject })
  }))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

test('dashboard has a heading, simulation notice, and three usable buttons while loading', () => {
  render(<App />)
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('PUBG Vietnam Series — Live Telemetry')
  expect(screen.getByText(/Simulated match data/)).toBeVisible()
  expect(screen.getByRole('group', { name: 'Select a squad' })).toBeVisible()
  const buttons = screen.getAllByRole('button')
  expect(buttons).toHaveLength(3)
  for (const button of buttons) {
    expect(button).toBeEnabled()
    expect(button).toHaveAttribute('type', 'button')
  }
  expect(screen.getByRole('button', { name: /TE — The Expendables/ })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByText('Selected')).toBeVisible()
  expect(screen.getByRole('status')).toHaveTextContent('LOADING')
})

test('Tab, Enter, and Space select squads without disabling controls during loading', async () => {
  const user = userEvent.setup()
  render(<App />)
  await user.tab()
  const ces = screen.getByRole('button', { name: /CES — Cerberus/ })
  expect(ces).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(ces).toHaveAttribute('aria-pressed', 'true')
  await user.tab()
  await user.keyboard(' ')
  expect(screen.getByRole('button', { name: /TE — The Expendables/ })).toHaveAttribute('aria-pressed', 'true')
  await user.tab()
  const ge = screen.getByRole('button', { name: /GE — Genius/ })
  expect(ge).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(ge).toHaveAttribute('aria-pressed', 'true')
  expect(ces).toHaveAttribute('aria-pressed', 'false')
  expect(requests.map(({ id }) => id)).toEqual(['te', 'ces', 'te', 'ge'])
  await act(async () => requests.at(-1).resolve(getSquadTelemetry('ge')))
  expect(screen.getByRole('article', { name: 'Genius Esports telemetry' })).toBeVisible()
  expect(ge).toHaveFocus()
})

test.each([
  ['ces', /CES — Cerberus/, ['Erangel', 'Phase 6', '4', '14', '68%', 'In Safe Zone']],
  ['te', /TE — The Expendables/, ['Miramar', 'Phase 7', '4', '18', '82%', 'Holding High Ground']],
  ['ge', /GE — Genius/, ['Taego', 'Phase 5', '3', '9', '41%', 'Rotating Blue Zone']],
])('clicking %s renders all six exact labeled metrics', async (id, name, values) => {
  const user = userEvent.setup()
  render(<App />)
  await user.click(screen.getByRole('button', { name }))
  await act(async () => requests.at(-1).resolve(getSquadTelemetry(id)))
  const card = screen.getByRole('article')
  expect(within(card).getByRole('heading', { level: 2 })).toHaveTextContent(getSquadTelemetry(id).name)
  expect([...card.querySelectorAll('dt')].map((term) => term.textContent)).toEqual([
    'Map', 'Phase', 'Alive players', 'Kills', 'WWCD probability', 'Squad status',
  ])
  expect([...card.querySelectorAll('dd')].map((value) => value.textContent)).toEqual(values)
  for (const term of card.querySelectorAll('dt')) {
    expect(term.nextElementSibling.tagName).toBe('DD')
    expect(term.parentElement.querySelectorAll('dt')).toHaveLength(1)
  }
})

test('heading and exactly one visible selection survive loading, failure, retry and success', async () => {
  render(<App />)
  const assertShell = () => {
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const selected = screen.getByRole('button', { pressed: true })
    expect(selected).toHaveAccessibleName('GE — Genius Esports Selected')
    expect(within(selected).getByText('Selected')).toBeVisible()
    expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(2)
    expect(screen.getAllByText('Selected')).toHaveLength(1)
  }
  fireEvent.click(screen.getByRole('button', { name: /GE — Genius/ }))
  assertShell()
  await act(async () => requests.at(-1).reject(new Error('Satellite packet timeout')))
  assertShell()
  fireEvent.click(screen.getByRole('button', { name: 'Reconnect Satellite' }))
  assertShell()
  await act(async () => requests.at(-1).resolve(getSquadTelemetry('ge')))
  assertShell()
})

test('changing squad clears old card and selection remains available after a failure', async () => {
  const user = userEvent.setup()
  render(<App />)
  await act(async () => requests[0].resolve(getSquadTelemetry('te')))
  expect(screen.getByRole('article')).toBeVisible()
  await user.click(screen.getByRole('button', { name: /GE — Genius/ }))
  expect(screen.queryByRole('article')).not.toBeInTheDocument()
  await act(async () => requests.at(-1).reject(new Error('packet loss')))
  expect(screen.getByRole('status')).toHaveTextContent('ERROR')
  await user.click(screen.getByRole('button', { name: /CES — Cerberus/ }))
  expect(screen.getByRole('status')).toHaveTextContent('LOADING')
})

test('card renders markup-like data as text', () => {
  const name = '<img src=x onerror=alert(1)>'
  const { container } = render(<TelemetryCard squad={{ ...getSquadTelemetry('te'), name }} />)
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(name)
  expect(container.querySelector('img')).toBeNull()
})

test.each(['success', 'failure'])('rapid CES → TE → GE clicks ignore late %s responses', async (outcome) => {
  const user = userEvent.setup()
  render(<App />)
  for (const name of [/CES — Cerberus/, /TE — The Expendables/, /GE — Genius/]) {
    await user.click(screen.getByRole('button', { name }))
  }
  expect(requests.map(({ id }) => id)).toEqual(['te', 'ces', 'te', 'ge'])
  expect(requests.slice(0, -1).every(({ signal }) => signal.aborted)).toBe(true)
  expect(requests.at(-1).signal.aborted).toBe(false)
  // CES/TE deliberately ignore abort and finish while GE is still loading.
  await act(async () => {
    for (const request of requests.slice(0, -1)) {
      if (outcome === 'success') request.resolve(getSquadTelemetry(request.id))
      else request.reject(new Error('Old request failure'))
    }
  })
  expect(screen.getByRole('status')).toHaveTextContent('LOADING')
  expect(screen.queryByRole('article')).not.toBeInTheDocument()
  await act(async () => requests.at(-1).resolve(getSquadTelemetry('ge')))
  expect(screen.getAllByRole('article')).toHaveLength(1)
  expect(screen.getByRole('article', { name: 'Genius Esports telemetry' })).toBeVisible()
  expect(screen.getByRole('button', { name: /GE — Genius/ })).toHaveAttribute('aria-pressed', 'true')
})

test('packet loss shows one named alert with safe text and an enabled Retry button', async () => {
  render(<App />)
  await act(async () => requests[0].reject(new Error('Satellite packet timeout')))
  const alert = screen.getByRole('alert', { name: 'Blue-Zone Link Lost' })
  expect(alert.tagName).toBe('SECTION')
  expect(alert).toHaveTextContent('Satellite packet timeout. Reconnect to request fresh simulated telemetry.')
  expect(screen.getAllByRole('alert')).toHaveLength(1)
  const button = within(alert).getByRole('button', { name: 'Reconnect Satellite' })
  expect(button).toBeEnabled()
  expect(button).toHaveAttribute('type', 'button')
  expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'off')
  expect(screen.getByRole('region', { name: 'Telemetry panel' })).toHaveAttribute('aria-busy', 'false')
})

test.each(['{Enter}', ' '])('keyboard Retry with %s starts a fresh same-squad request and recovers', async (key) => {
  const user = userEvent.setup()
  render(<App />)
  await act(async () => requests[0].reject(new Error('Satellite packet timeout')))
  for (let step = 0; step < 4; step += 1) await user.tab()
  const retry = screen.getByRole('button', { name: 'Reconnect Satellite' })
  expect(retry).toHaveFocus()
  await user.keyboard(key)
  expect(requests).toHaveLength(2)
  expect(requests[1].id).toBe('te')
  expect(requests[0].signal.aborted).toBe(true)
  expect(requests[1].signal).not.toBe(requests[0].signal)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
  expect(screen.getByRole('region', { name: 'Loading telemetry' })).toBeVisible()
  expect(screen.getByRole('region', { name: 'Telemetry panel' })).toHaveAttribute('aria-busy', 'true')
  await act(async () => requests[1].resolve(getSquadTelemetry('te')))
  expect(screen.getByRole('article', { name: 'The Expendables telemetry' })).toBeVisible()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Reconnect Satellite' })).not.toBeInTheDocument()
})

test('repeated failures permit another retry and only the current squad is requested', async () => {
  const user = userEvent.setup()
  render(<App />)
  await user.click(screen.getByRole('button', { name: /GE — Genius/ }))
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await act(async () => requests.at(-1).reject(new Error('Satellite packet timeout')))
    expect(screen.getAllByRole('alert')).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Reconnect Satellite' }))
    expect(requests.at(-1).id).toBe('ge')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('LOADING')
  }
  expect(requests.map(({ id }) => id)).toEqual(['te', 'ge', 'ge', 'ge', 'ge'])
  await act(async () => requests.at(-1).resolve(getSquadTelemetry('ge')))
  expect(screen.getByRole('article', { name: 'Genius Esports telemetry' })).toBeVisible()
})

test('AbortError during switching or the current request never renders an alert', async () => {
  const user = userEvent.setup()
  render(<App />)
  await user.click(screen.getByRole('button', { name: /GE — Genius/ }))
  await act(async () => {
    requests[0].reject(new DOMException('Canceled', 'AbortError'))
    requests[1].reject(new DOMException('Canceled', 'AbortError'))
  })
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Reconnect Satellite' })).not.toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent('LOADING')
})

test('unexpected exceptions are not exposed and browser alert is never called', async () => {
  const browserAlert = vi.spyOn(window, 'alert').mockImplementation(() => {})
  render(<App />)
  await act(async () => requests[0].reject(new Error('<script>private details</script>')))
  expect(screen.getByRole('alert')).toHaveTextContent('Telemetry request failed. Please try again.')
  expect(screen.queryByText(/private details/)).not.toBeInTheDocument()
  expect(browserAlert).not.toHaveBeenCalled()
})

test('real service handles two packet losses then success through the Retry button', async () => {
  vi.useFakeTimers()
  const random = vi.spyOn(Math, 'random')
    .mockReturnValueOnce(0.1)
    .mockReturnValueOnce(0.2)
    .mockReturnValueOnce(0.8)
  const actual = await vi.importActual('./services/fetchKraftonPubgTelemetry.js')
  vi.mocked(fetchKraftonPubgTelemetry).mockImplementation(actual.fetchKraftonPubgTelemetry)
  render(<App />)
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await act(async () => vi.advanceTimersByTimeAsync(1200))
    expect(screen.getByRole('alert')).toHaveTextContent('Satellite packet timeout.')
    expect(vi.getTimerCount()).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: 'Reconnect Satellite' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Loading telemetry' })).toBeVisible()
    expect(vi.getTimerCount()).toBe(1)
  }
  await act(async () => vi.advanceTimersByTimeAsync(1200))
  expect(screen.getByRole('article', { name: 'The Expendables telemetry' })).toBeVisible()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(random).toHaveBeenCalledTimes(3)
  expect(vi.getTimerCount()).toBe(0)
})
