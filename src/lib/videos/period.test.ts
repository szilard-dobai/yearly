import { describe, expect, it } from 'vitest'
import { daysInPeriod, keepsEnoughDays, periodKey } from './period'

describe('periodKey', () => {
  it('names a year or a month', () => {
    expect(periodKey({ pack: 'year', year: 2026 })).toBe('2026')
    expect(periodKey({ pack: 'month', year: 2026, month: 5 })).toBe('2026-06')
  })
})

describe('daysInPeriod', () => {
  const days = {
    '2025-12-31': ['FR'],
    '2026-06-01': ['IT'],
    '2026-07-01': ['GB'],
  }

  it('keeps the days in the year or month', () => {
    expect(
      Object.keys(daysInPeriod(days, { pack: 'year', year: 2026 }))
    ).toEqual(['2026-06-01', '2026-07-01'])
    expect(
      Object.keys(daysInPeriod(days, { pack: 'month', year: 2026, month: 5 }))
    ).toEqual(['2026-06-01'])
  })
})

describe('keepsEnoughDays', () => {
  const first: Record<string, string[]> = Object.fromEntries(
    Array.from({ length: 10 }, (_, i) => [
      `2026-03-${String(i + 1).padStart(2, '0')}`,
      ['FR'],
    ])
  )

  it('allows keeping 8 of 10 days, plus any new ones', () => {
    const next: Record<string, string[]> = { ...first, '2026-12-24': ['AT'] }
    delete next['2026-03-01']
    delete next['2026-03-02']

    expect(keepsEnoughDays(first, next)).toBe(true)
  })

  it('refuses keeping 7 of 10 days', () => {
    const next: Record<string, string[]> = { ...first }
    delete next['2026-03-01']
    delete next['2026-03-02']
    delete next['2026-03-03']

    expect(keepsEnoughDays(first, next)).toBe(false)
  })

  it('counts a changed country on the same day as kept', () => {
    expect(
      keepsEnoughDays({ '2026-03-01': ['FR'] }, { '2026-03-01': ['DE'] })
    ).toBe(true)
  })
})
