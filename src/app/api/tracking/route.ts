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
  const type = url.searchParams.get('type')
  const deviceId = url.searchParams.get('deviceId')
  const search = url.searchParams.get('search')
  const country = url.searchParams.get('country')
  const region = url.searchParams.get('region')
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {}
    if (type && type !== 'all') filter.type = type
    if (deviceId) filter.deviceId = { $regex: deviceId, $options: 'i' }
    if (country && country !== 'all') filter.country = country
    if (region && region !== 'all') filter.region = region
    if (search) {
      filter.$or = [
        { 'metadata': { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } },
      ]
    }

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
      return NextResponse.json(
        { error: 'Invalid event data' },
        { status: 400 }
      )
    }

    const country = request.headers.get('x-vercel-ip-country') || undefined
    const region = request.headers.get('x-vercel-ip-country-region') || undefined

    const collection = await getTrackingCollection()
    await collection.insertOne({
      ...event,
      timestamp: new Date(event.timestamp),
      country,
      region,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Tracking error:', error)
    return NextResponse.json({ error: 'Unknown' }, { status: 500 })
  }
}
