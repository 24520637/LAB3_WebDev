import { expect, test, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { act } from 'react'

const mounted = vi.hoisted(() => ({ root: null }))

vi.mock('react-dom/client', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    createRoot(element) {
      mounted.root = actual.createRoot(element)
      return mounted.root
    },
  }
})

test('the real entry point loads telemetry deterministically and cleans up its root', async () => {
  vi.useFakeTimers()
  const random = vi.spyOn(Math, 'random').mockReturnValue(0.8)
  const rootElement = document.createElement('div')
  rootElement.id = 'root'
  document.body.append(rootElement)

  try {
    await act(async () => {
      await import('./main.jsx')
    })
    expect(screen.getByRole('heading', { level: 1, name: 'PUBG Vietnam Series — Live Telemetry' })).toBeVisible()
    expect(screen.getByRole('button', { name: /TE — The Expendables/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('LOADING: Loading telemetry.')
    expect(vi.getTimerCount()).toBe(1)
    await act(async () => vi.advanceTimersByTimeAsync(1200))
    expect(screen.getByRole('status')).toHaveTextContent('SUCCESS: Telemetry received for The Expendables.')
    expect(screen.getByRole('article', { name: 'The Expendables telemetry' })).toBeVisible()
    expect(vi.getTimerCount()).toBe(0)
  } finally {
    await act(async () => mounted.root?.unmount())
    mounted.root = null
    rootElement.remove()
    random.mockRestore()
    vi.useRealTimers()
  }
})
