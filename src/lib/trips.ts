import dayjs from 'dayjs'
import { getCountryByCode } from './countries'
import { toDayKey } from './selection'
import type { CountryVisit } from './types'

export type DayMap = Map<string, string[]>

export interface Trip {
  start: string
  end: string
  days: string[]
  countries: string[]
}

export type TripStatus =
  | {
      kind: 'during'
      trip: Trip
      country: string
      dayNumber: number
      totalDays: number
    }
  | { kind: 'upcoming'; trip: Trip; daysUntil: number }
  | { kind: 'none' }

export function addDays(dayKey: string, days: number): string {
  return dayjs(dayKey).add(days, 'day').format('YYYY-MM-DD')
}

export function daysBetween(fromKey: string, toKey: string): number {
  return dayjs(toKey).diff(dayjs(fromKey), 'day')
}

export function buildDayMap(visits: CountryVisit[]): DayMap {
  const map: DayMap = new Map()
  for (const visit of visits) {
    const key = toDayKey(visit.date)
    const codes = map.get(key) ?? []
    if (!codes.includes(visit.countryCode)) codes.push(visit.countryCode)
    map.set(key, codes)
  }
  return new Map([...map.entries()].sort(([a], [b]) => (a < b ? -1 : 1)))
}

export function groupTrips(dayMap: DayMap): Trip[] {
  const trips: Trip[] = []
  for (const [day, codes] of dayMap) {
    const last = trips.at(-1)
    const trip =
      last && addDays(last.end, 1) === day
        ? last
        : { start: day, end: day, days: [], countries: [] }
    if (trip !== last) trips.push(trip)
    trip.end = day
    trip.days.push(day)
    for (const code of codes) {
      if (!trip.countries.includes(code)) trip.countries.push(code)
    }
  }
  return trips
}

export function getTrips(visits: CountryVisit[]): {
  dayMap: DayMap
  trips: Trip[]
} {
  const dayMap = buildDayMap(visits)
  return { dayMap, trips: groupTrips(dayMap) }
}

export function getUpcomingTrips(trips: Trip[], todayKey: string): Trip[] {
  return trips.filter((trip) => trip.start > todayKey)
}

export function getTripStatus(
  trips: Trip[],
  dayMap: DayMap,
  todayKey: string
): TripStatus {
  const current = trips.find(
    (trip) => trip.start <= todayKey && trip.end >= todayKey
  )
  if (current) {
    const codes = dayMap.get(todayKey) ?? current.countries
    return {
      kind: 'during',
      trip: current,
      country: codes.at(-1) ?? current.countries[0],
      dayNumber: current.days.indexOf(todayKey) + 1,
      totalDays: current.days.length,
    }
  }
  const next = getUpcomingTrips(trips, todayKey)[0]
  if (next) {
    return {
      kind: 'upcoming',
      trip: next,
      daysUntil: daysBetween(todayKey, next.start),
    }
  }
  return { kind: 'none' }
}

export function countryName(code: string): string {
  return getCountryByCode(code)?.name ?? code
}

export function tripName(trip: Trip): string {
  const names = trip.countries.map(countryName)
  if (names.length <= 2) return names.join(' & ')
  return `${names.slice(0, -1).join(', ')} & ${names.at(-1)}`
}

export function formatDay(dayKey: string): string {
  return dayjs(dayKey).format('D MMM')
}

export function formatDayRange(start: string, end: string): string {
  const a = dayjs(start)
  const b = dayjs(end)
  if (start === end) return a.format('D MMM')
  if (a.month() === b.month() && a.year() === b.year()) {
    return `${a.format('D')}–${b.format('D MMM')}`
  }
  return `${a.format('D MMM')} – ${b.format('D MMM')}`
}

export function pluralDays(count: number): string {
  return `${count} ${count === 1 ? 'day' : 'days'}`
}
