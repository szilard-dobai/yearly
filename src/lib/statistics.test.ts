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
})
