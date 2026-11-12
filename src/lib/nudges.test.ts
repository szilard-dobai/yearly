import { describe, expect, it } from 'vitest'
import { getMonthNudge, nudgeMessage } from './nudges'
import type { DayMap } from './trips'

function dayMap(...ranges: [string, number][]): DayMap {
  const map: DayMap = new Map()
  for (const [start, count] of ranges) {
    const [y, m, d] = start.split('-').map(Number)
    for (let i = 0; i < count; i++) {
      const date = new Date(y, m - 1, d + i)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      map.set(key, ['ES'])
    }
  }
  return map
}

describe('getMonthNudge', () => {
  it('compares the last two full months', () => {
    const nudge = getMonthNudge(
      dayMap(['2026-09-02', 19], ['2026-10-24', 2], ['2026-11-06', 3]),
      '2026-11-12'
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
    const nudge = getMonthNudge(dayMap(['2025-11-10', 4]), '2026-01-15')
    expect(nudge.earlier).toMatchObject({ year: 2025, month: 10, days: 4 })
    expect(nudge.later).toMatchObject({ year: 2025, month: 11, days: 0 })
    expect(nudgeMessage(nudge)).toBe(
      '4 days abroad in November, none in December.'
    )
  })

  it('celebrates a busier month', () => {
    const nudge = getMonthNudge(
      dayMap(['2026-09-05', 2], ['2026-10-01', 5]),
      '2026-11-02'
    )
    expect(nudge.direction).toBe('up')
    expect(nudgeMessage(nudge)).toBe(
      'October beat September: 2.5× the days abroad.'
    )
  })

  it('says when both months were quiet', () => {
    expect(nudgeMessage(getMonthNudge(new Map(), '2026-11-12'))).toBe(
      'No trips in September or October.'
    )
  })
})
