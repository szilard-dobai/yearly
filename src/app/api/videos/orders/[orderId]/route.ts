import { db } from '@/lib/db'
import { getVideoUser, json, notFound } from '@/lib/videos/api'
import { isVideoSalesEnabled } from '@/lib/videos/enabled'
import { getOrderForUser } from '@/lib/videos/orders'
import { startRender } from '@/lib/videos/render'
import { summarizeOrder } from '@/lib/videos/summary'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  if (!isVideoSalesEnabled()) return notFound()

  const user = await getVideoUser(request)
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const { orderId } = await params
  const found = await getOrderForUser(db, user.id, orderId)
  if (!found) return json({ error: 'Not found' }, 404)

  const latest = found.renders.at(-1)
  if (
    found.order.status === 'paid' &&
    latest?.status === 'queued' &&
    latest.workflowRunId === null
  ) {
    await startRender(db, latest.id, found.order.pack).catch((error) =>
      console.error('Could not restart a queued video render', error)
    )
  }

  return json(await summarizeOrder(found.order, found.renders))
}
