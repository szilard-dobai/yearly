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

  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  const deviceId = url.searchParams.get('deviceId')
  const search = url.searchParams.get('search')
  const country = url.searchParams.get('country')
  const region = url.searchParams.get('region')

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
        { metadata: { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } },
      ]
    }

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
      collection.distinct('country').then((arr) =>
        arr.filter(Boolean).sort() as string[]
      ),
      collection.distinct('region').then((arr) =>
        arr.filter(Boolean).sort() as string[]
      ),
      collection.distinct('country', filter).then((arr) =>
        arr.filter(Boolean)
      ),
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
