import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveCalendarData,
  loadCalendarData,
  clearCalendarData,
  isLocalStorageAvailable,
} from './storage'
import type { CalendarData } from './types'

describe('storage utilities', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('saveCalendarData and loadCalendarData', () => {
    it('should save and load calendar data', () => {
      const data: CalendarData = {
        visits: [
          {
            id: '1',
            countryCode: 'US',
            date: new Date('2023-05-15'),
          },
        ],
      }

      saveCalendarData(data)
      const loaded = loadCalendarData()

      expect(loaded).not.toBeNull()
      expect(loaded?.visits).toHaveLength(1)
      expect(loaded?.visits[0].countryCode).toBe('US')
    })

    it('should return null when no data exists', () => {
      const loaded = loadCalendarData()
      expect(loaded).toBeNull()
    })

    it('should handle multiple visits', () => {
      const data: CalendarData = {
        visits: [
          {
            id: '1',
            countryCode: 'US',
            date: new Date('2023-05-15'),
          },
          {
            id: '2',
            countryCode: 'FR',
            date: new Date('2023-05-16'),
          },
        ],
      }

      saveCalendarData(data)
      const loaded = loadCalendarData()

      expect(loaded?.visits).toHaveLength(2)
      expect(loaded?.visits[0].countryCode).toBe('US')
      expect(loaded?.visits[1].countryCode).toBe('FR')
    })

    it('should load calendars covering several years of trips', () => {
      const visits = Array.from({ length: 366 * 2 * 3 }, (_, index) => ({
        id: `${index}`,
        countryCode: index % 2 === 0 ? 'FR' : 'DE',
        date: new Date(2024, 0, 1 + Math.floor(index / 2)),
      }))

      saveCalendarData({ visits })

      expect(loadCalendarData()?.visits).toHaveLength(visits.length)
    })

    it('should preserve date objects', () => {
      const originalDate = new Date('2023-05-15T10:30:00')
      const data: CalendarData = {
        visits: [
          {
            id: '1',
            countryCode: 'US',
            date: originalDate,
          },
        ],
      }

      saveCalendarData(data)
      const loaded = loadCalendarData()

      expect(loaded?.visits[0].date).toBeInstanceOf(Date)
      expect(loaded?.visits[0].date.toISOString()).toBe(
        originalDate.toISOString()
      )
    })
  })

  describe('clearCalendarData', () => {
    it('should clear saved data', () => {
      const data: CalendarData = {
        visits: [
          {
            id: '1',
            countryCode: 'US',
            date: new Date('2023-05-15'),
          },
        ],
      }

      saveCalendarData(data)
      expect(loadCalendarData()).not.toBeNull()

      clearCalendarData()
      expect(loadCalendarData()).toBeNull()
    })

    it('should not throw when clearing empty storage', () => {
      expect(() => clearCalendarData()).not.toThrow()
    })
  })

  describe('loadCalendarData with invalid stored data', () => {
    const store = (value: string) =>
      localStorage.setItem('countries-in-year', value)

    it('should return null for invalid JSON', () => {
      store('invalid json')
      expect(loadCalendarData()).toBeNull()
    })

    it('should return null for malformed data structure', () => {
      store(JSON.stringify({ wrong: 'structure' }))
      expect(loadCalendarData()).toBeNull()
    })

    it('should return null for missing required fields', () => {
      store(JSON.stringify({ visits: [{ id: '1' }] }))
      expect(loadCalendarData()).toBeNull()
    })

    it('should return null for invalid date', () => {
      store(
        JSON.stringify({
          visits: [{ id: '1', countryCode: 'US', date: 'not-a-date' }],
        })
      )
      expect(loadCalendarData()).toBeNull()
    })
  })

  describe('isLocalStorageAvailable', () => {
    it('should return true when localStorage is available', () => {
      expect(isLocalStorageAvailable()).toBe(true)
    })
  })

  describe('round-trip data integrity', () => {
    it('should maintain data integrity through save/load cycle', () => {
      const originalData: CalendarData = {
        visits: [
          {
            id: 'test-123',
            countryCode: 'US',
            date: new Date('2023-05-15T10:30:00Z'),
          },
          {
            id: 'test-456',
            countryCode: 'FR',
            date: new Date('2023-06-20T14:45:00Z'),
          },
        ],
      }

      saveCalendarData(originalData)
      const loaded = loadCalendarData()

      expect(loaded?.visits).toHaveLength(originalData.visits.length)
      loaded?.visits.forEach((visit, index) => {
        expect(visit.id).toBe(originalData.visits[index].id)
        expect(visit.countryCode).toBe(originalData.visits[index].countryCode)
        expect(visit.date.toISOString()).toBe(
          originalData.visits[index].date.toISOString()
        )
      })
    })
  })
})
