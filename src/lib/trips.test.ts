import { describe, expect, it } from 'vitest'
import {
  buildDayMap,
  formatDayRange,
  getTripStatus,
  getTrips,
  getUpcomingTrips,
  groupTrips,
  tripName,
} from './trips'
import type { CountryVisit } from './types'

function visit(countryCode: string, day: string): CountryVisit {
  const [y, m, d] = day.split('-').map(Number)
  return {
    id: `${countryCode}-${day}`,
    countryCode,
    date: new Date(y, m - 1, d),
  }
}

function range(countryCode: string, from: string, to: string) {
  const out: CountryVisit[] = []
  const [y, m, d] = from.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const end = to
  for (;;) {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    out.push(visit(countryCode, key))
    if (key === end) break
    date.setDate(date.getDate() + 1)
  }
  return out
}

describe('buildDayMap', () => {
  it('groups countries by day and keeps the order they were logged in', () => {
    const map = buildDayMap([
      visit('IT', '2026-06-24'),
      visit('FR', '2026-06-23'),
      visit('FR', '2026-06-24'),
    ])
    expect([...map.keys()]).toEqual(['2026-06-23', '2026-06-24'])
    expect(map.get('2026-06-24')).toEqual(['IT', 'FR'])
  })
})

describe('groupTrips', () => {
  it('joins back-to-back days into one trip, across countries and months', () => {
    const trips = groupTrips(
      buildDayMap([
        ...range('FR', '2026-06-28', '2026-06-30'),
        ...range('IT', '2026-07-01', '2026-07-02'),
        ...range('JP', '2026-07-10', '2026-07-11'),
      ])
    )
    expect(trips).toHaveLength(2)
    expect(trips[0]).toMatchObject({
      start: '2026-06-28',
      end: '2026-07-02',
      countries: ['FR', 'IT'],
    })
    expect(trips[0].days).toHaveLength(5)
    expect(trips[1]).toMatchObject({ start: '2026-07-10', countries: ['JP'] })
  })

  it('keeps a trip together over a daylight saving change', () => {
    const { trips } = getTrips(range('PT', '2026-03-27', '2026-03-31'))
    expect(trips).toHaveLength(1)
    expect(trips[0].days).toHaveLength(5)
  })
})

describe('getTripStatus', () => {
  const { dayMap, trips } = getTrips([
    ...range('TH', '2026-12-05', '2026-12-07'),
    ...range('AU', '2026-12-19', '2026-12-28'),
  ])

  it('counts down to the next trip', () => {
    expect(getTripStatus(trips, dayMap, '2026-11-12')).toMatchObject({
      kind: 'upcoming',
      daysUntil: 23,
      trip: { countries: ['TH'] },
    })
  })

  it('says which day of the trip today is', () => {
    expect(getTripStatus(trips, dayMap, '2026-12-22')).toMatchObject({
      kind: 'during',
      country: 'AU',
      dayNumber: 4,
      totalDays: 10,
    })
  })

  it('names the country you end the day in on a travel day', () => {
    const travel = getTrips([
      ...range('FR', '2026-06-20', '2026-06-24'),
      visit('IT', '2026-06-24'),
    ])
    expect(
      getTripStatus(travel.trips, travel.dayMap, '2026-06-24')
    ).toMatchObject({ kind: 'during', country: 'IT' })
  })

  it('returns none once every trip is over', () => {
    expect(getTripStatus(trips, dayMap, '2026-12-30')).toEqual({
      kind: 'none',
    })
  })

  it('lists only trips that have not started yet', () => {
    expect(getUpcomingTrips(trips, '2026-12-06').map((t) => t.start)).toEqual([
      '2026-12-19',
    ])
  })
})

describe('formatting', () => {
  it('names trips by their countries', () => {
    const { trips } = getTrips([
      visit('FR', '2026-06-20'),
      visit('IT', '2026-06-21'),
      visit('CH', '2026-06-22'),
    ])
    expect(tripName(trips[0])).toBe('France, Italy & Switzerland')
  })

  it('shortens date ranges within a month', () => {
    expect(formatDayRange('2026-12-19', '2026-12-28')).toBe('19–28 Dec')
    expect(formatDayRange('2026-06-30', '2026-07-04')).toBe('30 Jun – 4 Jul')
  })
})
