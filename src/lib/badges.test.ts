import { describe, expect, it } from 'vitest'
import { computeBadges, newlyEarned, nextBadge } from './badges'
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

function byId(badges: ReturnType<typeof computeBadges>) {
  return Object.fromEntries(badges.map((b) => [b.id, b]))
}

describe('computeBadges', () => {
  const map = dayMap(
    ['ES', '2025-04-17', 5],
    ['FR', '2025-06-06', 4],
    ['GR', '2025-08-10', 9],
    ['IT', '2025-08-18', 3],
    ['PT', '2025-12-30', 4],
    ['JP', '2026-02-14', 8],
    ['TH', '2026-12-05', 3]
  )
  const badges = byId(computeBadges(map, '2026-11-12'))

  it('dates each badge to the day it was reached', () => {
    expect(badges['first-trip'].earnedOn).toBe('2025-04-17')
    expect(badges['two-flags'].earnedOn).toBe('2025-06-06')
    expect(badges['high-five'].earnedOn).toBe('2025-12-30')
    expect(badges['border-hopper'].earnedOn).toBe('2025-08-18')
    expect(badges['new-year-abroad'].earnedOn).toBe('2026-01-01')
    expect(badges['continent-hopper'].earnedOn).toBeNull()
  })

  it('keeps the trip and countries of the day that earned each badge', () => {
    expect(badges['two-flags'].trip).toMatchObject({
      start: '2025-06-06',
      countries: ['FR'],
    })
    expect(badges['border-hopper'].dayCountries).toEqual(['GR', 'IT'])
    expect(badges['border-hopper'].trip?.countries).toEqual(['GR', 'IT'])
  })

  it('counts a trip that crosses countries as one trip', () => {
    expect(badges['grand-tour'].value).toBe(2)
    expect(badges['long-haul'].value).toBe(11)
  })

  it('does not count planned trips, but says which trip unlocks a badge', () => {
    const regular = computeBadges(
      dayMap(
        ['ES', '2026-01-10', 2],
        ['ES', '2026-03-10', 2],
        ['ES', '2026-12-10', 2]
      ),
      '2026-11-12'
    ).find((b) => b.id === 'regular')!
    expect(regular.earnedOn).toBeNull()
    expect(regular.value).toBe(2)
    expect(regular.unlocksOn).toBe('2026-12-10')
  })

  it('finds badges that a change just unlocked', () => {
    const before = computeBadges(dayMap(['ES', '2026-01-10', 2]), '2026-11-12')
    const after = computeBadges(
      dayMap(['ES', '2026-01-10', 2], ['FR', '2026-02-10', 2]),
      '2026-11-12'
    )
    expect(newlyEarned(before, after).map((b) => b.id)).toEqual(['two-flags'])
  })

  it('counts a short trip once it has ended', () => {
    const shortTrips = (map: DayMap) =>
      computeBadges(map, '2026-11-12').find((b) => b.id === 'weekend-warrior')!
    const growing = shortTrips(
      dayMap(
        ['ES', '2026-01-10', 2],
        ['FR', '2026-03-10', 2],
        ['IT', '2026-05-10', 6]
      )
    )
    expect(growing.value).toBe(2)
    expect(growing.earnedOn).toBeNull()
    expect(growing.unlocksOn).toBeNull()

    const planned = shortTrips(
      dayMap(
        ['ES', '2026-01-10', 2],
        ['FR', '2026-03-10', 2],
        ['IT', '2026-11-11', 3]
      )
    )
    expect(planned.value).toBe(2)
    expect(planned.unlocksOn).toBe('2026-11-13')
  })

  it('works through years of back-to-back days', () => {
    const badges = byId(
      computeBadges(dayMap(['RO', '2024-01-01', 1000]), '2026-11-12')
    )
    expect(badges['hundred-club'].earnedOn).toBe('2024-04-09')
    expect(badges['every-month'].earnedOn).toBe('2024-12-01')
    expect(badges['regular'].value).toBe(1)
    expect(badges['long-haul'].value).toBe(14)
  })

  it('picks the closest badge as the next one', () => {
    const next = nextBadge(
      computeBadges(dayMap(['ES', '2026-01-10', 2]), '2026-11-12')
    )
    expect(next?.id).toBe('two-flags')
  })

  it('prefers a badge that a planned trip unlocks', () => {
    const next = nextBadge(
      computeBadges(
        dayMap(
          ['ES', '2026-01-10', 2],
          ['ES', '2026-03-10', 2],
          ['ES', '2026-12-10', 2]
        ),
        '2026-11-12'
      )
    )
    expect(next).toMatchObject({ id: 'regular', unlocksOn: '2026-12-10' })
  })

  it('earns nothing for an empty calendar', () => {
    expect(
      computeBadges(new Map(), '2026-11-12').every((b) => !b.earnedOn)
    ).toBe(true)
  })
})
