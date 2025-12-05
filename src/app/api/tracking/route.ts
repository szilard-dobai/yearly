import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'
import type { TrackingEvent } from '@/lib/tracking/types'

export async function POST(request: Request) {
  const secFetchSite = request.headers.get('sec-fetch-site')
  if (secFetchSite !== 'same-origin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const event: TrackingEvent = await request.json()

    if (!event.type || !event.timestamp || !event.deviceId) {
      return NextResponse.json({ error: 'Invalid event data' }, { status: 400 })
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
