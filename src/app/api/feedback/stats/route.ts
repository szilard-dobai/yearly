import { FEEDBACK_RATINGS, type FeedbackStats } from '@/lib/feedback/types'
import { getFeedbackCollection } from '@/lib/mongodb'
import { requireAdmin } from '@/lib/tracking/api'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

interface StatsFacet {
  totals: {
    total: number
    averageRating: number | null
    ratedCount: number
    withMessage: number
  }[]
  distribution: { _id: number; count: number }[]
  lastSevenDays: { count: number }[]
}

export async function GET(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const collection = await getFeedbackCollection()
    const [facet] = await collection
      .aggregate<StatsFacet>([
        {
          $facet: {
            totals: [
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  averageRating: { $avg: '$rating' },
                  ratedCount: {
                    $sum: { $cond: [{ $gt: ['$rating', null] }, 1, 0] },
                  },
                  withMessage: {
                    $sum: {
                      $cond: [
                        {
                          $gt: [
                            { $strLenCP: { $ifNull: ['$message', ''] } },
                            0,
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                },
              },
            ],
            distribution: [
              { $match: { rating: { $ne: null } } },
              { $group: { _id: '$rating', count: { $sum: 1 } } },
            ],
            lastSevenDays: [
              {
                $match: {
                  createdAt: { $gte: new Date(Date.now() - SEVEN_DAYS_MS) },
                },
              },
              { $count: 'count' },
            ],
          },
        },
      ])
      .toArray()

    const totals = facet?.totals[0]
    const distribution = Object.fromEntries(
      FEEDBACK_RATINGS.map((rating) => [
        rating,
        facet?.distribution.find((item) => item._id === rating)?.count ?? 0,
      ])
    ) as FeedbackStats['distribution']

    const stats: FeedbackStats = {
      total: totals?.total ?? 0,
      averageRating: totals?.averageRating ?? null,
      ratedCount: totals?.ratedCount ?? 0,
      withMessage: totals?.withMessage ?? 0,
      lastSevenDays: facet?.lastSevenDays[0]?.count ?? 0,
      distribution,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Failed to fetch feedback stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feedback stats' },
      { status: 500 }
    )
  }
}
