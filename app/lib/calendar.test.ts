import { describe, it, expect } from 'vitest'
import {
  getDaysInYear,
  expandDateRange,
  getVisitsForDate,
  canAddVisitToDate,
  getMonthData,
  getYear,
  isToday,
  formatDate,
} from './calendar'
import type { CountryVisit } from './types'

describe('calendar utilities', () => {
  describe('getDaysInYear', () => {
    it('should return 365 days for non-leap year', () => {
      const days = getDaysInYear(2023)
      expect(days).toHaveLength(365)
    })

    it('should return 366 days for leap year', () => {
      const days = getDaysInYear(2024)
      expect(days).toHaveLength(366)
    })

    it('should return 366 days for year 2000 (leap year)', () => {
      const days = getDaysInYear(2000)
      expect(days).toHaveLength(366)
    })

    it('should return 365 days for year 1900 (not leap year)', () => {
      const days = getDaysInYear(1900)
      expect(days).toHaveLength(365)
    })

    it('should start with January 1st', () => {
      const days = getDaysInYear(2023)
      const firstDay = days[0]
      expect(firstDay.getMonth()).toBe(0)
      expect(firstDay.getDate()).toBe(1)
    })

    it('should end with December 31st', () => {
      const days = getDaysInYear(2023)
      const lastDay = days[days.length - 1]
      expect(lastDay.getMonth()).toBe(11)
      expect(lastDay.getDate()).toBe(31)
    })
  })

  describe('expandDateRange', () => {
    it('should return single date for same start and end', () => {
      const start = new Date('2023-05-15')
      const end = new Date('2023-05-15')
      const dates = expandDateRange(start, end)
      expect(dates).toHaveLength(1)
      expect(dates[0].getDate()).toBe(15)
    })

    it('should return all dates in range', () => {
      const start = new Date('2023-05-15')
      const end = new Date('2023-05-20')
      const dates = expandDateRange(start, end)
      expect(dates).toHaveLength(6)
      expect(dates[0].getDate()).toBe(15)
      expect(dates[5].getDate()).toBe(20)
    })

    it('should handle month boundary', () => {
      const start = new Date('2023-05-30')
      const end = new Date('2023-06-02')
      const dates = expandDateRange(start, end)
      expect(dates).toHaveLength(4)
      expect(dates[0].getMonth()).toBe(4)
      expect(dates[3].getMonth()).toBe(5)
    })

    it('should handle year boundary', () => {
      const start = new Date('2023-12-30')
      const end = new Date('2024-01-02')
      const dates = expandDateRange(start, end)
      expect(dates).toHaveLength(4)
      expect(dates[0].getFullYear()).toBe(2023)
      expect(dates[3].getFullYear()).toBe(2024)
    })
  })

  describe('getVisitsForDate', () => {
    const visits: CountryVisit[] = [
      {
        id: '1',
        countryCode: 'US',
        date: new Date('2023-05-15'),
      },
      {
        id: '2',
        countryCode: 'FR',
        date: new Date('2023-05-15'),
      },
      {
        id: '3',
        countryCode: 'DE',
        date: new Date('2023-05-16'),
      },
    ]

    it('should return visits for specific date', () => {
      const date = new Date('2023-05-15')
      const result = getVisitsForDate(date, visits)
      expect(result).toHaveLength(2)
      expect(result[0].countryCode).toBe('US')
      expect(result[1].countryCode).toBe('FR')
    })

    it('should return empty array for date with no visits', () => {
      const date = new Date('2023-05-20')
      const result = getVisitsForDate(date, visits)
      expect(result).toHaveLength(0)
    })

    it('should handle date with different time', () => {
      const date = new Date('2023-05-15T14:30:00')
      const result = getVisitsForDate(date, visits)
      expect(result).toHaveLength(2)
    })
  })

  describe('canAddVisitToDate', () => {
    it('should return true for date with no visits', () => {
      const date = new Date('2023-05-15')
      const visits: CountryVisit[] = []
      expect(canAddVisitToDate(date, visits)).toBe(true)
    })

    it('should return true for date with one visit', () => {
      const date = new Date('2023-05-15')
      const visits: CountryVisit[] = [
        {
          id: '1',
          countryCode: 'US',
          date: new Date('2023-05-15'),
        },
      ]
      expect(canAddVisitToDate(date, visits)).toBe(true)
    })

    it('should return false for date with two visits', () => {
      const date = new Date('2023-05-15')
      const visits: CountryVisit[] = [
        {
          id: '1',
          countryCode: 'US',
          date: new Date('2023-05-15'),
        },
        {
          id: '2',
          countryCode: 'FR',
          date: new Date('2023-05-15'),
        },
      ]
      expect(canAddVisitToDate(date, visits)).toBe(false)
    })

    it('should return true for date with visits on other days', () => {
      const date = new Date('2023-05-15')
      const visits: CountryVisit[] = [
        {
          id: '1',
          countryCode: 'US',
          date: new Date('2023-05-16'),
        },
        {
          id: '2',
          countryCode: 'FR',
          date: new Date('2023-05-16'),
        },
      ]
      expect(canAddVisitToDate(date, visits)).toBe(true)
    })
  })

  describe('getMonthData', () => {
    it('should return weeks array for January 2023', () => {
      const weeks = getMonthData(2023, 0)
      expect(weeks.length).toBeGreaterThan(0)
      expect(weeks[0]).toHaveLength(7)
    })

    it('should pad with nulls before first day if needed', () => {
      const weeks = getMonthData(2023, 0)
      const firstWeek = weeks[0]
      const firstDay = firstWeek.find((day) => day !== null)
      if (firstDay) {
        expect(firstDay.getDate()).toBe(1)
      }
    })

    it('should pad with nulls after last day', () => {
      const weeks = getMonthData(2023, 0)
      const lastWeek = weeks[weeks.length - 1]
      const lastNonNull = lastWeek.findIndex((day) => day === null)
      if (lastNonNull > 0) {
        expect(lastWeek[lastWeek.length - 1]).toBeNull()
      }
    })

    it('should have 31 days in January', () => {
      const weeks = getMonthData(2023, 0)
      const allDays = weeks.flat().filter((day) => day !== null)
      expect(allDays).toHaveLength(31)
    })

    it('should have 28 days in February 2023', () => {
      const weeks = getMonthData(2023, 1)
      const allDays = weeks.flat().filter((day) => day !== null)
      expect(allDays).toHaveLength(28)
    })

    it('should have 29 days in February 2024 (leap year)', () => {
      const weeks = getMonthData(2024, 1)
      const allDays = weeks.flat().filter((day) => day !== null)
      expect(allDays).toHaveLength(29)
    })
  })

  describe('getYear', () => {
    it('should return year from date', () => {
      const date = new Date('2023-05-15')
      expect(getYear(date)).toBe(2023)
    })

    it('should handle different years', () => {
      expect(getYear(new Date('2024-01-01'))).toBe(2024)
      expect(getYear(new Date('2000-12-31'))).toBe(2000)
    })
  })

  describe('isToday', () => {
    it('should return true for today', () => {
      const today = new Date()
      expect(isToday(today)).toBe(true)
    })

    it('should return false for yesterday', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(isToday(yesterday)).toBe(false)
    })

    it('should return false for tomorrow', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      expect(isToday(tomorrow)).toBe(false)
    })
  })

  describe('formatDate', () => {
    it('should format date with default format', () => {
      const date = new Date('2023-05-15')
      expect(formatDate(date)).toBe('2023-05-15')
    })

    it('should format date with custom format', () => {
      const date = new Date('2023-05-15')
      expect(formatDate(date, 'MMM D, YYYY')).toBe('May 15, 2023')
    })

    it('should format date with day name', () => {
      const date = new Date('2023-05-15')
      expect(formatDate(date, 'dddd, MMMM D, YYYY')).toBe(
        'Monday, May 15, 2023'
      )
    })
  })
})
