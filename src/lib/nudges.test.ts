import { describe, expect, it } from 'vitest'
import { getMonthNudge, nudgeMessage, type MonthNudge } from './nudges'
import { groupTrips, type DayMap } from './trips'

function calendar(...ranges: [string, number][]) {
  const dayMap: DayMap = new Map()
  for (const [start, count] of ranges) {
    const [y, m, d] = start.split('-').map(Number)
    for (let i = 0; i < count; i++) {
      const date = new Date(y, m - 1, d + i)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      dayMap.set(key, ['ES'])
    }
  }
  return { dayMap, trips: groupTrips(dayMap) }
}

function nudgeFor(todayKey: string, ...ranges: [string, number][]) {
  const nudge = getMonthNudge(calendar(...ranges), todayKey)
  expect(nudge).not.toBeNull()
  return nudge as MonthNudge
}

describe('getMonthNudge', () => {
  it('compares the last two full months', () => {
    const nudge = nudgeFor(
      '2026-11-12',
      ['2026-09-02', 19],
      ['2026-10-24', 2],
      ['2026-11-06', 3]
    )
    expect(nudge.earlier).toEqual({ year: 2026, month: 8, days: 19 })
    expect(nudge.later).toEqual({ year: 2026, month: 9, days: 2 })
    expect(nudge.direction).toBe('down')
    expect(nudge.ratio).toBe(9.5)
    expect(nudgeMessage(nudge)).toBe(
      'In September you travelled 10× more than in October.'
    )
  })

  it('handles the turn of the year', () => {
    const nudge = nudgeFor('2026-01-15', ['2025-11-10', 4])
    expect(nudge.earlier).toMatchObject({ year: 2025, month: 10, days: 4 })
    expect(nudge.later).toMatchObject({ year: 2025, month: 11, days: 0 })
    expect(nudgeMessage(nudge)).toBe(
      '4 days abroad in November, none in December.'
    )
  })

  it('celebrates a busier month', () => {
    const nudge = nudgeFor('2026-11-02', ['2026-09-05', 2], ['2026-10-01', 5])
    expect(nudge.direction).toBe('up')
    expect(nudgeMessage(nudge)).toBe(
      'October beat September: 2.5× the days abroad.'
    )
  })

  it('calls close months about even instead of a 1× difference', () => {
    const nudge = nudgeFor('2026-11-02', ['2026-09-05', 5], ['2026-10-01', 6])
    expect(nudge.direction).toBe('flat')
    expect(nudgeMessage(nudge)).toBe(
      'September and October were about even: 5 and 6 days abroad.'
    )
  })

  it('says when both months were quiet', () => {
    expect(nudgeMessage(nudgeFor('2026-11-12'))).toBe(
      'No trips in September or October.'
    )
  })

  it('stays quiet over months logged back to back, like a home country', () => {
    expect(
      getMonthNudge(calendar(['2026-01-01', 320]), '2026-11-20')
    ).toBeNull()
  })

  it('still compares months after a long stay has ended', () => {
    expect(
      getMonthNudge(
        calendar(['2026-01-01', 120], ['2026-10-03', 4]),
        '2026-11-20'
      )
    ).toMatchObject({ direction: 'up' })
  })
})
