import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/tracking/api'
import { getAdminVideoTotals, listAdminVideoOrders } from '@/lib/videos/admin'
import { json, notFound } from '@/lib/videos/api'
import { isVideoSalesEnabled } from '@/lib/videos/enabled'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (!isVideoSalesEnabled()) return notFound()

  const denied = await requireAdmin(request)
  if (denied) return denied

  const offset = Math.max(
    Math.floor(Number(new URL(request.url).searchParams.get('offset')) || 0),
    0
  )

  try {
    const [page, totals] = await Promise.all([
      listAdminVideoOrders(db, { offset }),
      offset === 0 ? getAdminVideoTotals(db) : null,
    ])
    return json({ ...page, totals })
  } catch (error) {
    console.error('Failed to fetch video orders:', error)
    return json({ error: 'Failed to fetch video orders' }, 500)
  }
}
