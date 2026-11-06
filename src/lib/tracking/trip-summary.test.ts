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
      visitCount: 4,
      dayCount: 3,
      countryCount: 3,
      countryCodes: ['GR', 'JP', 'TR'],
    })
    expect(JSON.stringify(summary)).not.toMatch(/\d{4}-\d{2}-\d{2}/)
  })

  it('sorts country codes so their order says nothing about when you went', () => {
    const later = summarizeTrips(
      [
        { countryCode: 'US', day: '2026-01-05' },
        { countryCode: 'AT', day: '2026-12-05' },
      ],
      2026
    )

    expect(later.countryCodes).toEqual(['AT', 'US'])
  })

  it('handles a year without trips', () => {
    expect(summarizeTrips([], 2026)).toEqual({
      year: 2026,
      visitCount: 0,
      dayCount: 0,
      countryCount: 0,
      countryCodes: [],
    })
  })
})

describe('dayKeyFromStoredDate', () => {
  it('recovers the local day from midnight stored in UTC', () => {
    expect(dayKeyFromStoredDate('2025-12-31T22:00:00.000Z')).toBe('2026-01-01')
    expect(dayKeyFromStoredDate('2026-01-01T05:00:00.000Z')).toBe('2026-01-01')
    expect(dayKeyFromStoredDate('2026-07-19T21:00:00.000Z')).toBe('2026-07-20')
  })
})
