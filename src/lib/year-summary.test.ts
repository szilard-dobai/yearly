import { describe, expect, it } from 'vitest'
import { groupTrips, toDayMap, type DayMap } from './trips'
import { compareHeadline, summarizeYear } from './year-summary'

function dayMap(...ranges: [string, string, number][]): DayMap {
  const map = new Map<string, string[]>()
  for (const [code, start, count] of ranges) {
    const [y, m, d] = start.split('-').map(Number)
    for (let i = 0; i < count; i++) {
      const date = new Date(y, m - 1, d + i)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      map.set(key, [...(map.get(key) ?? []), code])
    }
  }
  return toDayMap(map)
}

const map = dayMap(
  ['ES', '2025-04-17', 5],
  ['PT', '2025-12-30', 4],
  ['JP', '2026-02-14', 8],
  ['ES', '2026-09-02', 13],
  ['PT', '2026-09-14', 7],
  ['FR', '2027-05-01', 3]
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
    expect(summary.months[0]).toBe(2)
    expect(summary.months[8]).toBe(19)
  })

  it('includes a trip that started the year before', () => {
    expect(summary.trips.map((t) => t.start)).toEqual([
      '2025-12-30',
      '2026-02-14',
      '2026-09-02',
    ])
  })

  it('splits first visits from countries seen in earlier years', () => {
    expect(summary.newCountries).toEqual(['JP'])
    expect(summary.returningCountries).toEqual(['ES', 'PT'])
    expect(summary.continents.sort()).toEqual(['AS', 'EU'])
  })

  it('finds the longest trip', () => {
    expect(summary.longestTrip?.days).toHaveLength(19)
  })
})

describe('compareHeadline', () => {
  const y2025 = summarizeYear(map, trips, 2025)
  const y2026 = summarizeYear(map, trips, 2026)
  const y2027 = summarizeYear(map, trips, 2027)

  it('describes a bigger year', () => {
    expect(compareHeadline(y2025, y2026, true)).toBe(
      '2026 was a bigger year: 4.1× the days abroad of 2025, and 1 new country.'
    )
  })

  it('says "already" while the bigger year is still going', () => {
    expect(compareHeadline(y2025, y2026, false)).toBe(
      '2026 is already a bigger year: 4.1× the days abroad of 2025, and 1 new country.'
    )
  })

  it('leaves out new countries when there are none', () => {
    const more = summarizeYear(
      dayMap(['ES', '2025-04-01', 10], ['ES', '2026-04-01', 13]),
      [],
      2026
    )
    const before = summarizeYear(
      dayMap(['ES', '2025-04-01', 10], ['ES', '2026-04-01', 13]),
      [],
      2025
    )
    expect(compareHeadline(before, more, true)).toBe(
      '2026 was a bigger year: 30% more days abroad than 2025.'
    )
  })

  it('describes a quieter year once it is over', () => {
    expect(compareHeadline(y2026, y2027, true)).toBe(
      'A quieter year: 3 days abroad in 2027, down from 29 in 2026.'
    )
  })

  it('does not call a year quieter before it ends', () => {
    expect(compareHeadline(y2026, y2027, false)).toBe(
      '2027 so far: 3 days abroad, against 29 in 2026.'
    )
  })

  it('describes about the same year', () => {
    const same = dayMap(['ES', '2025-04-01', 10], ['IT', '2026-04-01', 11])
    expect(
      compareHeadline(
        summarizeYear(same, [], 2025),
        summarizeYear(same, [], 2026),
        true
      )
    ).toBe('About the same as 2025: 11 days abroad against 10.')
  })
})
