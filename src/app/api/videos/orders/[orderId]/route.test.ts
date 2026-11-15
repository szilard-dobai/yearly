// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'

const getSession = vi.fn()
const getOrderForUser = vi.fn()
const startRender = vi.fn()

vi.mock('@/lib/auth/server', () => ({
  auth: { api: { getSession: (...args: unknown[]) => getSession(...args) } },
}))
vi.mock('@/lib/db', () => ({ db: {} }))
vi.mock('@/lib/videos/enabled', () => ({ isVideoSalesEnabled: () => true }))
vi.mock('@/lib/videos/orders', () => ({
  getOrderForUser: (...args: unknown[]) => getOrderForUser(...args),
}))
vi.mock('@/lib/videos/render', () => ({
  startRender: (...args: unknown[]) => startRender(...args),
}))
vi.mock('@/lib/videos/summary', () => ({
  summarizeOrder: (order: { id: string }) => Promise.resolve({ id: order.id }),
}))

function get(orderId = 'order-1') {
  return GET(
    new Request(`https://www.yearly.world/api/videos/orders/${orderId}`),
    { params: Promise.resolve({ orderId }) }
  )
}

describe('GET /api/videos/orders/[orderId]', () => {
  beforeEach(() => {
    getSession
      .mockReset()
      .mockResolvedValue({ user: { id: 'ana', email: 'a@b.c' } })
    getOrderForUser.mockReset()
    startRender.mockReset().mockResolvedValue(undefined)
  })

  it('needs a signed-in account', async () => {
    getSession.mockResolvedValue(null)

    expect((await get()).status).toBe(401)
  })

  it("hides orders that aren't the account's", async () => {
    getOrderForUser.mockResolvedValue(null)

    expect((await get()).status).toBe(404)
    expect(getOrderForUser).toHaveBeenCalledWith({}, 'ana', 'order-1')
  })

  it('returns the order', async () => {
    getOrderForUser.mockResolvedValue({
      order: { id: 'order-1', status: 'paid', pack: 'year' },
      renders: [{ id: 'r0', status: 'ready', workflowRunId: 'run-1' }],
    })

    expect(await (await get()).json()).toEqual({ id: 'order-1' })
    expect(startRender).not.toHaveBeenCalled()
  })

  it('starts a paid render that never started', async () => {
    getOrderForUser.mockResolvedValue({
      order: { id: 'order-1', status: 'paid', pack: 'year' },
      renders: [{ id: 'r0', status: 'queued', workflowRunId: null }],
    })

    await get()

    expect(startRender).toHaveBeenCalledWith({}, 'r0', 'year')
  })

  it("doesn't start anything for an unpaid draft", async () => {
    getOrderForUser.mockResolvedValue({
      order: { id: 'order-1', status: 'draft', pack: 'year' },
      renders: [{ id: 'r0', status: 'queued', workflowRunId: null }],
    })

    await get()

    expect(startRender).not.toHaveBeenCalled()
  })
})
