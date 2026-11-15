import type { VideoPack } from '@/lib/db/schema'
import { createPolar, errors, type Environment } from '@polar-sh/sdk/2026-10'

export type PolarEnvironment = 'production' | 'sandbox'

const PRODUCT_IDS: Record<PolarEnvironment, Record<VideoPack, string>> = {
  production: {
    year: '8dc503db-c521-408d-8c6d-a1d4ead2c1c5',
    month: '37e247c3-b49e-4c29-967c-d0d7b204bedb',
  },
  sandbox: {
    year: '3cd231f4-04f8-44ed-a015-b88f0718852b',
    month: '9d6ba858-e581-4137-9440-6e25b7ae5ae3',
  },
}

export const ORDER_ID_METADATA_KEY = 'video_order_id'
export const PERIOD_METADATA_KEY = 'video_period'

export function getPolarEnvironment(): PolarEnvironment {
  return process.env.POLAR_ENVIRONMENT === 'production'
    ? 'production'
    : 'sandbox'
}

export function getProductId(pack: VideoPack): string {
  return PRODUCT_IDS[getPolarEnvironment()][pack]
}

export function getPolarOrderUrl(polarOrderId: string): string {
  const host =
    getPolarEnvironment() === 'production'
      ? 'https://polar.sh'
      : 'https://sandbox.polar.sh'
  return `${host}/dashboard/yearly/sales/${polarOrderId}`
}

let client: ReturnType<typeof createPolar> | null = null

function getPolar() {
  const accessToken = process.env.POLAR_ACCESS_TOKEN
  if (!accessToken) throw new Error('POLAR_ACCESS_TOKEN is not set')
  client ??= createPolar({
    accessToken,
    environment: getPolarEnvironment() as Environment,
  })
  return client
}

function rejectsEmail(error: unknown): boolean {
  return (
    error instanceof errors.HTTPValidationError &&
    JSON.stringify(error.error).includes('customer_email')
  )
}

export async function createVideoCheckout(input: {
  orderId: string
  period: string
  pack: VideoPack
  userId: string
  email: string
  ipAddress?: string
  origin: string
}): Promise<{ id: string; url: string }> {
  const create = (customerEmail?: string) =>
    getPolar().checkouts.create({
      products: [getProductId(input.pack)],
      external_customer_id: input.userId,
      customer_email: customerEmail,
      customer_ip_address: input.ipAddress,
      metadata: {
        [ORDER_ID_METADATA_KEY]: input.orderId,
        [PERIOD_METADATA_KEY]: input.period,
      },
      allow_discount_codes: false,
      success_url: `${input.origin}/create?video_order=${input.orderId}`,
      return_url: `${input.origin}/create?video_offer=${input.orderId}`,
      embed_origin: input.origin,
      locale: 'en',
    })

  const checkout = await create(input.email).catch((error: unknown) => {
    if (rejectsEmail(error)) return create()
    throw error
  })
  return { id: checkout.id, url: checkout.url }
}
