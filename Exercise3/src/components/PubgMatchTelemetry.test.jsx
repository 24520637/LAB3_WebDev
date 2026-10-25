import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { getSquadTelemetry } from '../data/pubg-vn-telemetry-spec.js'
import { fetchKraftonPubgTelemetry } from '../services/fetchKraftonPubgTelemetry.js'
import PubgMatchTelemetry from './PubgMatchTelemetry.jsx'

vi.mock('../services/fetchKraftonPubgTelemetry.js', () => ({
  fetchKraftonPubgTelemetry: vi.fn(),
}))

let requests

beforeEach(() => {
  requests = []
  // Deliberately ignore cancellation to exercise late responses.
  vi.mocked(fetchKraftonPubgTelemetry).mockImplementation((id, { signal }) => new Promise((resolve, reject) => {
    requests.push({ id, signal, resolve, reject })
  }))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.mocked(fetchKraftonPubgTelemetry).mockReset()
})

async function succeed(request) {
  await act(async () => request.resolve(getSquadTelemetry(request.id)))
}

async function fail(request, error = new Error('Private service details')) {
  await act(async () => request.reject(error))
}

test('initial render is safely IDLE before effects start', () => {
  const html = renderToString(<PubgMatchTelemetry />)
  expect(html).toContain('IDLE')
  expect(html).toContain('Telemetry has not started.')
  expect(fetchKraftonPubgTelemetry).not.toHaveBeenCalled()
})

test('defaults to TE, enters LOADING, and accepts its success', async () => {
  render(<PubgMatchTelemetry />)
  expect(requests[0].id).toBe('te')
  expect(requests[0].signal.aborted).toBe(false)
  expect(screen.getByRole('status')).toHaveTextContent('LOADING: Loading telemetry.')
  await succeed(requests[0])
  expect(screen.getByRole('status')).toHaveTextContent('SUCCESS: Telemetry received for The Expendables.')
})

test('current failure shows safe ERROR and retryTick starts a fresh attempt for the same squad', async () => {
  const { rerender } = render(<PubgMatchTelemetry selectedSquadId="ge" retryTick={0} />)
  await fail(requests[0])
  expect(screen.getByRole('status')).toHaveTextContent('ERROR: Telemetry request failed. Please try again.')
  expect(screen.queryByText(/Private service details/)).not.toBeInTheDocument()
  rerender(<PubgMatchTelemetry selectedSquadId="ge" retryTick={1} />)
  expect(requests).toHaveLength(2)
  expect(requests[0].signal.aborted).toBe(true)
  expect(requests[1].id).toBe('ge')
  expect(requests[1].signal).not.toBe(requests[0].signal)
  expect(screen.getByRole('status')).toHaveTextContent('LOADING: Loading telemetry.')
  await succeed(requests[1])
  expect(screen.getByRole('status')).toHaveTextContent('SUCCESS: Telemetry received for Genius Esports.')
})

test.each(['success', 'failure'])('rapid CES → TE → GE ignores stale %s before and after GE settles', async (outcome) => {
  const { rerender } = render(<PubgMatchTelemetry selectedSquadId="ces" />)
  rerender(<PubgMatchTelemetry selectedSquadId="te" />)
  rerender(<PubgMatchTelemetry selectedSquadId="ge" />)
  expect(requests.map(({ id }) => id)).toEqual(['ces', 'te', 'ge'])
  expect(new Set(requests.map(({ signal }) => signal)).size).toBe(3)
  expect(requests.map(({ signal }) => signal.aborted)).toEqual([true, true, false])
  const settle = outcome === 'success' ? succeed : fail
  await settle(requests[0])
  expect(screen.getByRole('status')).toHaveTextContent('LOADING: Loading telemetry.')
  await succeed(requests[2])
  await settle(requests[1])
  expect(screen.getByRole('status')).toHaveTextContent('SUCCESS: Telemetry received for Genius Esports.')
  expect(screen.queryByText(/Cerberus|Expendables|ERROR/)).not.toBeInTheDocument()
})

test('a stale success cannot replace the latest squad error', async () => {
  const { rerender } = render(<PubgMatchTelemetry selectedSquadId="ces" />)
  rerender(<PubgMatchTelemetry selectedSquadId="ge" />)
  await fail(requests[1])
  await succeed(requests[0])
  expect(screen.getByRole('status')).toHaveTextContent('ERROR: Telemetry request failed.')
})

test('returning to the same squad still uses a distinct request identity', async () => {
  const { rerender } = render(<PubgMatchTelemetry selectedSquadId="ces" />)
  rerender(<PubgMatchTelemetry selectedSquadId="te" />)
  rerender(<PubgMatchTelemetry selectedSquadId="ces" />)
  await succeed(requests[0])
  expect(screen.getByRole('status')).toHaveTextContent('LOADING: Loading telemetry.')
  await succeed(requests[2])
  await fail(requests[1])
  expect(screen.getByRole('status')).toHaveTextContent('SUCCESS: Telemetry received for Cerberus Esports.')
})

test.each(['success', 'failure'])('request identity blocks stale %s even when abort does nothing', async (outcome) => {
  vi.spyOn(AbortController.prototype, 'abort').mockImplementation(() => {})
  const { rerender } = render(<PubgMatchTelemetry selectedSquadId="ces" />)
  rerender(<PubgMatchTelemetry selectedSquadId="ge" />)
  expect(requests[0].signal.aborted).toBe(false)
  await (outcome === 'success' ? succeed : fail)(requests[0])
  expect(screen.getByRole('status')).toHaveTextContent('LOADING: Loading telemetry.')
  await succeed(requests[1])
  expect(screen.getByRole('status')).toHaveTextContent('SUCCESS: Telemetry received for Genius Esports.')
})

test.each(['success', 'failure'])('retryTick supersedes pending same-squad %s without deduplication', async (outcome) => {
  const { rerender } = render(<PubgMatchTelemetry selectedSquadId="te" retryTick={0} />)
  rerender(<PubgMatchTelemetry selectedSquadId="te" retryTick={1} />)
  expect(requests).toHaveLength(2)
  expect(requests[0].signal.aborted).toBe(true)
  await (outcome === 'success' ? succeed : fail)(requests[0])
  expect(screen.getByRole('status')).toHaveTextContent('LOADING: Loading telemetry.')
  await succeed(requests[1])
  expect(screen.getByRole('status')).toHaveTextContent('SUCCESS: Telemetry received for The Expendables.')
})

test('ignores an intentional AbortError from the current request', async () => {
  render(<PubgMatchTelemetry />)
  await fail(requests[0], new DOMException('Canceled', 'AbortError'))
  expect(screen.getByRole('status')).toHaveTextContent('LOADING: Loading telemetry.')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test.each(['success', 'failure'])('unmount aborts and ignores late %s', async (outcome) => {
  const { unmount, container } = render(<PubgMatchTelemetry />)
  unmount()
  expect(requests[0].signal.aborted).toBe(true)
  await (outcome === 'success' ? succeed : fail)(requests[0])
  expect(container).toBeEmptyDOMElement()
})

test('Strict Mode creates a fresh controller after cleanup without a false error', async () => {
  const { unmount } = render(<StrictMode><PubgMatchTelemetry /></StrictMode>)
  expect(requests).toHaveLength(2)
  expect(requests[0].signal).not.toBe(requests[1].signal)
  expect(requests[0].signal.aborted).toBe(true)
  expect(requests[1].signal.aborted).toBe(false)
  await fail(requests[0], new DOMException('Canceled', 'AbortError'))
  expect(screen.getByRole('status')).toHaveTextContent('LOADING: Loading telemetry.')
  await succeed(requests[1])
  expect(screen.getByRole('status')).toHaveTextContent('SUCCESS: Telemetry received for The Expendables.')
  unmount()
  expect(requests[1].signal.aborted).toBe(true)
})

test('unchanged selection and retryTick do not start extra requests', () => {
  const { rerender } = render(<PubgMatchTelemetry />)
  rerender(<PubgMatchTelemetry />)
  expect(requests).toHaveLength(1)
})

test('real service cancels timers through rapid switching, Strict Mode, and unmount', async () => {
  vi.useFakeTimers()
  vi.spyOn(Math, 'random').mockReturnValue(0.8)
  const actual = await vi.importActual('../services/fetchKraftonPubgTelemetry.js')
  vi.mocked(fetchKraftonPubgTelemetry).mockImplementation(actual.fetchKraftonPubgTelemetry)
  const { rerender, unmount } = render(<StrictMode><PubgMatchTelemetry selectedSquadId="ces" /></StrictMode>)
  rerender(<StrictMode><PubgMatchTelemetry selectedSquadId="te" /></StrictMode>)
  rerender(<StrictMode><PubgMatchTelemetry selectedSquadId="ge" /></StrictMode>)
  expect(vi.getTimerCount()).toBe(1)
  await act(async () => vi.advanceTimersByTimeAsync(1200))
  expect(screen.getByRole('status')).toHaveTextContent('SUCCESS: Telemetry received for Genius Esports.')
  expect(vi.getTimerCount()).toBe(0)
  rerender(<StrictMode><PubgMatchTelemetry selectedSquadId="ces" /></StrictMode>)
  expect(vi.getTimerCount()).toBe(1)
  unmount()
  expect(vi.getTimerCount()).toBe(0)
  await act(async () => vi.runAllTimersAsync())
})

test.each(['ces', 'te', 'ge'])('real service delivers %s through the component with all six metrics', async (id) => {
  vi.useFakeTimers()
  vi.spyOn(Math, 'random').mockReturnValue(0.8)
  const actual = await vi.importActual('../services/fetchKraftonPubgTelemetry.js')
  vi.mocked(fetchKraftonPubgTelemetry).mockImplementation(actual.fetchKraftonPubgTelemetry)
  render(<PubgMatchTelemetry selectedSquadId={id} />)
  expect(screen.getByRole('status')).toHaveTextContent('LOADING')
  await act(async () => vi.advanceTimersByTimeAsync(1200))
  const squad = getSquadTelemetry(id)
  const card = screen.getByRole('article', { name: `${squad.name} telemetry` })
  expect([...card.querySelectorAll('dd')].map((element) => element.textContent)).toEqual([
    squad.map, squad.phase, String(squad.alive), String(squad.kills), `${squad.wwcdProbability}%`, squad.status,
  ])
  expect(vi.getTimerCount()).toBe(0)
})

test('real packet loss becomes ERROR and retryTick recovers with the current squad', async () => {
  vi.useFakeTimers()
  const random = vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValueOnce(0.8)
  const actual = await vi.importActual('../services/fetchKraftonPubgTelemetry.js')
  vi.mocked(fetchKraftonPubgTelemetry).mockImplementation(actual.fetchKraftonPubgTelemetry)
  const { rerender } = render(<PubgMatchTelemetry selectedSquadId="ge" retryTick={0} />)
  await act(async () => vi.advanceTimersByTimeAsync(1200))
  expect(screen.getByRole('alert')).toHaveTextContent('Satellite packet timeout.')
  expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'off')
  expect(screen.queryByRole('article')).not.toBeInTheDocument()
  expect(vi.getTimerCount()).toBe(0)
  rerender(<PubgMatchTelemetry selectedSquadId="ge" retryTick={1} />)
  expect(screen.getByRole('status')).toHaveTextContent('LOADING')
  await act(async () => vi.advanceTimersByTimeAsync(1200))
  expect(screen.getByRole('article', { name: 'Genius Esports telemetry' })).toBeVisible()
  expect(random).toHaveBeenCalledTimes(2)
  expect(vi.getTimerCount()).toBe(0)
})

test('real invalid squad becomes a safe ERROR without starting a timer', async () => {
  vi.useFakeTimers()
  const random = vi.spyOn(Math, 'random')
  const actual = await vi.importActual('../services/fetchKraftonPubgTelemetry.js')
  vi.mocked(fetchKraftonPubgTelemetry).mockImplementation(actual.fetchKraftonPubgTelemetry)
  await act(async () => {
    render(<PubgMatchTelemetry selectedSquadId="missing" />)
  })
  expect(screen.getByRole('status')).toHaveTextContent('ERROR: Telemetry request failed. Please try again.')
  expect(screen.queryByRole('article')).not.toBeInTheDocument()
  expect(random).not.toHaveBeenCalled()
  expect(vi.getTimerCount()).toBe(0)
})

test('loading has one live status outside its busy panel and decorative placeholders are hidden', () => {
  render(<PubgMatchTelemetry />)
  const panel = screen.getByRole('region', { name: 'Telemetry panel' })
  const skeleton = screen.getByRole('region', { name: 'Loading telemetry' })
  expect(panel).toHaveAttribute('aria-busy', 'true')
  expect(panel).toContainElement(skeleton)
  expect(screen.getByText('Receiving squad telemetry…')).toBeVisible()
  expect(screen.getAllByRole('status')).toHaveLength(1)
  expect(panel).not.toContainElement(screen.getByRole('status'))
  expect(skeleton.querySelector('.telemetry-skeleton__visual')).toHaveAttribute('aria-hidden', 'true')
})

test.each(['success', 'failure'])('loading skeleton is removed and busy clears on %s', async (outcome) => {
  render(<PubgMatchTelemetry />)
  expect(screen.getByRole('region', { name: 'Loading telemetry' })).toBeVisible()
  await (outcome === 'success' ? succeed : fail)(requests[0])
  expect(screen.queryByRole('region', { name: 'Loading telemetry' })).not.toBeInTheDocument()
  expect(screen.getByRole('region', { name: 'Telemetry panel' })).toHaveAttribute('aria-busy', 'false')
  expect(screen.getByRole('status')).toHaveTextContent(outcome === 'success' ? 'SUCCESS' : 'ERROR')
})

test('squad switching preserves loading feedback until the current response settles', async () => {
  const { rerender } = render(<PubgMatchTelemetry selectedSquadId="ces" />)
  rerender(<PubgMatchTelemetry selectedSquadId="te" />)
  rerender(<PubgMatchTelemetry selectedSquadId="ge" />)
  await fail(requests[0], new DOMException('Canceled', 'AbortError'))
  expect(screen.getByRole('region', { name: 'Loading telemetry' })).toBeVisible()
  expect(screen.getByRole('region', { name: 'Telemetry panel' })).toHaveAttribute('aria-busy', 'true')
  await succeed(requests[2])
  expect(screen.queryByRole('region', { name: 'Loading telemetry' })).not.toBeInTheDocument()
})
