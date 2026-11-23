import { buildEventListFilter } from '@/lib/admin/event-filters'
import { getTrackingCollection } from '@/lib/mongodb'
import { isAuthenticated, validateSameOrigin } from '@/lib/tracking/api'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const forbidden = validateSameOrigin(request)
  if (forbidden) return forbidden

  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const filter = buildEventListFilter(new URL(request.url).searchParams)

  try {
    const collection = await getTrackingCollection()

    const [
      total,
      filtered,
      uniqueDevices,
      filteredUniqueDevices,
      eventTypes,
      filteredEventTypes,
      countries,
      regions,
      filteredCountries,
    ] = await Promise.all([
      collection.countDocuments({}),
      collection.countDocuments(filter),
      collection.distinct('deviceId').then((arr) => arr.length),
      collection.distinct('deviceId', filter).then((arr) => arr.length),
      collection.distinct('type').then((arr) => arr.length),
      collection.distinct('type', filter).then((arr) => arr.length),
      collection
        .distinct('country')
        .then((arr) => arr.filter(Boolean).sort() as string[]),
      collection
        .distinct('region')
        .then((arr) => arr.filter(Boolean).sort() as string[]),
      collection.distinct('country', filter).then((arr) => arr.filter(Boolean)),
    ])

    return NextResponse.json({
      total,
      filtered,
      uniqueDevices,
      filteredUniqueDevices,
      eventTypes,
      filteredEventTypes,
      uniqueCountries: countries.length,
      filteredUniqueCountries: filteredCountries.length,
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
