// @vitest-environment node
import { errors } from '@polar-sh/sdk/2026-10'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const create = vi.fn()

vi.mock('@polar-sh/sdk/2026-10', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@polar-sh/sdk/2026-10')>()),
  createPolar: () => ({ checkouts: { create } }),
}))

const INPUT = {
  orderId: 'order-1',
  pack: 'year' as const,
  userId: 'ana',
  email: 'ana@example.com',
  ipAddress: '203.0.113.7',
  origin: 'https://www.yearly.world',
}

describe('createVideoCheckout', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('POLAR_ACCESS_TOKEN', 'polar_test')
    vi.stubEnv('POLAR_ENVIRONMENT', 'sandbox')
    create.mockReset().mockResolvedValue({ id: 'c1', url: 'https://pay/c1' })
  })

  it('opens the sandbox product with the account and order filled in', async () => {
    const { createVideoCheckout } = await import('./polar')

    expect(await createVideoCheckout(INPUT)).toEqual({
      id: 'c1',
      url: 'https://pay/c1',
    })
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        products: ['3cd231f4-04f8-44ed-a015-b88f0718852b'],
        external_customer_id: 'ana',
        customer_email: 'ana@example.com',
        metadata: { video_order_id: 'order-1' },
        success_url: 'https://www.yearly.world/create?video_order=order-1',
      })
    )
  })

  it('uses the production products in production', async () => {
    vi.stubEnv('POLAR_ENVIRONMENT', 'production')
    const { createVideoCheckout } = await import('./polar')

    await createVideoCheckout({ ...INPUT, pack: 'month' })

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        products: ['37e247c3-b49e-4c29-967c-d0d7b204bedb'],
      })
    )
  })

  it('leaves the email for Polar to ask when Polar rejects it', async () => {
    create.mockRejectedValueOnce(
      new errors.HTTPValidationError(422, {
        detail: [
          {
            loc: ['body', 'customer_email'],
            msg: 'does not accept email',
            type: 'value_error',
          },
        ],
      } as never)
    )
    const { createVideoCheckout } = await import('./polar')

    await createVideoCheckout(INPUT)

    expect(create).toHaveBeenCalledTimes(2)
    expect(create.mock.calls[1][0].customer_email).toBeUndefined()
  })
})
