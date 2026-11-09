import { parseStatsFilters } from '@/lib/admin/stats-filters'
import { getTrackingCollection } from '@/lib/mongodb'
import { requireAdmin } from '@/lib/tracking/api'
import { buildFunnelPipeline, buildFunnelStats } from '@/lib/tracking/funnel'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  const filters = parseStatsFilters(new URL(request.url).searchParams)
  if (!filters) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
  }

  try {
    const collection = await getTrackingCollection()
    const rows = await collection
      .aggregate(buildFunnelPipeline(filters))
      .toArray()

    return NextResponse.json(buildFunnelStats(rows))
  } catch (error) {
    console.error('Failed to fetch funnel stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch funnel stats' },
      { status: 500 }
    )
  }
}
