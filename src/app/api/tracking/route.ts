import type { TrackingEventType } from '@/lib/tracking/types'
import {
  fetchAllEvents,
  filterEvents,
  isAuthenticated,
  sortEvents,
} from '@/lib/tracking/api'
import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const type = url.searchParams.get('type') as TrackingEventType | null
  const deviceId = url.searchParams.get('deviceId')
  const search = url.searchParams.get('search')
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
    const allEvents = await fetchAllEvents()

    const filteredEvents = filterEvents(
      allEvents,
      type ?? undefined,
      deviceId ?? undefined,
      search ?? undefined
    )

    const sortedEvents = sortEvents(filteredEvents, sortField, sortOrder)
    const paginatedEvents = sortedEvents.slice(offset, offset + limit)

    return NextResponse.json({
      events: paginatedEvents,
      total: sortedEvents.length,
      hasMore: offset + limit < sortedEvents.length,
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
  const secFetchSite = request.headers.get('sec-fetch-site')
  if (secFetchSite !== 'same-origin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const event = await request.json()

    if (!event.type || !event.timestamp || !event.deviceId) {
      return NextResponse.json(
        { error: 'Invalid event data' },
        { status: 400 }
      )
    }

    const date = new Date(event.timestamp)
    const dateStr = date.toISOString().split('T')[0]
    const timeStr = date.toISOString().replace(/[:.]/g, '-')
    const filename = `tracking/${dateStr}/${event.type}_${timeStr}_${event.deviceId.slice(0, 8)}.json`

    await put(filename, JSON.stringify(event, null, 2), {
      access: 'public',
      contentType: 'application/json',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Tracking error:', error)
    return NextResponse.json({ error: 'Unknown' }, { status: 500 })
  }
}
