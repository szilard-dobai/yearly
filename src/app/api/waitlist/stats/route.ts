import { getTrackingCollection, getWaitlistCollection } from '@/lib/mongodb'
import { requireAdmin } from '@/lib/tracking/api'
import {
  buildVideoOfferFunnel,
  type FunnelAggregate,
  VIDEO_OFFER_EVENTS,
  type WaitlistStats,
} from '@/lib/waitlist/stats'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export async function GET(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const [waitlist, tracking] = await Promise.all([
      getWaitlistCollection(),
      getTrackingCollection(),
    ])

    const [total, lastSevenDays, rows] = await Promise.all([
      waitlist.countDocuments({ feature: 'animated_video' }),
      waitlist.countDocuments({
        feature: 'animated_video',
        createdAt: { $gte: new Date(Date.now() - SEVEN_DAYS_MS) },
      }),
      tracking
        .aggregate<FunnelAggregate>([
          { $match: { type: { $in: Object.keys(VIDEO_OFFER_EVENTS) } } },
          {
            $group: {
              _id: { type: '$type', price: '$metadata.price' },
              devices: { $addToSet: '$deviceId' },
            },
          },
          {
            $project: {
              _id: 0,
              type: '$_id.type',
              price: '$_id.price',
              devices: { $size: '$devices' },
            },
          },
        ])
        .toArray(),
    ])

    const stats: WaitlistStats = {
      total,
      lastSevenDays,
      funnel: buildVideoOfferFunnel(rows),
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Failed to fetch waitlist stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch waitlist stats' },
      { status: 500 }
    )
  }
}
