import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
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
