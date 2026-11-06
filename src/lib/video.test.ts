import { describe, expect, it } from 'vitest'
import type { CountryVisit } from './types'
import {
  buildMonthVideoData,
  buildYearVideoData,
  dayOfYear,
  daysInYear,
} from './video'

function visit(countryCode: string, y: number, m: number, d: number) {
  return {
    id: `${countryCode}-${y}-${m}-${d}`,
    countryCode,
    date: new Date(y, m - 1, d),
  } satisfies CountryVisit
}

describe('buildYearVideoData', () => {
  it('keeps only the selected year and orders days chronologically', () => {
    const data = buildYearVideoData(
      [
        visit('JP', 2026, 3, 21),
        visit('FR', 2025, 12, 31),
        visit('PT', 2026, 1, 2),
        visit('JP', 2026, 3, 20),
      ],
      2026
    )

    expect(data.year).toBe(2026)
    expect(data.days).toEqual([
      { date: '2026-01-02', codes: ['PT'] },
      { date: '2026-03-20', codes: ['JP'] },
      { date: '2026-03-21', codes: ['JP'] },
    ])
    expect(data.countries).toEqual(['PT', 'JP'])
  })

  it('keeps the calendar order of two countries on one day', () => {
    const data = buildYearVideoData(
      [
        visit('TR', 2026, 7, 20),
        visit('GR', 2026, 7, 20),
        visit('TR', 2026, 7, 20),
      ],
      2026
    )

    expect(data.days).toEqual([{ date: '2026-07-20', codes: ['TR', 'GR'] }])
  })

  it('computes the same stats as the statistics export', () => {
    const data = buildYearVideoData(
      [
        visit('PT', 2026, 1, 2),
        visit('PT', 2026, 1, 3),
        visit('JP', 2026, 3, 20),
        visit('JP', 2026, 3, 21),
        visit('JP', 2026, 3, 22),
        visit('FR', 2025, 6, 1),
      ],
      2026
    )

    expect(data.stats).toMatchObject({
      totalCountries: 2,
      totalDays: 5,
      averageTripLength: 2.5,
      busiestMonth: { month: 2, days: 3 },
      topCountries: [
        { countryCode: 'JP', days: 3 },
        { countryCode: 'PT', days: 2 },
      ],
    })
    expect(data.stats.percentTraveled).toBeCloseTo((5 / 365) * 100)
  })

  it('returns empty data for a year without trips', () => {
    const data = buildYearVideoData([visit('PT', 2025, 1, 2)], 2026)

    expect(data.days).toEqual([])
    expect(data.countries).toEqual([])
    expect(data.stats.busiestMonth).toBeNull()
  })
})

describe('dayOfYear', () => {
  it('counts whole days regardless of daylight saving changes', () => {
    expect(dayOfYear('2026-01-01')).toBe(0)
    expect(dayOfYear('2026-03-29')).toBe(87)
    expect(dayOfYear('2026-03-30')).toBe(88)
    expect(dayOfYear('2026-12-31')).toBe(364)
  })
})

describe('daysInYear', () => {
  it('handles leap years', () => {
    expect(daysInYear(2026)).toBe(365)
    expect(daysInYear(2028)).toBe(366)
  })
})

describe('buildMonthVideoData', () => {
  it('keeps only the selected month and computes its stats', () => {
    const data = buildMonthVideoData(
      [
        visit('JP', 2026, 3, 20),
        visit('JP', 2026, 3, 21),
        visit('KR', 2026, 3, 21),
        visit('GR', 2026, 3, 28),
        visit('PT', 2026, 4, 1),
        visit('JP', 2025, 3, 20),
      ],
      2026,
      2
    )

    expect(data.year).toBe(2026)
    expect(data.month).toBe(2)
    expect(data.days).toEqual([
      { date: '2026-03-20', codes: ['JP'] },
      { date: '2026-03-21', codes: ['JP', 'KR'] },
      { date: '2026-03-28', codes: ['GR'] },
    ])
    expect(data.countries).toEqual(['JP', 'KR', 'GR'])
    expect(data.stats).toMatchObject({
      totalCountries: 3,
      totalDays: 3,
      averageTripLength: 1.5,
      topCountries: [
        { countryCode: 'JP', days: 2 },
        { countryCode: 'KR', days: 1 },
        { countryCode: 'GR', days: 1 },
      ],
    })
    expect(data.stats.percentTraveled).toBeCloseTo((3 / 31) * 100)
  })

  it('lists at most three top countries', () => {
    const data = buildMonthVideoData(
      ['AT', 'BE', 'CH', 'DE'].map((code, i) => visit(code, 2026, 5, i + 1)),
      2026,
      4
    )

    expect(data.stats.topCountries).toHaveLength(3)
  })
})
