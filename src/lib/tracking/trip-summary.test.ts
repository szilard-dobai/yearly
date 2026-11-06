import { calculateAverageTripLength } from '@/lib/statistics'
import type { CountryVisit } from '@/lib/types'
import { describe, expect, it } from 'vitest'
import {
  dayKeyFromStoredDate,
  summarizeCalendar,
  summarizeTrips,
} from './trip-summary'

describe('summarizeCalendar', () => {
  it('counts the year’s trips without any dates', () => {
    const summary = summarizeCalendar(
      {
        visits: [
          { id: '1', countryCode: 'TR', date: new Date(2026, 6, 20) },
          { id: '2', countryCode: 'GR', date: new Date(2026, 6, 20) },
          { id: '3', countryCode: 'GR', date: new Date(2026, 6, 19) },
          { id: '4', countryCode: 'JP', date: new Date(2026, 2, 20) },
          { id: '5', countryCode: 'PT', date: new Date(2025, 0, 2) },
        ],
      },
      2026
    )

    expect(summary).toEqual({
      year: 2026,
      dayCount: 3,
      tripCount: 2,
      countryCount: 3,
      countries: [
        { code: 'GR', days: 2 },
        { code: 'JP', days: 1 },
        { code: 'TR', days: 1 },
      ],
    })
    expect(JSON.stringify(summary)).not.toMatch(/\d{4}-\d{2}-\d{2}/)
  })

  it('sorts countries so their order says nothing about when you went', () => {
    const later = summarizeTrips(
      [
        { countryCode: 'US', day: '2026-01-05' },
        { countryCode: 'AT', day: '2026-12-05' },
      ],
      2026
    )

    expect(later.countries.map((c) => c.code)).toEqual(['AT', 'US'])
  })

  it('handles a year without trips', () => {
    expect(summarizeTrips([], 2026)).toEqual({
      year: 2026,
      dayCount: 0,
      tripCount: 0,
      countryCount: 0,
      countries: [],
    })
  })
})

describe('tripCount', () => {
  it('counts consecutive days as one trip, across countries and months', () => {
    const summary = summarizeTrips(
      [
        { countryCode: 'US', day: '2026-01-31' },
        { countryCode: 'CA', day: '2026-02-01' },
        { countryCode: 'US', day: '2026-02-01' },
        { countryCode: 'CA', day: '2026-02-03' },
      ],
      2026
    )

    expect(summary.tripCount).toBe(2)
  })

  it('only counts the part of a trip that falls in the year', () => {
    const days = [
      { countryCode: 'AT', day: '2025-12-30' },
      { countryCode: 'AT', day: '2025-12-31' },
      { countryCode: 'AT', day: '2026-01-01' },
    ]

    expect(summarizeTrips(days, 2025)).toMatchObject({
      dayCount: 2,
      tripCount: 1,
    })
    expect(summarizeTrips(days, 2026)).toMatchObject({
      dayCount: 1,
      tripCount: 1,
    })
  })

  it('matches the average trip length users see in their stats', () => {
    const visits: CountryVisit[] = [
      ['JP', 2, 20],
      ['JP', 2, 21],
      ['KR', 2, 22],
      ['GR', 6, 19],
      ['TR', 6, 19],
      ['TR', 6, 20],
      ['PT', 9, 24],
      ['PT', 9, 25],
      ['PT', 9, 26],
      ['IT', 9, 31],
      ['IT', 10, 1],
      ['IT', 10, 2],
    ].map(([countryCode, month, day], i) => ({
      id: String(i),
      countryCode: countryCode as string,
      date: new Date(2026, month as number, day as number),
    }))

    const summary = summarizeCalendar({ visits }, 2026)

    expect(summary.tripCount).toBe(4)
    expect(summary.dayCount / summary.tripCount).toBe(
      calculateAverageTripLength(visits)
    )
  })
})

describe('dayKeyFromStoredDate', () => {
  it('recovers the local day from midnight stored in UTC', () => {
    expect(dayKeyFromStoredDate('2025-12-31T22:00:00.000Z')).toBe('2026-01-01')
    expect(dayKeyFromStoredDate('2026-01-01T05:00:00.000Z')).toBe('2026-01-01')
    expect(dayKeyFromStoredDate('2026-07-19T21:00:00.000Z')).toBe('2026-07-20')
  })
})
