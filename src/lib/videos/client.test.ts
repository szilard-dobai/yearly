import { orderSummary } from '@/test/video-orders'
import type { CountryVisit } from '@/lib/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createVideoOrder,
  orderStage,
  requestVideoUpdate,
  videoRequestBody,
  withCheckoutTheme,
} from './client'

const fetchMock = vi.fn()

const visits: CountryVisit[] = [
  { id: '1', countryCode: 'JP', date: new Date(2026, 2, 20) },
  { id: '2', countryCode: 'FR', date: new Date(2026, 6, 1) },
  { id: '3', countryCode: 'PT', date: new Date(2025, 0, 2) },
]

function respond(body: unknown, status: number) {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(body), { status })
  )
}

describe('video order client', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("sends only the period's days", () => {
    expect(
      videoRequestBody({ pack: 'month', year: 2026, month: 2 }, visits, 1)
    ).toEqual({ days: { '2026-03-20': ['JP'] }, weekStartsOn: 1 })
    expect(videoRequestBody({ pack: 'year', year: 2026 }, visits, 0)).toEqual({
      days: { '2026-03-20': ['JP'], '2026-07-01': ['FR'] },
      weekStartsOn: 0,
    })
  })

  it('creates an order for the period and returns the checkout link', async () => {
    respond(
      { orderId: 'o1', free: false, checkoutUrl: 'https://polar.test/c' },
      201
    )

    const result = await createVideoOrder(
      { pack: 'month', year: 2026, month: 2 },
      visits,
      1
    )

    expect(result).toEqual({
      ok: true,
      orderId: 'o1',
      free: false,
      checkoutUrl: 'https://polar.test/c',
    })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/videos/orders')
    expect(JSON.parse(init.body)).toEqual({
      pack: 'month',
      year: 2026,
      month: 2,
      days: { '2026-03-20': ['JP'] },
      weekStartsOn: 1,
    })
  })

  it('returns a free order without a checkout link', async () => {
    respond({ orderId: 'o2', free: true }, 201)

    await expect(
      createVideoOrder({ pack: 'year', year: 2026 }, visits, 1)
    ).resolves.toEqual({ ok: true, orderId: 'o2', free: true })
  })

  it.each([
    [400, 'no-trips'],
    [401, 'signed-out'],
    [403, 'failed'],
    [429, 'rate-limited'],
    [502, 'checkout-unavailable'],
  ] as const)('maps a %i to %s', async (status, error) => {
    respond({ error: 'x' }, status)

    await expect(
      createVideoOrder({ pack: 'year', year: 2026 }, visits, 1)
    ).resolves.toEqual({ ok: false, error })
  })

  it('treats a network failure as a failed order', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('offline'))

    await expect(
      createVideoOrder({ pack: 'year', year: 2026 }, visits, 1)
    ).resolves.toEqual({ ok: false, error: 'failed' })
  })

  it("posts an update with the order's period only", async () => {
    const updated = orderSummary({
      render: { version: 1, status: 'queued' },
      updatesLeft: 2,
    })
    respond(updated, 202)

    const result = await requestVideoUpdate(
      orderSummary(),
      { '2026-03-20': ['JP'], '2025-01-02': ['PT'] },
      1
    )

    expect(result).toEqual({ ok: true, order: updated })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/videos/orders/order-1/updates')
    expect(JSON.parse(init.body)).toEqual({
      days: { '2026-03-20': ['JP'] },
      weekStartsOn: 1,
    })
  })

  it.each([
    [409, 'busy'],
    [409, 'no-updates-left'],
    [422, 'too-different'],
    [404, 'not-found'],
  ] as const)('passes on a %i %s refusal', async (status, reason) => {
    respond({ error: reason }, status)

    await expect(requestVideoUpdate(orderSummary(), {}, 1)).resolves.toEqual({
      ok: false,
      reason,
    })
  })

  it('reports unknown update errors as failed', async () => {
    respond({ error: 'Invalid update' }, 400)

    await expect(requestVideoUpdate(orderSummary(), {}, 1)).resolves.toEqual({
      ok: false,
      reason: 'failed',
    })
  })

  it('works out where an order is', () => {
    expect(orderStage(orderSummary({ status: 'draft' }))).toBe('confirming')
    expect(
      orderStage(orderSummary({ render: { version: 0, status: 'rendering' } }))
    ).toBe('making')
    expect(orderStage(orderSummary({ render: null }))).toBe('making')
    expect(orderStage(orderSummary())).toBe('ready')
    expect(
      orderStage(orderSummary({ render: { version: 0, status: 'failed' } }))
    ).toBe('failed')
    expect(orderStage(orderSummary({ status: 'refunded' }))).toBe('refunded')
  })

  it("matches the checkout to the site's theme", () => {
    expect(withCheckoutTheme('https://polar.test/c?x=1', 'dark')).toBe(
      'https://polar.test/c?x=1&theme=dark'
    )
  })
})
