import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { getSquadTelemetry } from '../data/pubg-vn-telemetry-spec.js'
import { fetchKraftonPubgTelemetry } from './fetchKraftonPubgTelemetry.js'

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function trackedController() {
  const controller = new AbortController()
  const add = vi.spyOn(controller.signal, 'addEventListener')
  const remove = vi.spyOn(controller.signal, 'removeEventListener')
  return { controller, add, remove }
}

function expectCleanedUp(add, remove) {
  expect(add).toHaveBeenCalledExactlyOnceWith('abort', expect.any(Function), { once: true })
  expect(remove).toHaveBeenCalledExactlyOnceWith('abort', add.mock.calls[0][1])
  expect(vi.getTimerCount()).toBe(0)
}

test.each(['ces', 'te', 'ge'])('delays then returns the exact %s dataset record and cleans up', async (id) => {
  const { controller, add, remove } = trackedController()
  const random = vi.fn(() => 0.8)
  const onSuccess = vi.fn()
  const request = fetchKraftonPubgTelemetry(id, { signal: controller.signal, delayMs: 100, random })
  request.then(onSuccess)
  await vi.advanceTimersByTimeAsync(99)
  expect(onSuccess).not.toHaveBeenCalled()
  expect(random).not.toHaveBeenCalled()
  expect(vi.getTimerCount()).toBe(1)
  await vi.advanceTimersByTimeAsync(1)
  await expect(request).resolves.toBe(getSquadTelemetry(id))
  expect(random).toHaveBeenCalledTimes(1)
  expectCleanedUp(add, remove)
})

test.each([0, 0.349999])('sample %s causes packet loss and releases resources', async (sample) => {
  const { controller, add, remove } = trackedController()
  const request = fetchKraftonPubgTelemetry('te', { signal: controller.signal, random: () => sample })
  const assertion = expect(request).rejects.toThrow('Satellite packet timeout')
  await vi.runAllTimersAsync()
  await assertion
  expectCleanedUp(add, remove)
})

test.each([0.35, 0.999999])('sample %s succeeds at or above the loss threshold', async (sample) => {
  const request = fetchKraftonPubgTelemetry('te', { random: () => sample })
  await vi.runAllTimersAsync()
  await expect(request).resolves.toBe(getSquadTelemetry('te'))
  expect(vi.getTimerCount()).toBe(0)
})

test.each(['missing', 'TE', '', undefined, null, '__proto__'])('invalid ID %s rejects without resources or randomness', async (id) => {
  const { controller, add, remove } = trackedController()
  const random = vi.fn()
  await expect(fetchKraftonPubgTelemetry(id, { signal: controller.signal, random })).rejects.toThrow('Unknown squad ID')
  expect(add).not.toHaveBeenCalled()
  expect(remove).not.toHaveBeenCalled()
  expect(random).not.toHaveBeenCalled()
  expect(vi.getTimerCount()).toBe(0)
})

test('an already-aborted signal rejects AbortError without allocating resources', async () => {
  const { controller, add, remove } = trackedController()
  controller.abort('custom reason')
  const random = vi.fn()
  await expect(fetchKraftonPubgTelemetry('te', { signal: controller.signal, random })).rejects.toMatchObject({ name: 'AbortError' })
  expect(add).not.toHaveBeenCalled()
  expect(remove).not.toHaveBeenCalled()
  expect(random).not.toHaveBeenCalled()
  expect(vi.getTimerCount()).toBe(0)
})

test.each([0.1, 0.9])('abort during delay prevents later loss/success for sample %s', async (sample) => {
  const { controller, add, remove } = trackedController()
  const random = vi.fn(() => sample)
  const onSuccess = vi.fn()
  const onFailure = vi.fn()
  const request = fetchKraftonPubgTelemetry('te', { signal: controller.signal, delayMs: 100, random })
  const observed = request.then(onSuccess, onFailure)
  await vi.advanceTimersByTimeAsync(50)
  controller.abort(new Error('custom reason'))
  await expect(request).rejects.toMatchObject({ name: 'AbortError' })
  await observed
  expectCleanedUp(add, remove)
  await vi.advanceTimersByTimeAsync(1000)
  controller.abort()
  expect(random).not.toHaveBeenCalled()
  expect(onSuccess).not.toHaveBeenCalled()
  expect(onFailure).toHaveBeenCalledTimes(1)
})

test('abort after successful settlement leaves the result unchanged', async () => {
  const { controller, add, remove } = trackedController()
  const request = fetchKraftonPubgTelemetry('ge', { signal: controller.signal, random: () => 0.5 })
  await vi.runAllTimersAsync()
  expectCleanedUp(add, remove)
  controller.abort()
  await expect(request).resolves.toBe(getSquadTelemetry('ge'))
  expect(remove).toHaveBeenCalledTimes(1)
})

test('abort after packet loss preserves the original failure and does not clean up twice', async () => {
  const { controller, add, remove } = trackedController()
  const random = vi.fn(() => 0.1)
  const request = fetchKraftonPubgTelemetry('te', { signal: controller.signal, random })
  const assertion = expect(request).rejects.toThrow('Satellite packet timeout')
  await vi.runAllTimersAsync()
  await assertion
  expectCleanedUp(add, remove)
  controller.abort()
  await expect(request).rejects.toMatchObject({ name: 'Error', message: 'Satellite packet timeout' })
  expect(remove).toHaveBeenCalledTimes(1)
  expect(random).toHaveBeenCalledTimes(1)
})

test('default timing/randomness are mockable and a zero delay still uses a timer', async () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
  const request = fetchKraftonPubgTelemetry('ces')
  const settled = vi.fn()
  request.then(settled)
  await vi.advanceTimersByTimeAsync(1199)
  expect(settled).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1)
  await expect(request).resolves.toBe(getSquadTelemetry('ces'))
  const zeroDelay = fetchKraftonPubgTelemetry('te', { delayMs: 0 })
  expect(vi.getTimerCount()).toBe(1)
  await vi.runAllTimersAsync()
  await expect(zeroDelay).resolves.toBe(getSquadTelemetry('te'))
})

test('a throwing random source rejects and cleans up', async () => {
  const { controller, add, remove } = trackedController()
  const failure = new Error('Random source unavailable')
  const request = fetchKraftonPubgTelemetry('te', { signal: controller.signal, random: () => { throw failure } })
  const assertion = expect(request).rejects.toBe(failure)
  await vi.runAllTimersAsync()
  await assertion
  expectCleanedUp(add, remove)
})

test.each([-1, Infinity, NaN, 2147483648])('rejects invalid delay %s before setup', async (delayMs) => {
  await expect(fetchKraftonPubgTelemetry('te', { delayMs })).rejects.toBeInstanceOf(RangeError)
  expect(vi.getTimerCount()).toBe(0)
})

test.each([-0.1, 1, NaN, undefined])('invalid random sample %s rejects with cleanup', async (sample) => {
  const { controller, add, remove } = trackedController()
  const request = fetchKraftonPubgTelemetry('te', { signal: controller.signal, random: () => sample })
  const assertion = expect(request).rejects.toBeInstanceOf(RangeError)
  await vi.runAllTimersAsync()
  await assertion
  expectCleanedUp(add, remove)
})
