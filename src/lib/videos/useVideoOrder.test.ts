import { jsonResponse, orderSummary } from '@/test/video-orders'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ORDER_POLL_LIMIT_MS,
  ORDER_POLL_MS,
  useVideoOrder,
} from './useVideoOrder'

const fetchMock = vi.fn()

async function flush() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

describe('useVideoOrder', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('checks the order every few seconds until the videos are ready', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(orderSummary({ status: 'draft' })))
      .mockResolvedValueOnce(
        jsonResponse(
          orderSummary({ render: { version: 0, status: 'rendering' } })
        )
      )
      .mockResolvedValueOnce(jsonResponse(orderSummary()))

    const { result } = renderHook(() => useVideoOrder('order-1'))
    await flush()
    expect(result.current.order?.status).toBe('draft')

    await advance(ORDER_POLL_MS)
    expect(result.current.order?.render?.status).toBe('rendering')

    await advance(ORDER_POLL_MS)
    expect(result.current.order?.render?.status).toBe('ready')

    await advance(ORDER_POLL_MS * 5)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock).toHaveBeenCalledWith('/api/videos/orders/order-1', {
      cache: 'no-store',
    })
  })

  it('stops checking when it is closed', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        jsonResponse(orderSummary({ render: { version: 0, status: 'queued' } }))
      )
    )

    const { rerender } = renderHook(
      ({ enabled }) => useVideoOrder('order-1', { enabled }),
      { initialProps: { enabled: true } }
    )
    await flush()
    rerender({ enabled: false })
    await advance(ORDER_POLL_MS * 3)

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('gives up after a few minutes and says so', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        jsonResponse(
          orderSummary({ render: { version: 0, status: 'rendering' } })
        )
      )
    )

    const { result } = renderHook(() => useVideoOrder('order-1'))
    await advance(ORDER_POLL_LIMIT_MS + ORDER_POLL_MS)

    expect(result.current.timedOut).toBe(true)
    const calls = fetchMock.mock.calls.length
    await advance(ORDER_POLL_MS * 3)
    expect(fetchMock).toHaveBeenCalledTimes(calls)
  })

  it('keeps going through a dropped request', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(jsonResponse(orderSummary()))

    const { result } = renderHook(() => useVideoOrder('order-1'))
    await flush()
    await advance(ORDER_POLL_MS)

    expect(result.current.order?.render?.status).toBe('ready')
  })

  it.each([
    [404, 'not-found'],
    [401, 'signed-out'],
  ] as const)('stops on a %i', async (status, missing) => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'x' }, status))

    const { result } = renderHook(() => useVideoOrder('order-1'))
    await flush()
    await advance(ORDER_POLL_MS * 3)

    expect(result.current.missing).toBe(missing)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('only checks a finished order again when asked to watch it', async () => {
    const initial = orderSummary()
    fetchMock.mockResolvedValue(
      jsonResponse(orderSummary({ render: { version: 1, status: 'ready' } }))
    )

    const { result } = renderHook(() => useVideoOrder('order-1', { initial }))
    await advance(ORDER_POLL_MS * 2)
    expect(fetchMock).not.toHaveBeenCalled()

    act(() =>
      result.current.watch(
        orderSummary({ render: { version: 1, status: 'queued' } })
      )
    )
    expect(result.current.order?.render?.status).toBe('queued')
    await flush()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.current.order?.render).toEqual({
      version: 1,
      status: 'ready',
    })
  })

  it('follows a different order when the ID changes', async () => {
    const year = orderSummary()
    const month = orderSummary({ id: 'order-2', pack: 'month', month: 2 })
    fetchMock.mockResolvedValue(jsonResponse(month))

    const { result, rerender } = renderHook(
      ({ id, initial }) => useVideoOrder(id, { initial }),
      { initialProps: { id: 'order-1', initial: year } }
    )
    expect(result.current.order?.id).toBe('order-1')

    rerender({ id: 'order-2', initial: month })
    expect(result.current.order).toBe(month)
    await advance(ORDER_POLL_MS * 2)
    expect(fetchMock).not.toHaveBeenCalled()

    rerender({ id: 'order-3', initial: month })
    expect(result.current.order).toBeNull()
    await flush()
    expect(fetchMock).toHaveBeenCalledWith('/api/videos/orders/order-3', {
      cache: 'no-store',
    })
  })
})
