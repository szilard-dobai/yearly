// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

const validateEvent = vi.fn()
const markOrderPaid = vi.fn()
const markOrderRefunded = vi.fn()
const startRender = vi.fn()
const deleteVideoFiles = vi.fn()

vi.mock('@polar-sh/sdk/2026-10', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@polar-sh/sdk/2026-10')>()
  return {
    ...actual,
    webhooks: {
      ...actual.webhooks,
      validateEvent: (...args: unknown[]) => validateEvent(...args),
    },
  }
})
vi.mock('@/lib/db', () => ({ db: {} }))
vi.mock('@/lib/videos/enabled', () => ({ isVideoSalesEnabled: () => true }))
vi.mock('@/lib/videos/orders', () => ({
  markOrderPaid: (...args: unknown[]) => markOrderPaid(...args),
  markOrderRefunded: (...args: unknown[]) => markOrderRefunded(...args),
}))
vi.mock('@/lib/videos/render', () => ({
  startRender: (...args: unknown[]) => startRender(...args),
}))
vi.mock('@/lib/video-render/blob', () => ({
  deleteVideoFiles: (...args: unknown[]) => deleteVideoFiles(...args),
}))

function post() {
  return POST(
    new Request('https://www.yearly.world/api/webhooks/polar', {
      method: 'POST',
      headers: {
        'webhook-id': 'msg_1',
        'webhook-timestamp': '1700000000',
        'webhook-signature': 'v1,abc',
      },
      body: '{}',
    })
  )
}

const paidOrder = {
  id: 'polar-order-1',
  status: 'paid',
  total_amount: 299,
  currency: 'usd',
  metadata: { video_order_id: 'order-1' },
}

describe('POST /api/webhooks/polar', () => {
  beforeEach(() => {
    vi.stubEnv('POLAR_WEBHOOK_SECRET', 'whsec_test')
    validateEvent.mockReset()
    markOrderPaid.mockReset().mockResolvedValue({
      render: { id: 'render-1' },
      pack: 'year',
    })
    markOrderRefunded.mockReset().mockResolvedValue([])
    startRender.mockReset().mockResolvedValue(undefined)
    deleteVideoFiles.mockReset().mockResolvedValue(undefined)
  })

  afterEach(() => vi.unstubAllEnvs())

  it('refuses events without a valid signature', async () => {
    const { webhooks } = await import('@polar-sh/sdk/2026-10')
    validateEvent.mockRejectedValue(
      new webhooks.PolarWebhookVerificationError('bad signature')
    )

    expect((await post()).status).toBe(403)
    expect(markOrderPaid).not.toHaveBeenCalled()
  })

  it('fails loudly without its secret', async () => {
    vi.stubEnv('POLAR_WEBHOOK_SECRET', '')
    vi.spyOn(console, 'error').mockImplementation(() => {})

    expect((await post()).status).toBe(500)
    expect(validateEvent).not.toHaveBeenCalled()
  })

  it('marks a paid order paid and starts its render', async () => {
    validateEvent.mockResolvedValue({ type: 'order.paid', data: paidOrder })

    expect((await post()).status).toBe(202)
    expect(markOrderPaid).toHaveBeenCalledWith(
      {},
      {
        orderId: 'order-1',
        polarOrderId: 'polar-order-1',
        amountCents: 299,
        currency: 'usd',
      }
    )
    expect(startRender).toHaveBeenCalledWith({}, 'render-1', 'year')
  })

  it("asks Polar to retry when the render can't start", async () => {
    validateEvent.mockResolvedValue({ type: 'order.paid', data: paidOrder })
    startRender.mockRejectedValue(new Error('Workflow down'))

    await expect(post()).rejects.toThrow('Workflow down')
  })

  it("ignores orders that aren't video orders", async () => {
    validateEvent.mockResolvedValue({
      type: 'order.paid',
      data: { ...paidOrder, metadata: {} },
    })

    expect((await post()).status).toBe(202)
    expect(markOrderPaid).not.toHaveBeenCalled()
  })

  it('removes the videos of a fully refunded order', async () => {
    validateEvent.mockResolvedValue({
      type: 'order.refunded',
      data: { ...paidOrder, status: 'refunded' },
    })
    markOrderRefunded.mockResolvedValue([{ pathname: 'a.mp4' }])

    expect((await post()).status).toBe(202)
    expect(markOrderRefunded).toHaveBeenCalledWith({}, 'polar-order-1')
    expect(deleteVideoFiles).toHaveBeenCalledWith(['a.mp4'])
  })

  it('keeps the videos after a partial refund', async () => {
    validateEvent.mockResolvedValue({
      type: 'order.refunded',
      data: { ...paidOrder, status: 'partially_refunded' },
    })

    await post()

    expect(markOrderRefunded).not.toHaveBeenCalled()
  })
})
