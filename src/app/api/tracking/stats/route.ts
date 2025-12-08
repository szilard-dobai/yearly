import type { TrackingEventType } from '@/lib/tracking/types'
import {
  fetchAllEvents,
  filterEvents,
  isAuthenticated,
  validateSameOrigin,
} from '@/lib/tracking/api'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const forbidden = validateSameOrigin(request)
  if (forbidden) return forbidden

  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const type = url.searchParams.get('type') as TrackingEventType | null
  const deviceId = url.searchParams.get('deviceId')
  const search = url.searchParams.get('search')
  const country = url.searchParams.get('country')
  const region = url.searchParams.get('region')

  try {
    const allEvents = await fetchAllEvents()

    const filteredEvents = filterEvents(
      allEvents,
      type ?? undefined,
      deviceId ?? undefined,
      search ?? undefined,
      country ?? undefined,
      region ?? undefined
    )

    const countries = [
      ...new Set(allEvents.map((e) => e.country).filter(Boolean)),
    ].sort() as string[]
    const regions = [
      ...new Set(allEvents.map((e) => e.region).filter(Boolean)),
    ].sort() as string[]

    return NextResponse.json({
      total: allEvents.length,
      filtered: filteredEvents.length,
      uniqueDevices: new Set(allEvents.map((e) => e.deviceId)).size,
      filteredUniqueDevices: new Set(filteredEvents.map((e) => e.deviceId)).size,
      eventTypes: new Set(allEvents.map((e) => e.type)).size,
      filteredEventTypes: new Set(filteredEvents.map((e) => e.type)).size,
      uniqueCountries: countries.length,
      filteredUniqueCountries: new Set(
        filteredEvents.map((e) => e.country).filter(Boolean)
      ).size,
      countries,
      regions,
    })
  } catch (error) {
    console.error('Failed to fetch stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
