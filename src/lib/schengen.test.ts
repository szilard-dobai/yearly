import { describe, expect, it } from 'vitest'
import {
  checkStay,
  countWindow,
  daysPerCountry,
  getSchengenDays,
  getSchengenSummary,
  hasRecentSchengenDays,
} from './schengen'
import type { DayMap } from './trips'

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

describe('getSchengenDays', () => {
  it('keeps days in Schengen countries only, once per day', () => {
    const days = getSchengenDays(
      dayMap(
        ['FR', '2026-06-23', 2],
        ['IT', '2026-06-24', 1],
        ['GB', '2026-06-25', 1]
      )
    )
    expect([...days.keys()]).toEqual(['2026-06-23', '2026-06-24'])
  })
})

describe('countWindow', () => {
  const days = getSchengenDays(dayMap(['ES', '2026-01-01', 10]))

  it('counts the 180 days ending on a date, both ends included', () => {
    expect(countWindow(days, '2026-01-10')).toBe(10)
    expect(countWindow(days, '2026-06-29')).toBe(10)
    expect(countWindow(days, '2026-07-08')).toBe(1)
    expect(countWindow(days, '2026-07-09')).toBe(0)
  })
})

describe('getSchengenSummary', () => {
  const map = dayMap(
    ['FR', '2026-06-18', 7],
    ['IT', '2026-06-24', 7],
    ['HR', '2026-07-20', 7],
    ['ES', '2026-09-02', 13],
    ['PT', '2026-09-14', 7],
    ['CH', '2026-10-24', 2],
    ['TH', '2026-08-07', 4]
  )
  const summary = getSchengenSummary(map, '2026-11-12')

  it('adds up the last 180 days and what is left', () => {
    expect(summary.used).toBe(41)
    expect(summary.left).toBe(49)
    expect(summary.windowStart).toBe('2026-05-17')
    expect(summary.windowDays).toHaveLength(180)
  })

  it('shows days coming back as old trips leave the window', () => {
    expect(summary.projection.map((p) => p.left)).toEqual([49, 62, 69])
  })

  it('breaks days down by country', () => {
    expect(summary.countries[0]).toEqual({ code: 'ES', days: 13 })
  })
})

describe('checkStay', () => {
  it('accepts a stay that fits', () => {
    const result = checkStay(dayMap(['FR', '2026-09-01', 41]), '2026-12-12', 14)
    expect(result.firstOver).toBeNull()
    expect(result.maxUsed).toBeLessThanOrEqual(90)
  })

  it('finds the first day over the limit and the last safe day', () => {
    const result = checkStay(dayMap(['FR', '2026-09-01', 60]), '2026-11-15', 40)
    expect(result.firstOver).toBe('2026-12-15')
    expect(result.lastSafeDay).toBe('2026-12-14')
  })
})

describe('helpers', () => {
  it('only shows the counter to people with Schengen days in the last year', () => {
    const map = dayMap(['FR', '2025-10-01', 3])
    expect(hasRecentSchengenDays(map, '2026-09-30')).toBe(true)
    expect(hasRecentSchengenDays(map, '2026-10-04')).toBe(false)
  })

  it('counts days per country over the last 12 months', () => {
    expect(
      daysPerCountry(
        dayMap(
          ['ES', '2025-10-01', 5],
          ['ES', '2026-04-01', 5],
          ['JP', '2026-02-01', 3]
        ),
        '2026-09-30'
      )
    ).toEqual([
      { code: 'ES', days: 10 },
      { code: 'JP', days: 3 },
    ])
  })
})
