import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'
import type { TrackingEvent } from '@/lib/tracking/types'

export async function POST(request: Request) {
  try {
    const event: TrackingEvent = await request.json()

    // Validate the event has required fields
    if (!event.type || !event.timestamp || !event.deviceId) {
      return NextResponse.json({ error: 'Invalid event data' }, { status: 400 })
    }

    // Create a unique filename based on timestamp and device ID
    const date = new Date(event.timestamp)
    const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
    const timeStr = date.toISOString().replace(/[:.]/g, '-')
    const filename = `tracking/${dateStr}/${event.type}_${timeStr}_${event.deviceId.slice(0, 8)}.json`

    // Store the event in Vercel Blob
    await put(filename, JSON.stringify(event, null, 2), {
      access: 'public',
      contentType: 'application/json',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Tracking error:', error)
    // Return success anyway to not break the client
    return NextResponse.json({ success: true })
  }
}
