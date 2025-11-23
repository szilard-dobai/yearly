import type { CountryVisit } from './types'

/**
 * Calculates the total number of unique countries visited
 */
export function calculateTotalCountriesVisited(visits: CountryVisit[]): number {
  const uniqueCountries = new Set(visits.map((visit) => visit.countryCode))
  return uniqueCountries.size
}

/**
 * Calculates the total number of visits (a visit is a continuous stay in one country)
 * Consecutive days in the same country count as 1 visit
 * Examples:
 * - Uganda on 13.04.2025 = 1 visit
 * - Uganda from 13.04.2025 to 18.04.2025 = 1 visit (continuous)
 * - Morocco on 13.04.2025 + Uganda from 13.04.2025 to 15.04.2025 = 2 visits
 * - Morocco on 13.04 + Uganda from 13.04 to 15.04 + Morocco on 15.04 = 3 visits
 */
export function calculateTotalVisits(visits: CountryVisit[]): number {
  if (visits.length === 0) return 0

  // Sort visits by date
  const sortedVisits = [...visits].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  )

  let visitCount = 0
  let currentCountry: string | null = null
  let lastDate: Date | null = null

  for (const visit of sortedVisits) {
    const isConsecutiveDay =
      lastDate &&
      currentCountry === visit.countryCode &&
      isNextDay(lastDate, visit.date)

    if (!isConsecutiveDay) {
      // Start a new visit
      visitCount++
      currentCountry = visit.countryCode
    }

    lastDate = visit.date
  }

  return visitCount
}

/**
 * Helper function to check if date2 is the next day after date1
 */
function isNextDay(date1: Date, date2: Date): boolean {
  const nextDay = new Date(date1)
  nextDay.setDate(nextDay.getDate() + 1)

  return (
    nextDay.getFullYear() === date2.getFullYear() &&
    nextDay.getMonth() === date2.getMonth() &&
    nextDay.getDate() === date2.getDate()
  )
}

/**
 * Calculates visit counts by country (continuous stays only)
 * Each continuous stay in a country counts as 1 visit
 */
export function calculateVisitsByCountry(
  visits: CountryVisit[]
): Map<string, number> {
  if (visits.length === 0) return new Map()

  const countMap = new Map<string, number>()

  // Sort visits by date
  const sortedVisits = [...visits].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  )

  let currentCountry: string | null = null
  let lastDate: Date | null = null

  for (const visit of sortedVisits) {
    const isConsecutiveDay =
      lastDate &&
      currentCountry === visit.countryCode &&
      isNextDay(lastDate, visit.date)

    if (!isConsecutiveDay) {
      // Start a new visit for this country
      const currentCount = countMap.get(visit.countryCode) || 0
      countMap.set(visit.countryCode, currentCount + 1)
      currentCountry = visit.countryCode
    }

    lastDate = visit.date
  }

  return countMap
}

/**
 * Calculates the most visited countries, sorted by visit count descending
 */
export function calculateMostVisitedCountries(
  visits: CountryVisit[],
  limit = 5
): Array<{ countryCode: string; count: number }> {
  const countMap = calculateVisitsByCountry(visits)

  const sorted = Array.from(countMap.entries())
    .map(([countryCode, count]) => ({ countryCode, count }))
    .sort((a, b) => b.count - a.count)

  return limit > 0 ? sorted.slice(0, limit) : sorted
}

/**
 * Calculates the least visited countries, sorted by visit count ascending
 */
export function calculateLeastVisitedCountries(
  visits: CountryVisit[],
  limit = 5
): Array<{ countryCode: string; count: number }> {
  const countMap = calculateVisitsByCountry(visits)

  const sorted = Array.from(countMap.entries())
    .map(([countryCode, count]) => ({ countryCode, count }))
    .sort((a, b) => a.count - b.count)

  return limit > 0 ? sorted.slice(0, limit) : sorted
}

/**
 * Calculates monthly breakdown of visits for a given year
 */
export function calculateMonthlyBreakdown(
  visits: CountryVisit[],
  year: number
): Array<{ month: number; visitCount: number; uniqueCountries: number }> {
  const monthlyData = Array.from({ length: 12 }, (_, month) => ({
    month,
    visitCount: 0,
    uniqueCountries: 0,
    countries: new Set<string>(),
  }))

  for (const visit of visits) {
    if (visit.date.getFullYear() === year) {
      const month = visit.date.getMonth()
      monthlyData[month].visitCount++
      monthlyData[month].countries.add(visit.countryCode)
    }
  }

  return monthlyData.map(({ month, visitCount, countries }) => ({
    month,
    visitCount,
    uniqueCountries: countries.size,
  }))
}

/**
 * Calculates average visits per country (using continuous stay logic)
 * Average = total visits (continuous stays) / unique countries visited
 */
export function calculateAverageVisitsPerCountry(
  visits: CountryVisit[]
): number {
  const totalCountries = calculateTotalCountriesVisited(visits)
  if (totalCountries === 0) return 0

  const totalVisits = calculateTotalVisits(visits)
  return totalVisits / totalCountries
}

/**
 * Finds the country with the most visits
 */
export function findMostVisitedCountry(
  visits: CountryVisit[]
): { countryCode: string; count: number } | null {
  const mostVisited = calculateMostVisitedCountries(visits, 1)
  return mostVisited.length > 0 ? mostVisited[0] : null
}
