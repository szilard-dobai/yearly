import type { CountryVisit } from '@/lib/types'
import { describe, expect, it } from 'vitest'
import {
  calendarDaysSchema,
  fromCalendarDays,
  mergeCalendarDays,
  sameCalendarDays,
  summarizeFirstSync,
  toCalendarDays,
} from './days'

function visit(id: string, countryCode: string, day: string): CountryVisit {
  const [year, month, date] = day.split('-').map(Number)
  return { id, countryCode, date: new Date(year, month - 1, date) }
}

describe('toCalendarDays', () => {
  it('groups visits into local days, keeping their order', () => {
    expect(
      toCalendarDays([
        visit('1', 'FR', '2026-03-10'),
        visit('2', 'DE', '2026-03-10'),
        visit('3', 'IT', '2026-03-11'),
      ])
    ).toEqual({ '2026-03-10': ['FR', 'DE'], '2026-03-11': ['IT'] })
  })

  it('ignores a repeated country on the same day', () => {
    expect(
      toCalendarDays([
        visit('1', 'FR', '2026-03-10'),
        visit('2', 'FR', '2026-03-10'),
      ])
    ).toEqual({ '2026-03-10': ['FR'] })
  })
})

describe('fromCalendarDays', () => {
  it('creates visits at local midnight in the day order given', () => {
    const visits = fromCalendarDays({ '2026-03-10': ['DE', 'FR'] }, [])

    expect(visits.map((v) => v.countryCode)).toEqual(['DE', 'FR'])
    expect(visits[0].date).toEqual(new Date(2026, 2, 10))
    expect(new Set(visits.map((v) => v.id)).size).toBe(2)
  })

  it('reuses existing visits so their IDs stay the same', () => {
    const existing = [visit('keep', 'FR', '2026-03-10')]

    const visits = fromCalendarDays(
      { '2026-03-10': ['FR'], '2026-03-11': ['IT'] },
      existing
    )

    expect(visits[0]).toBe(existing[0])
    expect(visits[1].id).not.toBe('keep')
  })

  it('round-trips with toCalendarDays', () => {
    const days = { '2025-12-31': ['JP'], '2026-01-01': ['JP', 'KR'] }

    expect(toCalendarDays(fromCalendarDays(days, []))).toEqual(days)
  })
})

describe('sameCalendarDays', () => {
  it('compares days and the order of countries', () => {
    expect(sameCalendarDays({ a: ['FR'] }, { a: ['FR'] })).toBe(true)
    expect(sameCalendarDays({ a: ['FR', 'DE'] }, { a: ['DE', 'FR'] })).toBe(
      false
    )
    expect(sameCalendarDays({ a: ['FR'] }, { b: ['FR'] })).toBe(false)
    expect(sameCalendarDays({}, { a: ['FR'] })).toBe(false)
  })
})

describe('mergeCalendarDays', () => {
  const D = '2026-03-10'

  it('combines a device and an account that never synced before', () => {
    expect(
      mergeCalendarDays({}, { [D]: ['FR'] }, { '2026-03-11': ['DE'] })
    ).toEqual({ [D]: ['FR'], '2026-03-11': ['DE'] })
  })

  it('puts both countries on a day each side filled differently', () => {
    expect(mergeCalendarDays({}, { [D]: ['FR'] }, { [D]: ['DE'] })).toEqual({
      [D]: ['FR', 'DE'],
    })
  })

  it('keeps this device first when a day would get more than two countries', () => {
    expect(
      mergeCalendarDays({}, { [D]: ['FR', 'DE'] }, { [D]: ['IT'] })
    ).toEqual({ [D]: ['FR', 'DE'] })
  })

  it('takes changes made only on this device', () => {
    expect(
      mergeCalendarDays({ [D]: ['FR'] }, { [D]: ['FR', 'DE'] }, { [D]: ['FR'] })
    ).toEqual({ [D]: ['FR', 'DE'] })
  })

  it('takes changes made only on another device', () => {
    expect(
      mergeCalendarDays({ [D]: ['FR'] }, { [D]: ['FR'] }, { [D]: ['IT'] })
    ).toEqual({ [D]: ['IT'] })
  })

  it('keeps a removal from this device', () => {
    expect(mergeCalendarDays({ [D]: ['FR'] }, {}, { [D]: ['FR'] })).toEqual({})
  })

  it('keeps a removal from another device', () => {
    expect(mergeCalendarDays({ [D]: ['FR'] }, { [D]: ['FR'] }, {})).toEqual({})
  })

  it('keeps a new order from this device', () => {
    expect(
      mergeCalendarDays(
        { [D]: ['FR', 'DE'] },
        { [D]: ['DE', 'FR'] },
        { [D]: ['FR', 'DE'] }
      )
    ).toEqual({ [D]: ['DE', 'FR'] })
  })

  it('applies a removal here and an addition elsewhere on the same day', () => {
    expect(
      mergeCalendarDays({ [D]: ['FR'] }, {}, { [D]: ['FR', 'DE'] })
    ).toEqual({ [D]: ['DE'] })
  })

  it('leaves days that nobody changed alone', () => {
    const days = { [D]: ['FR'], '2026-03-11': ['DE', 'AT'] }

    expect(mergeCalendarDays(days, days, days)).toEqual(days)
  })
})

describe('calendarDaysSchema', () => {
  it('accepts a valid calendar', () => {
    expect(
      calendarDaysSchema.safeParse({ '2026-03-10': ['FR', 'DE'] }).success
    ).toBe(true)
  })

  it.each([
    [{ '10/03/2026': ['FR'] }],
    [{ '2026-03-10': [] }],
    [{ '2026-03-10': ['FR', 'DE', 'IT'] }],
    [{ '2026-03-10': ['FR', 'FR'] }],
    [{ '2026-03-10': ['FRA'] }],
  ])('rejects %j', (days) => {
    expect(calendarDaysSchema.safeParse(days).success).toBe(false)
  })
})

describe('summarizeFirstSync', () => {
  it('counts the days this device would add to the account', () => {
    expect(
      summarizeFirstSync(
        {
          '2026-03-10': ['FR'],
          '2026-03-11': ['DE'],
          '2026-03-12': ['IT'],
        },
        { '2026-03-10': ['FR'], '2026-03-11': ['AT'], '2026-04-01': ['ES'] }
      )
    ).toEqual({ newDays: 2, accountDays: 3, crowdedDays: 0 })
  })

  it('counts days that would end up with more than two countries', () => {
    expect(
      summarizeFirstSync(
        { '2026-03-10': ['FR', 'DE'] },
        { '2026-03-10': ['IT'] }
      )
    ).toEqual({ newDays: 1, accountDays: 1, crowdedDays: 1 })
  })

  it('finds nothing new when the account already has everything', () => {
    expect(
      summarizeFirstSync(
        { '2026-03-10': ['FR'] },
        { '2026-03-10': ['FR', 'DE'] }
      ).newDays
    ).toBe(0)
  })
})
