import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getSavedReminder, saveReminder } from './storage'

describe('reminder storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('remembers how the reminder was set for each year', () => {
    saveReminder(2026, 'email')
    saveReminder(2027, 'google')

    expect(getSavedReminder(2026)).toBe('email')
    expect(getSavedReminder(2027)).toBe('google')
    expect(getSavedReminder(2028)).toBeNull()
  })

  it('ignores unreadable or unknown values', () => {
    localStorage.setItem('yearly_year_end_reminder', '{not json')
    expect(getSavedReminder(2026)).toBeNull()

    localStorage.setItem(
      'yearly_year_end_reminder',
      JSON.stringify({ 2026: 'carrier-pigeon' })
    )
    expect(getSavedReminder(2026)).toBeNull()
  })

  it('does not throw when storage is unavailable', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })

    expect(() => saveReminder(2026, 'ics')).not.toThrow()
    expect(getSavedReminder(2026)).toBeNull()
  })
})
