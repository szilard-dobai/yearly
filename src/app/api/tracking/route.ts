import { buildEventListFilter } from '@/lib/admin/event-filters'
import { getSessionUserId } from '@/lib/auth/session-user'
import { getTrackingCollection } from '@/lib/mongodb'
import { isAuthenticated, validateSameOrigin } from '@/lib/tracking/api'
import type { Sort } from 'mongodb'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const forbidden = validateSameOrigin(request)
  if (forbidden) return forbidden

  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const sortField = (url.searchParams.get('sortField') || 'timestamp') as
    | 'timestamp'
    | 'type'
    | 'deviceId'
  const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as
    | 'asc'
    | 'desc'
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 500)
  const offset = Number(url.searchParams.get('offset')) || 0

  try {
    const collection = await getTrackingCollection()
    const filter = buildEventListFilter(url.searchParams)
    const sort: Sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 }

    const [events, total] = await Promise.all([
      collection.find(filter).sort(sort).skip(offset).limit(limit).toArray(),
      collection.countDocuments(filter),
    ])

    return NextResponse.json({
      events,
      total,
      hasMore: offset + limit < total,
    })
  } catch (error) {
    console.error('Failed to fetch events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const forbidden = validateSameOrigin(request)
  if (forbidden) return forbidden

  try {
    const event = await request.json()

    if (!event.type || !event.timestamp || !event.deviceId) {
      return NextResponse.json({ error: 'Invalid event data' }, { status: 400 })
    }

    const country = request.headers.get('x-vercel-ip-country') || undefined
    const region =
      request.headers.get('x-vercel-ip-country-region') || undefined

    const [collection, userId] = await Promise.all([
      getTrackingCollection(),
      getSessionUserId(request),
    ])
    const document = {
      ...event,
      timestamp: new Date(event.timestamp),
      country,
      region,
    }
    delete document.userId
    if (userId) document.userId = userId
    await collection.insertOne(document)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Tracking error:', error)
    return NextResponse.json({ error: 'Unknown' }, { status: 500 })
  }
}
