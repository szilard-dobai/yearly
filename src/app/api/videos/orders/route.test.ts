// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from './route'

const getSession = vi.fn()
const enabled = vi.fn()
const consume = vi.fn()
const orders = {
  createOrder: vi.fn(),
  hasFreeVideo: vi.fn(),
  listOrdersForUser: vi.fn(),
  setCheckout: vi.fn(),
}
const createVideoCheckout = vi.fn()
const startRender = vi.fn()

vi.mock('@/lib/auth/server', () => ({
  auth: { api: { getSession: (...args: unknown[]) => getSession(...args) } },
}))
vi.mock('@/lib/db', () => ({ db: {} }))
vi.mock('@/lib/videos/enabled', () => ({
  isVideoSalesEnabled: () => enabled(),
}))
vi.mock('@/lib/auth/rate-limit', () => ({
  createRateLimitStorage: () => ({
    consume: (...args: unknown[]) => consume(...args),
  }),
}))
vi.mock('@/lib/videos/orders', () => ({
  createOrder: (...args: unknown[]) => orders.createOrder(...args),
  hasFreeVideo: (...args: unknown[]) => orders.hasFreeVideo(...args),
  listOrdersForUser: (...args: unknown[]) => orders.listOrdersForUser(...args),
  setCheckout: (...args: unknown[]) => orders.setCheckout(...args),
}))
vi.mock('@/lib/videos/polar', () => ({
  createVideoCheckout: (...args: unknown[]) => createVideoCheckout(...args),
}))
vi.mock('@/lib/videos/render', () => ({
  startRender: (...args: unknown[]) => startRender(...args),
}))
vi.mock('@/lib/videos/summary', () => ({
  summarizeOrder: (order: { id: string }) => Promise.resolve({ id: order.id }),
}))

const USER = { id: 'ana', email: 'ana@example.com', emailVerified: true }
const BODY = {
  pack: 'year',
  year: 2026,
  days: { '2026-03-01': ['FR'], '2025-12-31': ['DE'] },
  weekStartsOn: 1,
}

function post(body: unknown, headers: Record<string, string> = {}) {
  return POST(
    new Request('https://www.yearly.world/api/videos/orders', {
      method: 'POST',
      headers: {
        'sec-fetch-site': 'same-origin',
        'x-forwarded-for': '203.0.113.7, 10.0.0.1',
        ...headers,
      },
      body: JSON.stringify(body),
    })
  )
}

describe('/api/videos/orders', () => {
  beforeEach(() => {
    enabled.mockReset().mockReturnValue(true)
    getSession.mockReset().mockResolvedValue({ user: USER })
    consume.mockReset().mockResolvedValue({ allowed: true, retryAfter: null })
    orders.createOrder.mockReset().mockResolvedValue({
      order: { id: 'order-1', pack: 'year' },
      render: { id: 'render-1' },
      free: false,
    })
    orders.setCheckout.mockReset().mockResolvedValue(undefined)
    orders.hasFreeVideo.mockReset().mockResolvedValue(false)
    orders.listOrdersForUser.mockReset().mockResolvedValue([])
    createVideoCheckout.mockReset().mockResolvedValue({
      id: 'checkout-1',
      url: 'https://polar.sh/checkout/1',
    })
    startRender.mockReset().mockResolvedValue(undefined)
  })

  it("doesn't exist until video sales are on", async () => {
    enabled.mockReturnValue(false)

    expect((await post(BODY)).status).toBe(404)
    expect(
      (await GET(new Request('https://www.yearly.world/api/videos/orders')))
        .status
    ).toBe(404)
  })

  it('needs a signed-in account', async () => {
    getSession.mockResolvedValue(null)

    expect((await post(BODY)).status).toBe(401)
  })

  it('refuses requests from other sites', async () => {
    expect((await post(BODY, { 'sec-fetch-site': 'cross-site' })).status).toBe(
      403
    )
  })

  it.each([
    ['an unknown country', { ...BODY, days: { '2026-03-01': ['XX'] } }],
    ['a month out of range', { ...BODY, pack: 'month', month: 12 }],
    ['a missing year', { pack: 'year', days: BODY.days, weekStartsOn: 1 }],
  ])('rejects %s', async (_, body) => {
    expect((await post(body)).status).toBe(400)
    expect(orders.createOrder).not.toHaveBeenCalled()
  })

  it('rejects a period with no trips before making an order', async () => {
    const response = await post({ ...BODY, year: 2024 })

    expect(response.status).toBe(400)
    expect(orders.createOrder).not.toHaveBeenCalled()
  })

  it('limits how many orders one account makes', async () => {
    consume.mockResolvedValue({ allowed: false, retryAfter: 60 })

    expect((await post(BODY)).status).toBe(429)
    expect(orders.createOrder).not.toHaveBeenCalled()
  })

  it('opens a Polar checkout for the account', async () => {
    const response = await post(BODY)

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      orderId: 'order-1',
      free: false,
      checkoutUrl: 'https://polar.sh/checkout/1',
    })
    expect(orders.createOrder).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        userId: 'ana',
        email: 'ana@example.com',
        emailVerified: true,
        period: { pack: 'year', year: 2026 },
      })
    )
    expect(createVideoCheckout).toHaveBeenCalledWith({
      orderId: 'order-1',
      pack: 'year',
      userId: 'ana',
      email: 'ana@example.com',
      ipAddress: '203.0.113.7',
      origin: 'https://www.yearly.world',
    })
    expect(orders.setCheckout).toHaveBeenCalledWith({}, 'order-1', 'checkout-1')
    expect(startRender).not.toHaveBeenCalled()
  })

  it("says so when Polar can't make a checkout", async () => {
    createVideoCheckout.mockRejectedValue(new Error('Polar down'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await post(BODY)

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({
      error: "Checkout isn't available right now",
    })
    expect(orders.setCheckout).not.toHaveBeenCalled()
  })

  it('starts the render straight away for a free video', async () => {
    orders.createOrder.mockResolvedValue({
      order: { id: 'order-1', pack: 'month' },
      render: { id: 'render-1' },
      free: true,
    })

    const response = await post({ ...BODY, pack: 'month', month: 2 })

    expect(await response.json()).toEqual({ orderId: 'order-1', free: true })
    expect(startRender).toHaveBeenCalledWith({}, 'render-1', 'month')
    expect(createVideoCheckout).not.toHaveBeenCalled()
  })

  it("lists the account's orders and whether a free video is waiting", async () => {
    orders.listOrdersForUser.mockResolvedValue([
      { order: { id: 'order-1' }, renders: [] },
    ])
    orders.hasFreeVideo.mockResolvedValue(true)

    const response = await GET(
      new Request('https://www.yearly.world/api/videos/orders')
    )

    expect(await response.json()).toEqual({
      freeVideo: true,
      orders: [{ id: 'order-1' }],
    })
  })

  it("doesn't offer the free video to an unchecked email", async () => {
    getSession.mockResolvedValue({ user: { ...USER, emailVerified: false } })
    orders.listOrdersForUser.mockResolvedValue([])
    orders.hasFreeVideo.mockResolvedValue(true)

    const response = await GET(
      new Request('https://www.yearly.world/api/videos/orders')
    )

    expect((await response.json()).freeVideo).toBe(false)
    expect(orders.hasFreeVideo).not.toHaveBeenCalled()
  })
})
