import { getFeedbackCollection, getTrackingCollection } from '@/lib/mongodb'
import { requireAdmin } from '@/lib/tracking/api'
import type { DeviceSummary } from '@/lib/tracking/types'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const DEFAULT_EVENT_LIMIT = 100
const MAX_EVENT_LIMIT = 500
const MAX_FEEDBACK = 50

function toIsoString(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString() : null
}

interface SummaryFacet {
  totals: {
    totalEvents: number
    firstSeen: Date | null
    lastSeen: Date | null
    countries: (string | null)[]
    deviceTypes: (string | null)[]
  }[]
  eventCounts: { _id: string; count: number }[]
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  const { deviceId } = await params
  if (!deviceId || deviceId.length > 100) {
    return NextResponse.json({ error: 'Invalid device id' }, { status: 400 })
  }

  const url = new URL(request.url)
  const limit = Math.min(
    Math.max(Number(url.searchParams.get('limit')) || DEFAULT_EVENT_LIMIT, 1),
    MAX_EVENT_LIMIT
  )
  const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0)
  const includeSummary = offset === 0

  try {
    const [trackingCollection, feedbackCollection] = await Promise.all([
      getTrackingCollection(),
      getFeedbackCollection(),
    ])

    const [events, summaryFacet, feedback] = await Promise.all([
      trackingCollection
        .find({ deviceId })
        .sort({ timestamp: -1, _id: -1 })
        .skip(offset)
        .limit(limit + 1)
        .toArray(),
      includeSummary
        ? trackingCollection
            .aggregate<SummaryFacet>([
              { $match: { deviceId } },
              {
                $facet: {
                  totals: [
                    {
                      $group: {
                        _id: null,
                        totalEvents: { $sum: 1 },
                        firstSeen: { $min: '$timestamp' },
                        lastSeen: { $max: '$timestamp' },
                        countries: { $addToSet: '$country' },
                        deviceTypes: { $addToSet: '$deviceType' },
                      },
                    },
                  ],
                  eventCounts: [
                    { $group: { _id: '$type', count: { $sum: 1 } } },
                  ],
                },
              },
            ])
            .toArray()
            .then(([facet]) => facet)
        : null,
      includeSummary
        ? feedbackCollection
            .find({ deviceId })
            .sort({ createdAt: -1 })
            .limit(MAX_FEEDBACK)
            .toArray()
        : null,
    ])

    const totals = summaryFacet?.totals[0]
    const summary: DeviceSummary | null = includeSummary
      ? {
          totalEvents: totals?.totalEvents ?? 0,
          firstSeen: toIsoString(totals?.firstSeen),
          lastSeen: toIsoString(totals?.lastSeen),
          countries: (totals?.countries ?? []).filter(
            (country): country is string => !!country
          ),
          deviceTypes: (totals?.deviceTypes ?? []).filter(
            (type): type is DeviceSummary['deviceTypes'][number] => !!type
          ),
          eventCounts: Object.fromEntries(
            (summaryFacet?.eventCounts ?? []).map((item) => [
              item._id,
              item.count,
            ])
          ),
        }
      : null

    return NextResponse.json({
      deviceId,
      summary,
      events: events.slice(0, limit),
      hasMore: events.length > limit,
      feedback,
    })
  } catch (error) {
    console.error('Failed to fetch device activity:', error)
    return NextResponse.json(
      { error: 'Failed to fetch device activity' },
      { status: 500 }
    )
  }
}
