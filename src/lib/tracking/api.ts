import type { TrackingEvent } from './types'
import { list } from '@vercel/blob'
import { cookies } from 'next/headers'

export async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

export async function getAllBlobs(prefix: string) {
  const allBlobs: Awaited<ReturnType<typeof list>>['blobs'] = []
  let cursor: string | undefined

  do {
    const result = await list({ prefix, limit: 1000, cursor })
    allBlobs.push(...result.blobs)
    cursor = result.cursor ?? undefined
  } while (cursor)

  return allBlobs
}

export async function fetchAllEvents(): Promise<TrackingEvent[]> {
  const allBlobs = await getAllBlobs('tracking/')
  const events: TrackingEvent[] = await Promise.all(
    allBlobs.map(async (blob) => {
      try {
        const response = await fetch(blob.url)
        return await response.json()
      } catch {
        return null
      }
    })
  ).then((results) => results.filter(Boolean) as TrackingEvent[])

  return events
}

export function filterEvents(
  events: TrackingEvent[],
  type?: string,
  deviceId?: string,
  search?: string
): TrackingEvent[] {
  let result = events

  if (type && type !== 'all') {
    result = result.filter((e) => e.type === type)
  }

  if (deviceId) {
    result = result.filter((e) =>
      e.deviceId.toLowerCase().includes(deviceId.toLowerCase())
    )
  }

  if (search) {
    result = result.filter((e) =>
      JSON.stringify(e.metadata || {})
        .toLowerCase()
        .includes(search.toLowerCase())
    )
  }

  return result
}

export function sortEvents(
  events: TrackingEvent[],
  sortField: 'timestamp' | 'type' | 'deviceId',
  sortOrder: 'asc' | 'desc'
): TrackingEvent[] {
  return [...events].sort((a, b) => {
    let comparison = 0
    if (sortField === 'timestamp') {
      comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    } else if (sortField === 'type') {
      comparison = a.type.localeCompare(b.type)
    } else if (sortField === 'deviceId') {
      comparison = a.deviceId.localeCompare(b.deviceId)
    }
    return sortOrder === 'asc' ? comparison : -comparison
  })
}
