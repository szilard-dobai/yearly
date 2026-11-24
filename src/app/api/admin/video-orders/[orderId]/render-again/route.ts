import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/tracking/api'
import { queueFailedRenderAgain } from '@/lib/videos/admin'
import { json, notFound } from '@/lib/videos/api'
import { isVideoSalesEnabled } from '@/lib/videos/enabled'
import { markRenderFailed } from '@/lib/videos/orders'
import { startRender } from '@/lib/videos/render'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  if (!isVideoSalesEnabled()) return notFound()

  const denied = await requireAdmin(request)
  if (denied) return denied

  const { orderId } = await params
  const queued = await queueFailedRenderAgain(db, orderId)
  if (!queued.ok) {
    return queued.reason === 'not-found'
      ? json({ error: 'Order not found' }, 404)
      : json({ error: "The order's latest render hasn't failed" }, 409)
  }

  try {
    await startRender(db, queued.renderId, queued.pack)
  } catch (error) {
    console.error(
      `Could not start video render ${queued.renderId} again`,
      error
    )
    await markRenderFailed(
      db,
      queued.renderId,
      `Could not start the render again: ${String(error)}`.slice(0, 1000)
    )
    return json({ error: 'Could not start the render' }, 502)
  }

  return json({ status: 'queued' }, 202)
}
