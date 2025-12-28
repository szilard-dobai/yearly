import { describe, it, expect } from 'vitest'
import type { CountryVisit } from './types'
import {
  calculateTotalCountriesVisited,
  calculateTotalVisits,
  calculateVisitsByCountry,
  calculateMostVisitedCountries,
  calculateLeastVisitedCountries,
  calculateMonthlyBreakdown,
  calculateAverageVisitsPerCountry,
  findMostVisitedCountry,
  calculateTotalDaysTraveled,
  calculateDaysByCountry,
  calculateCountriesByDays,
  calculateAverageTripLength,
  calculateBusiestMonth,
  calculatePercentageOfYearTraveled,
} from './statistics'

describe('statistics', () => {
  const mockVisits: CountryVisit[] = [
    { id: '1', countryCode: 'US', date: new Date(2024, 0, 15) },
    { id: '2', countryCode: 'US', date: new Date(2024, 0, 20) },
    { id: '3', countryCode: 'FR', date: new Date(2024, 1, 10) },
    { id: '4', countryCode: 'DE', date: new Date(2024, 2, 5) },
    { id: '5', countryCode: 'US', date: new Date(2024, 3, 12) },
    { id: '6', countryCode: 'FR', date: new Date(2024, 4, 8) },
  ]

  describe('calculateTotalCountriesVisited', () => {
    it('returns 0 for empty array', () => {
      expect(calculateTotalCountriesVisited([])).toBe(0)
    })

    it('returns 1 for single visit', () => {
      const visits: CountryVisit[] = [
        { id: '1', countryCode: 'US', date: new Date(2024, 0, 15) },
      ]
      expect(calculateTotalCountriesVisited(visits)).toBe(1)
    })

    it('returns 1 for multiple visits to same country', () => {
      const visits: CountryVisit[] = [
        { id: '1', countryCode: 'US', date: new Date(2024, 0, 15) },
        { id: '2', countryCode: 'US', date: new Date(2024, 0, 20) },
      ]
      expect(calculateTotalCountriesVisited(visits)).toBe(1)
    })

    it('returns correct count for multiple countries', () => {
      expect(calculateTotalCountriesVisited(mockVisits)).toBe(3) // US, FR, DE
    })
  })

  describe('calculateTotalVisits', () => {
    it('returns 0 for empty array', () => {
      expect(calculateTotalVisits([])).toBe(0)
    })

    it('returns 1 for single visit', () => {
      const visits: CountryVisit[] = [
        { id: '1', countryCode: 'US', date: new Date(2024, 0, 15) },
      ]
      expect(calculateTotalVisits(visits)).toBe(1)
    })

    it('returns total count of separate visits (non-consecutive days)', () => {
      // mockVisits has 6 entries on different dates = 6 separate visits
      expect(calculateTotalVisits(mockVisits)).toBe(6)
    })

    it('counts consecutive days in same country as 1 visit', () => {
      const visits: CountryVisit[] = [
        { id: '1', countryCode: 'UG', date: new Date(2025, 3, 13) }, // Apr 13
        { id: '2', countryCode: 'UG', date: new Date(2025, 3, 14) }, // Apr 14
        { id: '3', countryCode: 'UG', date: new Date(2025, 3, 15) }, // Apr 15
        { id: '4', countryCode: 'UG', date: new Date(2025, 3, 16) }, // Apr 16
        { id: '5', countryCode: 'UG', date: new Date(2025, 3, 17) }, // Apr 17
        { id: '6', countryCode: 'UG', date: new Date(2025, 3, 18) }, // Apr 18
      ]
      // 6 consecutive days in Uganda = 1 visit
      expect(calculateTotalVisits(visits)).toBe(1)
    })

    it('counts overlapping countries on same day as separate visits', () => {
      const visits: CountryVisit[] = [
        { id: '1', countryCode: 'MA', date: new Date(2025, 3, 13) }, // Morocco Apr 13
        { id: '2', countryCode: 'UG', date: new Date(2025, 3, 13) }, // Uganda Apr 13
        { id: '3', countryCode: 'UG', date: new Date(2025, 3, 14) }, // Uganda Apr 14
        { id: '4', countryCode: 'UG', date: new Date(2025, 3, 15) }, // Uganda Apr 15
      ]
      // Morocco on Apr 13 (1 visit) + Uganda from Apr 13-15 (1 visit) = 2 visits
      expect(calculateTotalVisits(visits)).toBe(2)
    })

    it('counts return to same country as separate visit', () => {
      const visits: CountryVisit[] = [
        { id: '1', countryCode: 'MA', date: new Date(2025, 3, 13) }, // Morocco Apr 13
        { id: '2', countryCode: 'UG', date: new Date(2025, 3, 13) }, // Uganda Apr 13
        { id: '3', countryCode: 'UG', date: new Date(2025, 3, 14) }, // Uganda Apr 14
        { id: '4', countryCode: 'UG', date: new Date(2025, 3, 15) }, // Uganda Apr 15
        { id: '5', countryCode: 'MA', date: new Date(2025, 3, 15) }, // Morocco Apr 15
      ]
      // Morocco Apr 13 (1) + Uganda Apr 13-15 (2) + Morocco Apr 15 (3) = 3 visits
      expect(calculateTotalVisits(visits)).toBe(3)
    })

    it('handles gap in consecutive days as separate visits', () => {
      const visits: CountryVisit[] = [
        { id: '1', countryCode: 'UG', date: new Date(2025, 3, 13) }, // Apr 13
        { id: '2', countryCode: 'UG', date: new Date(2025, 3, 14) }, // Apr 14
        { id: '3', countryCode: 'UG', date: new Date(2025, 3, 16) }, // Apr 16 (gap)
        { id: '4', countryCode: 'UG', date: new Date(2025, 3, 17) }, // Apr 17
      ]
      // Uganda Apr 13-14 (1 visit) + Uganda Apr 16-17 (1 visit) = 2 visits
      expect(calculateTotalVisits(visits)).toBe(2)
    })

    it('handles unsorted visits correctly', () => {
      const visits: CountryVisit[] = [
        { id: '3', countryCode: 'UG', date: new Date(2025, 3, 15) }, // Out of order
        { id: '1', countryCode: 'UG', date: new Date(2025, 3, 13) },
        { id: '2', countryCode: 'UG', date: new Date(2025, 3, 14) },
      ]
      // Should sort and count as 1 visit (Apr 13-15)
      expect(calculateTotalVisits(visits)).toBe(1)
    })
  })

  describe('calculateVisitsByCountry', () => {
    it('returns empty map for empty array', () => {
      const result = calculateVisitsByCountry([])
      expect(result.size).toBe(0)
    })

    it('returns correct counts for single country', () => {
      const visits: CountryVisit[] = [
        { id: '1', countryCode: 'US', date: new Date(2024, 0, 15) },
        { id: '2', countryCode: 'US', date: new Date(2024, 0, 20) },
      ]
      const result = calculateVisitsByCountry(visits)
      expect(result.get('US')).toBe(2)
    })

    it('returns correct counts for multiple countries', () => {
      const result = calculateVisitsByCountry(mockVisits)
      expect(result.get('US')).toBe(3)
      expect(result.get('FR')).toBe(2)
      expect(result.get('DE')).toBe(1)
    })
  })

  describe('calculateMostVisitedCountries', () => {
    it('returns empty array for empty visits', () => {
      expect(calculateMostVisitedCountries([])).toEqual([])
    })

    it('returns single country correctly', () => {
      const visits: CountryVisit[] = [
        { id: '1', countryCode: 'US', date: new Date(2024, 0, 15) },
      ]
      const result = calculateMostVisitedCountries(visits)
      expect(result).toEqual([{ countryCode: 'US', count: 1 }])
    })

    it('returns countries sorted by count descending', () => {
      const result = calculateMostVisitedCountries(mockVisits)
      expect(result).toEqual([
        { countryCode: 'US', count: 3 },
        { countryCode: 'FR', count: 2 },
        { countryCode: 'DE', count: 1 },
      ])
    })

    it('respects limit parameter', () => {
      const result = calculateMostVisitedCountries(mockVisits, 2)
      expect(result).toHaveLength(2)
      expect(result).toEqual([
        { countryCode: 'US', count: 3 },
        { countryCode: 'FR', count: 2 },
      ])
    })

    it('returns all countries when limit is 0', () => {
      const result = calculateMostVisitedCountries(mockVisits, 0)
      expect(result).toHaveLength(3)
    })

    it('handles ties in count', () => {
      const visits: CountryVisit[] = [
        { id: '1', countryCode: 'US', date: new Date(2024, 0, 15) },
        { id: '2', countryCode: 'FR', date: new Date(2024, 0, 16) },
        { id: '3', countryCode: 'DE', date: new Date(2024, 0, 17) },
      ]
      const result = calculateMostVisitedCountries(visits)
      expect(result).toHaveLength(3)
      expect(result.every((item) => item.count === 1)).toBe(true)
    })
  })

  describe('calculateLeastVisitedCountries', () => {
    it('returns empty array for empty visits', () => {
      expect(calculateLeastVisitedCountries([])).toEqual([])
    })

    it('returns countries sorted by count ascending', () => {
      const result = calculateLeastVisitedCountries(mockVisits)
      expect(result).toEqual([
        { countryCode: 'DE', count: 1 },
        { countryCode: 'FR', count: 2 },
        { countryCode: 'US', count: 3 },
      ])
    })

    it('respects limit parameter', () => {
      const result = calculateLeastVisitedCountries(mockVisits, 2)
      expect(result).toHaveLength(2)
      expect(result).toEqual([
        { countryCode: 'DE', count: 1 },
        { countryCode: 'FR', count: 2 },
      ])
    })
  })

  describe('calculateMonthlyBreakdown', () => {
    it('returns 12 months with all zeros for empty visits', () => {
      const result = calculateMonthlyBreakdown([], 2024)
      expect(result).toHaveLength(12)
      expect(result.every((month) => month.visitCount === 0)).toBe(true)
      expect(result.every((month) => month.uniqueCountries === 0)).toBe(true)
    })

    it('calculates correct monthly breakdown', () => {
      const result = calculateMonthlyBreakdown(mockVisits, 2024)

      // January: 2 visits (both US)
      expect(result[0]).toEqual({
        month: 0,
        visitCount: 2,
        uniqueCountries: 1,
      })

      // February: 1 visit (FR)
      expect(result[1]).toEqual({
        month: 1,
        visitCount: 1,
        uniqueCountries: 1,
      })

      // March: 1 visit (DE)
      expect(result[2]).toEqual({
        month: 2,
        visitCount: 1,
        uniqueCountries: 1,
      })

      // April: 1 visit (US)
      expect(result[3]).toEqual({
        month: 3,
        visitCount: 1,
        uniqueCountries: 1,
      })

      // May: 1 visit (FR)
      expect(result[4]).toEqual({
        month: 4,
        visitCount: 1,
        uniqueCountries: 1,
      })

      // June-December: 0 visits
      for (let i = 5; i < 12; i++) {
        expect(result[i]).toEqual({
          month: i,
          visitCount: 0,
          uniqueCountries: 0,
        })
      }
    })

    it('counts unique countries per month correctly', () => {
      const visits: CountryVisit[] = [
        { id: '1', countryCode: 'US', date: new Date(2024, 0, 15) },
        { id: '2', countryCode: 'FR', date: new Date(2024, 0, 16) },
        { id: '3', countryCode: 'US', date: new Date(2024, 0, 17) },
      ]
      const result = calculateMonthlyBreakdown(visits, 2024)

      expect(result[0]).toEqual({
        month: 0,
        visitCount: 3,
        uniqueCountries: 2, // US and FR
      })
    })

    it('filters by year correctly', () => {
      const visits: CountryVisit[] = [
        { id: '1', countryCode: 'US', date: new Date(2023, 0, 15) },
        { id: '2', countryCode: 'FR', date: new Date(2024, 0, 16) },
      ]
      const result = calculateMonthlyBreakdown(visits, 2024)

      // Only 2024 visit should be counted
      expect(result[0].visitCount).toBe(1)
      expect(result[0].uniqueCountries).toBe(1)
    })
  })

  describe('calculateAverageVisitsPerCountry', () => {
    it('returns 0 for empty array', () => {
      expect(calculateAverageVisitsPerCountry([])).toBe(0)
    })

    it('returns 1 for single visit', () => {
      const visits: CountryVisit[] = [
        { id: '1', countryCode: 'US', date: new Date(2024, 0, 15) },
      ]
      expect(calculateAverageVisitsPerCountry(visits)).toBe(1)
    })

    it('calculates average correctly', () => {
      // 6 visits across 3 countries = 2 average
      expect(calculateAverageVisitsPerCountry(mockVisits)).toBe(2)
    })

    it('handles non-integer averages', () => {
      const visits: CountryVisit[] = [
        { id: '1', countryCode: 'US', date: new Date(2024, 0, 15) },
        { id: '2', countryCode: 'US', date: new Date(2024, 0, 16) }, // consecutive
        { id: '3', countryCode: 'FR', date: new Date(2024, 0, 17) },
        { id: '4', countryCode: 'FR', date: new Date(2024, 0, 19) }, // gap, new visit
      ]
      // US Jan 15-16 (1 visit) + FR Jan 17 (1 visit) + FR Jan 19 (1 visit) = 3 visits
      // 3 visits across 2 countries = 1.5 average
      expect(calculateAverageVisitsPerCountry(visits)).toBe(1.5)
    })
  })

  describe('findMostVisitedCountry', () => {
    it('returns null for empty array', () => {
      expect(findMostVisitedCountry([])).toBeNull()
    })

    it('returns single country correctly', () => {
      const visits: CountryVisit[] = [
        { id: '1', countryCode: 'US', date: new Date(2024, 0, 15) },
      ]
      expect(findMostVisitedCountry(visits)).toEqual({
        countryCode: 'US',
        count: 1,
      })
    })

    it('returns country with most visits', () => {
      expect(findMostVisitedCountry(mockVisits)).toEqual({
        countryCode: 'US',
        count: 3,
      })
    })

    it('returns first country in case of tie', () => {
      const visits: CountryVisit[] = [
        { id: '1', countryCode: 'US', date: new Date(2024, 0, 15) },
        { id: '2', countryCode: 'FR', date: new Date(2024, 0, 16) },
      ]
      const result = findMostVisitedCountry(visits)
      expect(result?.count).toBe(1)
      expect(['US', 'FR']).toContain(result?.countryCode)
    })
  })

  describe('calculateTotalDaysTraveled', () => {
    it('returns 0 for empty array', () => {
      expect(calculateTotalDaysTraveled([])).toBe(0)
    })

    it('returns correct count of days', () => {
      expect(calculateTotalDaysTraveled(mockVisits)).toBe(6)
    })

    it('counts each unique day', () => {
      const visits: CountryVisit[] = [
        { id: '1', countryCode: 'US', date: new Date(2024, 0, 15) },
        { id: '2', countryCode: 'US', date: new Date(2024, 0, 16) },
        { id: '3', countryCode: 'US', date: new Date(2024, 0, 17) },
      ]
      expect(calculateTotalDaysTraveled(visits)).toBe(3)
    })

    it('counts multiple visits on same day as 1 day', () => {
      const visits: CountryVisit[] = [
        { id: '1', countryCode: 'US', date: new Date(2024, 0, 15) }, // Jan 15
        { id: '2', countryCode: 'FR', date: new Date(2024, 0, 15) }, // Jan 15 (same day, different country)
        { id: '3', countryCode: 'DE', date: new Date(2024, 0, 16) }, // Jan 16
      ]
      // Should be 2 unique days, not 3 visits
      expect(calculateTotalDaysTraveled(visits)).toBe(2)
    })

    it('counts complex scenario with multiple visits per day correctly', () => {
      const visits: CountryVisit[] = [
        { id: '1', countryCode: 'US', date: new Date(2024, 0, 15) }, // Jan 15
        { id: '2', countryCode: 'FR', date: new Date(2024, 0, 15) }, // Jan 15
        { id: '3', countryCode: 'DE', date: new Date(2024, 0, 15) }, // Jan 15
        { id: '4', countryCode: 'IT', date: new Date(2024, 0, 16) }, // Jan 16
        { id: '5', countryCode: 'ES', date: new Date(2024, 0, 16) }, // Jan 16
        { id: '6', countryCode: 'PT', date: new Date(2024, 0, 17) }, // Jan 17
      ]
      // 3 unique days (Jan 15, 16, 17), not 6 visits
      expect(calculateTotalDaysTraveled(visits)).toBe(3)
    })
  })

  describe('calculateDaysByCountry', () => {
    it('returns empty map for empty array', () => {
      const result = calculateDaysByCountry([])
      expect(result.size).toBe(0)
    })

    it('returns correct day counts per country', () => {
      const visits: CountryVisit[] = [
        { id: '1', countryCode: 'US', date: new Date(2024, 0, 15) },
        { id: '2', countryCode: 'US', date: new Date(2024, 0, 16) },
        { id: '3', countryCode: 'FR', date: new Date(2024, 0, 17) },
      ]
      const result = calculateDaysByCountry(visits)
      expect(result.get('US')).toBe(2)
      expect(result.get('FR')).toBe(1)
    })

    it('counts all days in mockVisits correctly', () => {
      const result = calculateDaysByCountry(mockVisits)
      expect(result.get('US')).toBe(3) // 3 days in US
      expect(result.get('FR')).toBe(2) // 2 days in FR
      expect(result.get('DE')).toBe(1) // 1 day in DE
    })
  })

  describe('calculateCountriesByDays', () => {
    it('returns empty array for empty visits', () => {
      expect(calculateCountriesByDays([])).toEqual([])
    })

    it('returns countries sorted by days descending', () => {
      const result = calculateCountriesByDays(mockVisits)
      expect(result).toEqual([
        { countryCode: 'US', days: 3 },
        { countryCode: 'FR', days: 2 },
        { countryCode: 'DE', days: 1 },
      ])
    })

    it('respects limit parameter', () => {
      const result = calculateCountriesByDays(mockVisits, 2)
      expect(result).toHaveLength(2)
      expect(result).toEqual([
        { countryCode: 'US', days: 3 },
        { countryCode: 'FR', days: 2 },
      ])
    })

    it('returns all countries when limit is 0', () => {
      const result = calculateCountriesByDays(mockVisits, 0)
      expect(result).toHaveLength(3)
    })
  })

  describe('calculateAverageTripLength', () => {
    it('returns 0 for empty array', () => {
      expect(calculateAverageTripLength([])).toBe(0)
    })

    it('returns total days when all consecutive (single trip)', () => {
      const visits: CountryVisit[] = [
        { id: '1', countryCode: 'US', date: new Date(2024, 0, 15) },
        { id: '2', countryCode: 'US', date: new Date(2024, 0, 16) },
        { id: '3', countryCode: 'FR', date: new Date(2024, 0, 17) },
      ]
      // 3 consecutive days = 1 trip, average = 3
      expect(calculateAverageTripLength(visits)).toBe(3)
    })

    it('counts multiple countries on same day as one day', () => {
      const visits: CountryVisit[] = [
        { id: '1', countryCode: 'US', date: new Date(2024, 0, 15) },
        { id: '2', countryCode: 'FR', date: new Date(2024, 0, 15) },
        { id: '3', countryCode: 'DE', date: new Date(2024, 0, 16) },
      ]
      // 2 unique days, all consecutive = 1 trip, average = 2
      expect(calculateAverageTripLength(visits)).toBe(2)
    })

    it('calculates average across multiple trips', () => {
      const visits: CountryVisit[] = [
        // Trip 1: 2 days
        { id: '1', countryCode: 'US', date: new Date(2024, 0, 15) },
        { id: '2', countryCode: 'US', date: new Date(2024, 0, 16) },
        // Gap (non-consecutive)
        // Trip 2: 3 days
        { id: '3', countryCode: 'FR', date: new Date(2024, 0, 20) },
        { id: '4', countryCode: 'FR', date: new Date(2024, 0, 21) },
        { id: '5', countryCode: 'FR', date: new Date(2024, 0, 22) },
      ]
      // 5 total days, 2 trips = 2.5 average
      expect(calculateAverageTripLength(visits)).toBe(2.5)
    })

    it('handles single day trips', () => {
      const visits: CountryVisit[] = [
        { id: '1', countryCode: 'US', date: new Date(2024, 0, 15) },
        { id: '2', countryCode: 'FR', date: new Date(2024, 0, 20) },
        { id: '3', countryCode: 'DE', date: new Date(2024, 0, 25) },
      ]
      // 3 single-day trips = average of 1
      expect(calculateAverageTripLength(visits)).toBe(1)
    })
  })

  describe('calculateBusiestMonth', () => {
    it('returns null for empty array', () => {
      expect(calculateBusiestMonth([], 2024)).toBeNull()
    })

    it('returns null when no visits in given year', () => {
      const visits: CountryVisit[] = [
        { id: '1', countryCode: 'US', date: new Date(2023, 0, 15) },
      ]
      expect(calculateBusiestMonth(visits, 2024)).toBeNull()
    })

    it('returns busiest month correctly', () => {
      // mockVisits has 2 visits in January (month 0)
      const result = calculateBusiestMonth(mockVisits, 2024)
      expect(result).toEqual({ month: 0, days: 2 })
    })

    it('handles single month with all visits', () => {
      const visits: CountryVisit[] = [
        { id: '1', countryCode: 'US', date: new Date(2024, 5, 1) },
        { id: '2', countryCode: 'FR', date: new Date(2024, 5, 2) },
        { id: '3', countryCode: 'DE', date: new Date(2024, 5, 3) },
      ]
      const result = calculateBusiestMonth(visits, 2024)
      expect(result).toEqual({ month: 5, days: 3 }) // June
    })

    it('returns first busiest month in case of tie', () => {
      const visits: CountryVisit[] = [
        { id: '1', countryCode: 'US', date: new Date(2024, 0, 15) },
        { id: '2', countryCode: 'FR', date: new Date(2024, 1, 15) },
      ]
      const result = calculateBusiestMonth(visits, 2024)
      expect(result).toEqual({ month: 0, days: 1 }) // January wins tie
    })

    it('counts multiple visits on same day as 1 day', () => {
      const visits: CountryVisit[] = [
        { id: '1', countryCode: 'US', date: new Date(2024, 5, 1) }, // June 1
        { id: '2', countryCode: 'FR', date: new Date(2024, 5, 1) }, // June 1 (same day, different country)
        { id: '3', countryCode: 'DE', date: new Date(2024, 5, 2) }, // June 2
      ]
      const result = calculateBusiestMonth(visits, 2024)
      // Should be 2 unique days (June 1 and June 2), not 3 visits
      expect(result).toEqual({ month: 5, days: 2 })
    })
  })

  describe('calculatePercentageOfYearTraveled', () => {
    it('returns 0 for empty array', () => {
      expect(calculatePercentageOfYearTraveled([], 2024)).toBe(0)
    })

    it('returns 0 when no visits in given year', () => {
      const visits: CountryVisit[] = [
        { id: '1', countryCode: 'US', date: new Date(2023, 0, 15) },
      ]
      expect(calculatePercentageOfYearTraveled(visits, 2024)).toBe(0)
    })

    it('calculates percentage correctly for regular year', () => {
      const visits: CountryVisit[] = [
        { id: '1', countryCode: 'US', date: new Date(2023, 0, 1) },
        { id: '2', countryCode: 'US', date: new Date(2023, 0, 2) },
      ]
      // 2 days out of 365 = ~0.548%
      const result = calculatePercentageOfYearTraveled(visits, 2023)
      expect(result).toBeCloseTo((2 / 365) * 100, 5)
    })

    it('calculates percentage correctly for leap year', () => {
      const visits: CountryVisit[] = [
        { id: '1', countryCode: 'US', date: new Date(2024, 0, 1) },
        { id: '2', countryCode: 'US', date: new Date(2024, 0, 2) },
      ]
      // 2024 is a leap year (366 days)
      const result = calculatePercentageOfYearTraveled(visits, 2024)
      expect(result).toBeCloseTo((2 / 366) * 100, 5)
    })

    it('filters by year correctly', () => {
      const visits: CountryVisit[] = [
        { id: '1', countryCode: 'US', date: new Date(2023, 0, 1) },
        { id: '2', countryCode: 'US', date: new Date(2024, 0, 1) },
        { id: '3', countryCode: 'US', date: new Date(2024, 0, 2) },
      ]
      // Only 2024 visits: 2 days out of 366
      const result = calculatePercentageOfYearTraveled(visits, 2024)
      expect(result).toBeCloseTo((2 / 366) * 100, 5)
    })

    it('counts multiple visits on same day as 1 day', () => {
      const visits: CountryVisit[] = [
        { id: '1', countryCode: 'US', date: new Date(2024, 0, 1) }, // Jan 1
        { id: '2', countryCode: 'FR', date: new Date(2024, 0, 1) }, // Jan 1 (same day, different country)
        { id: '3', countryCode: 'DE', date: new Date(2024, 0, 2) }, // Jan 2
      ]
      // 2 unique days out of 366 (leap year), not 3 visits
      const result = calculatePercentageOfYearTraveled(visits, 2024)
      expect(result).toBeCloseTo((2 / 366) * 100, 5)
    })
  })
})
