import { describe, expect, it } from 'vitest'
import { groupTrips, type DayMap } from './trips'
import { compareHeadline, summarizeYear } from './year-summary'

function dayMap(...ranges: [string, string, number][]): DayMap {
  const map: DayMap = new Map()
  for (const [code, start, count] of ranges) {
    const [y, m, d] = start.split('-').map(Number)
    for (let i = 0; i < count; i++) {
      const date = new Date(y, m - 1, d + i)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      map.set(key, [...(map.get(key) ?? []), code])
    }
  }
  return new Map([...map.entries()].sort(([a], [b]) => (a < b ? -1 : 1)))
}

const map = dayMap(
  ['ES', '2025-04-17', 5],
  ['PT', '2025-12-30', 4],
  ['JP', '2026-02-14', 8],
  ['ES', '2026-09-02', 13],
  ['PT', '2026-09-14', 7]
)
const trips = groupTrips(map)

describe('summarizeYear', () => {
  const summary = summarizeYear(map, trips, 2026)

  it('counts days, countries and months for one year', () => {
    expect(summary.days).toBe(29)
    expect(summary.countries).toEqual([
      { code: 'ES', days: 13 },
      { code: 'PT', days: 9 },
      { code: 'JP', days: 8 },
    ])
    expect(summary.months[8]).toBe(19)
    expect(summary.busiestMonth).toBe(8)
  })

  it('includes a trip that started the year before', () => {
    expect(summary.trips.map((t) => t.start)).toEqual([
      '2025-12-30',
      '2026-02-14',
      '2026-09-02',
    ])
  })

  it('knows which countries are new that year', () => {
    expect(summary.newCountries).toEqual(['JP'])
    expect(summary.continents.sort()).toEqual(['AS', 'EU'])
  })

  it('finds the longest trip', () => {
    expect(summary.longestTrip?.days).toHaveLength(19)
  })
})

describe('compareHeadline', () => {
  it('describes a bigger year', () => {
    expect(
      compareHeadline(
        summarizeYear(map, trips, 2025),
        summarizeYear(map, trips, 2026)
      )
    ).toBe(
      '2026 was a bigger year: 4.1× the days abroad of 2025, and 1 new country.'
    )
  })

  it('describes a quieter year', () => {
    expect(
      compareHeadline(
        summarizeYear(map, trips, 2026),
        summarizeYear(map, trips, 2027)
      )
    ).toBe('A quieter year: 0 days abroad in 2027, down from 29 in 2026.')
  })
})
