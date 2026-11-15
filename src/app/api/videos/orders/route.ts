import { createRateLimitStorage } from '@/lib/auth/rate-limit'
import { db } from '@/lib/db'
import { validateSameOrigin } from '@/lib/tracking/api'
import {
  clientIp,
  getVideoUser,
  json,
  notFound,
  readJson,
} from '@/lib/videos/api'
import { isVideoSalesEnabled } from '@/lib/videos/enabled'
import {
  createOrder,
  hasFreeVideo,
  listOrdersForUser,
  setCheckout,
} from '@/lib/videos/orders'
import { createOrderSchema, daysInPeriod } from '@/lib/videos/period'
import { createVideoCheckout } from '@/lib/videos/polar'
import { startRender } from '@/lib/videos/render'
import { summarizeOrder } from '@/lib/videos/summary'

export const dynamic = 'force-dynamic'

const ORDER_RATE_LIMIT = { window: 60 * 60, max: 10 }

export async function GET(request: Request) {
  if (!isVideoSalesEnabled()) return notFound()

  const user = await getVideoUser(request)
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const [orders, freeVideo] = await Promise.all([
    listOrdersForUser(db, user.id),
    user.emailVerified ? hasFreeVideo(db, user.email) : false,
  ])
  return json({
    freeVideo,
    orders: await Promise.all(
      orders.map(({ order, renders }) => summarizeOrder(order, renders))
    ),
  })
}

export async function POST(request: Request) {
  if (!isVideoSalesEnabled()) return notFound()

  const forbidden = validateSameOrigin(request)
  if (forbidden) return forbidden

  const user = await getVideoUser(request)
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const read = await readJson(request)
  if (!read.ok) return read.response
  const parsed = createOrderSchema.safeParse(read.body)
  if (!parsed.success) return json({ error: 'Invalid order' }, 400)

  const limit = await createRateLimitStorage(db).consume(
    `video-order:${user.id}`,
    ORDER_RATE_LIMIT
  )
  if (!limit.allowed) {
    return json({ error: 'Too many orders, try again later' }, 429)
  }

  const { days, weekStartsOn, ...period } = parsed.data
  if (Object.keys(daysInPeriod(days, period)).length === 0) {
    return json({ error: 'No trips in this period' }, 400)
  }

  const { order, render, free } = await createOrder(db, {
    userId: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    period,
    data: { days, weekStartsOn },
  })
  if (free) {
    await startRender(db, render.id, order.pack)
    return json({ orderId: order.id, free: true }, 201)
  }

  const checkout = await createVideoCheckout({
    orderId: order.id,
    pack: order.pack,
    userId: user.id,
    email: user.email,
    ipAddress: clientIp(request),
    origin: new URL(request.url).origin,
  })
  await setCheckout(db, order.id, checkout.id)
  return json(
    { orderId: order.id, free: false, checkoutUrl: checkout.url },
    201
  )
}
