import { afterEach, describe, expect, it, vi } from 'vitest'
import { toDayKey } from './selection'
import type { CountryVisit } from './types'
import {
  addCountryToDays,
  getLocaleCountryCode,
  removeCountryFromDays,
  suggestCountries,
  summarizeDays,
} from './visits'

let nextId = 0
const visit = (
  countryCode: string,
  month: number,
  day: number
): CountryVisit => ({
  id: `v${nextId++}`,
  countryCode,
  date: new Date(2026, month, day),
})

const days = (month: number, from: number, to: number) =>
  Array.from(
    { length: to - from + 1 },
    (_, i) => new Date(2026, month, from + i)
  )

describe('addCountryToDays', () => {
  it('adds the country to every day', () => {
    const result = addCountryToDays([], 'FR', days(2, 1, 3))

    expect(result.added).toBe(3)
    expect(result.visits.map((v) => toDayKey(v.date))).toEqual([
      '2026-03-01',
      '2026-03-02',
      '2026-03-03',
    ])
    expect(new Set(result.visits.map((v) => v.id)).size).toBe(3)
  })

  it('skips days that already have the country instead of failing', () => {
    const existing = [visit('FR', 2, 2)]
    const result = addCountryToDays(existing, 'FR', days(2, 1, 3))

    expect(result.added).toBe(2)
    expect(result.skippedExisting).toBe(1)
    expect(result.visits).toHaveLength(3)
  })

  it('skips days that already have two countries', () => {
    const existing = [visit('FR', 2, 2), visit('IT', 2, 2)]
    const result = addCountryToDays(existing, 'ES', days(2, 1, 3))

    expect(result.added).toBe(2)
    expect(result.skippedFull).toBe(1)
  })

  it('adds a second country to a travel day', () => {
    const existing = [visit('FR', 2, 2)]
    const result = addCountryToDays(existing, 'IT', days(2, 2, 2))

    expect(result.added).toBe(1)
    expect(result.visits).toHaveLength(2)
  })

  it('stores visits at the start of the day', () => {
    const result = addCountryToDays([], 'FR', [new Date(2026, 2, 1, 15, 30)])
    expect(result.visits[0].date).toEqual(new Date(2026, 2, 1))
  })

  it('does not mutate the input', () => {
    const existing = [visit('FR', 2, 2)]
    addCountryToDays(existing, 'IT', days(2, 1, 3))
    expect(existing).toHaveLength(1)
  })
})

describe('removeCountryFromDays', () => {
  const existing = [
    visit('FR', 2, 1),
    visit('FR', 2, 2),
    visit('IT', 2, 2),
    visit('FR', 2, 5),
  ]

  it('removes only the given country on the given days', () => {
    const result = removeCountryFromDays(existing, days(2, 1, 2), 'FR')

    expect(result.removed).toBe(2)
    expect(result.visits.map((v) => v.countryCode)).toEqual(['IT', 'FR'])
  })

  it('removes every country on the given days when no country is given', () => {
    const result = removeCountryFromDays(existing, days(2, 2, 2))

    expect(result.removed).toBe(2)
    expect(result.visits).toHaveLength(2)
  })

  it('reports nothing removed when the days are empty', () => {
    expect(removeCountryFromDays(existing, days(2, 10, 12)).removed).toBe(0)
  })
})

describe('summarizeDays', () => {
  it('counts countries, empty days and full days in the range', () => {
    const existing = [
      visit('FR', 2, 1),
      visit('FR', 2, 2),
      visit('IT', 2, 2),
      visit('IT', 2, 9),
    ]
    const summary = summarizeDays(existing, days(2, 1, 4))

    expect(summary.countries).toEqual([
      { countryCode: 'FR', days: 2 },
      { countryCode: 'IT', days: 1 },
    ])
    expect(summary.emptyDays.map(toDayKey)).toEqual([
      '2026-03-03',
      '2026-03-04',
    ])
    expect(summary.fullDays).toBe(1)
  })
})

describe('suggestCountries', () => {
  it('puts the countries just before and after the selection first', () => {
    const existing = [
      ...Array.from({ length: 10 }, (_, i) => visit('GB', 0, i + 1)),
      visit('FR', 2, 4),
      visit('IT', 2, 11),
    ]

    expect(
      suggestCountries({ visits: existing, days: days(2, 5, 10), year: 2026 })
    ).toEqual(['FR', 'IT', 'GB'])
  })

  it('orders the rest by days spent this year, then other years', () => {
    const existing = [
      visit('ES', 0, 1),
      visit('PT', 0, 2),
      visit('PT', 0, 3),
      { id: 'old', countryCode: 'JP', date: new Date(2025, 5, 1) },
    ]

    expect(
      suggestCountries({ visits: existing, days: days(5, 1, 2), year: 2026 })
    ).toEqual(['PT', 'ES', 'JP'])
  })

  it('falls back to the given countries and skips invalid codes', () => {
    expect(
      suggestCountries({
        visits: [],
        days: days(5, 1, 1),
        year: 2026,
        fallback: [null, 'ZZ', 'GB', 'GB'],
      })
    ).toEqual(['GB'])
  })

  it('respects the limit', () => {
    const existing = ['FR', 'IT', 'ES', 'PT', 'DE'].map((code, i) =>
      visit(code, 0, i + 1)
    )
    expect(
      suggestCountries({
        visits: existing,
        days: days(5, 1, 1),
        year: 2026,
        limit: 3,
      })
    ).toHaveLength(3)
  })
})

describe('getLocaleCountryCode', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reads the region from the browser language', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-GB', 'en'])
    expect(getLocaleCountryCode()).toBe('GB')
  })

  it('skips languages without a region', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['fr', 'fr-CA'])
    expect(getLocaleCountryCode()).toBe('CA')
  })

  it('returns null when no language has a known region', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en'])
    expect(getLocaleCountryCode()).toBeNull()
  })
})
