import { db } from '@/lib/db'
import { validateSameOrigin } from '@/lib/tracking/api'
import { getVideoUser, json, notFound, readJson } from '@/lib/videos/api'
import { isVideoSalesEnabled } from '@/lib/videos/enabled'
import { createUpdate, getOrderForUser } from '@/lib/videos/orders'
import { videoRequestSchema } from '@/lib/videos/period'
import { startRender } from '@/lib/videos/render'
import { summarizeOrder } from '@/lib/videos/summary'

export const dynamic = 'force-dynamic'

const REFUSALS = {
  'not-found': 404,
  'not-paid': 409,
  busy: 409,
  'no-updates-left': 409,
  'too-different': 422,
} as const

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  if (!isVideoSalesEnabled()) return notFound()

  const forbidden = validateSameOrigin(request)
  if (forbidden) return forbidden

  const user = await getVideoUser(request)
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const read = await readJson(request)
  if (!read.ok) return read.response
  const parsed = videoRequestSchema.safeParse(read.body)
  if (!parsed.success) return json({ error: 'Invalid update' }, 400)

  const { orderId } = await params
  const result = await createUpdate(db, {
    userId: user.id,
    orderId,
    data: parsed.data,
  })
  if (!result.ok) {
    return json({ error: result.reason }, REFUSALS[result.reason])
  }

  await startRender(db, result.render.id, result.order.pack)
  const found = await getOrderForUser(db, user.id, orderId)
  return json(found && (await summarizeOrder(found.order, found.renders)), 202)
}
