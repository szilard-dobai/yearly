// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

const getSession = vi.fn()
const createUpdate = vi.fn()
const getOrderForUser = vi.fn()
const startRender = vi.fn()

vi.mock('@/lib/auth/server', () => ({
  auth: { api: { getSession: (...args: unknown[]) => getSession(...args) } },
}))
vi.mock('@/lib/db', () => ({ db: {} }))
vi.mock('@/lib/videos/enabled', () => ({ isVideoSalesEnabled: () => true }))
vi.mock('@/lib/videos/orders', () => ({
  createUpdate: (...args: unknown[]) => createUpdate(...args),
  getOrderForUser: (...args: unknown[]) => getOrderForUser(...args),
}))
vi.mock('@/lib/videos/render', () => ({
  startRender: (...args: unknown[]) => startRender(...args),
}))
vi.mock('@/lib/videos/summary', () => ({
  summarizeOrder: (order: { id: string }) => Promise.resolve({ id: order.id }),
}))

const BODY = { days: { '2026-03-01': ['FR'] }, weekStartsOn: 1 }

function post(body: unknown = BODY) {
  return POST(
    new Request('https://www.yearly.world/api/videos/orders/order-1/updates', {
      method: 'POST',
      headers: { 'sec-fetch-site': 'same-origin' },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ orderId: 'order-1' }) }
  )
}

describe('POST /api/videos/orders/[orderId]/updates', () => {
  beforeEach(() => {
    getSession
      .mockReset()
      .mockResolvedValue({ user: { id: 'ana', email: 'a@b.c' } })
    createUpdate.mockReset()
    getOrderForUser
      .mockReset()
      .mockResolvedValue({ order: { id: 'order-1' }, renders: [] })
    startRender.mockReset().mockResolvedValue(undefined)
  })

  it('needs a signed-in account', async () => {
    getSession.mockResolvedValue(null)

    expect((await post()).status).toBe(401)
  })

  it('rejects trips that fail validation', async () => {
    expect((await post({ days: {}, weekStartsOn: 9 })).status).toBe(400)
    expect(createUpdate).not.toHaveBeenCalled()
  })

  it.each([
    ['not-found', 404],
    ['not-paid', 409],
    ['busy', 409],
    ['no-updates-left', 409],
    ['too-different', 422],
  ])('answers %s with %i', async (reason, status) => {
    createUpdate.mockResolvedValue({ ok: false, reason })

    const response = await post()

    expect(response.status).toBe(status)
    expect(await response.json()).toEqual({ error: reason })
    expect(startRender).not.toHaveBeenCalled()
  })

  it('starts the new version', async () => {
    createUpdate.mockResolvedValue({
      ok: true,
      render: { id: 'r1' },
      order: { id: 'order-1', pack: 'month' },
    })

    const response = await post()

    expect(response.status).toBe(202)
    expect(createUpdate).toHaveBeenCalledWith(
      {},
      { userId: 'ana', orderId: 'order-1', data: BODY }
    )
    expect(startRender).toHaveBeenCalledWith({}, 'r1', 'month')
  })
})
