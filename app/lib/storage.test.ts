import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveCalendarData,
  loadCalendarData,
  clearCalendarData,
  exportToJSON,
  importFromJSON,
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

  describe('exportToJSON', () => {
    it('should export calendar data as JSON string', () => {
      const data: CalendarData = {
        visits: [
          {
            id: '1',
            countryCode: 'US',
            date: new Date('2023-05-15'),
          },
        ],
      }

      const json = exportToJSON(data)
      expect(typeof json).toBe('string')
      expect(json).toContain('US')
    })

    it('should be parseable JSON', () => {
      const data: CalendarData = {
        visits: [
          {
            id: '1',
            countryCode: 'US',
            date: new Date('2023-05-15'),
          },
        ],
      }

      const json = exportToJSON(data)
      expect(() => JSON.parse(json)).not.toThrow()
    })

    it('should handle empty visits array', () => {
      const data: CalendarData = {
        visits: [],
      }

      const json = exportToJSON(data)
      const parsed = JSON.parse(json)
      expect(parsed.visits).toEqual([])
    })
  })

  describe('importFromJSON', () => {
    it('should import valid JSON', () => {
      const data: CalendarData = {
        visits: [
          {
            id: '1',
            countryCode: 'US',
            date: new Date('2023-05-15'),
          },
        ],
      }

      const json = exportToJSON(data)
      const imported = importFromJSON(json)

      expect(imported).not.toBeNull()
      expect(imported?.visits).toHaveLength(1)
      expect(imported?.visits[0].countryCode).toBe('US')
    })

    it('should return null for invalid JSON', () => {
      const imported = importFromJSON('invalid json')
      expect(imported).toBeNull()
    })

    it('should return null for malformed data structure', () => {
      const badJson = JSON.stringify({ wrong: 'structure' })
      const imported = importFromJSON(badJson)
      expect(imported).toBeNull()
    })

    it('should return null for missing required fields', () => {
      const badJson = JSON.stringify({
        visits: [{ id: '1' }],
      })
      const imported = importFromJSON(badJson)
      expect(imported).toBeNull()
    })

    it('should return null for invalid date', () => {
      const badJson = JSON.stringify({
        visits: [
          {
            id: '1',
            countryCode: 'US',
            date: 'not-a-date',
          },
        ],
      })
      const imported = importFromJSON(badJson)
      expect(imported).toBeNull()
    })

    it('should convert date strings back to Date objects', () => {
      const data: CalendarData = {
        visits: [
          {
            id: '1',
            countryCode: 'US',
            date: new Date('2023-05-15'),
          },
        ],
      }

      const json = exportToJSON(data)
      const imported = importFromJSON(json)

      expect(imported?.visits[0].date).toBeInstanceOf(Date)
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

    it('should maintain data integrity through export/import cycle', () => {
      const originalData: CalendarData = {
        visits: [
          {
            id: 'test-123',
            countryCode: 'DE',
            date: new Date('2023-07-10'),
          },
        ],
      }

      const json = exportToJSON(originalData)
      const imported = importFromJSON(json)

      expect(imported?.visits[0].id).toBe(originalData.visits[0].id)
      expect(imported?.visits[0].countryCode).toBe(
        originalData.visits[0].countryCode
      )
      expect(imported?.visits[0].date.toDateString()).toBe(
        originalData.visits[0].date.toDateString()
      )
    })
  })
})
