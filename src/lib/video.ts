import { toDayKey } from '@/lib/selection'
import {
  calculateAverageTripLength,
  calculateBusiestMonth,
  calculateCountriesByDays,
  calculatePercentageOfMonthTraveled,
  calculatePercentageOfYearTraveled,
  calculateTotalCountriesVisited,
  calculateTotalDaysTraveled,
} from '@/lib/statistics'
import type { CountryVisit } from '@/lib/types'

export const VIDEO_KINDS = ['year', 'stats', 'month'] as const
export const VIDEO_THEMES = ['dark', 'light'] as const

export type VideoKind = (typeof VIDEO_KINDS)[number]
export type VideoTheme = (typeof VIDEO_THEMES)[number]

export type VideoDay = {
  date: string
  codes: string[]
}

export type YearVideoStats = {
  totalCountries: number
  totalDays: number
  averageTripLength: number
  percentTraveled: number
  busiestMonth: { month: number; days: number } | null
  topCountries: { countryCode: string; days: number }[]
}

export type YearVideoData = {
  year: number
  days: VideoDay[]
  countries: string[]
  stats: YearVideoStats
}

export type MonthVideoStats = Omit<YearVideoStats, 'busiestMonth'>

export type MonthVideoData = {
  year: number
  month: number
  days: VideoDay[]
  countries: string[]
  stats: MonthVideoStats
}

function groupByDay(visits: CountryVisit[]): VideoDay[] {
  const byDay = new Map<string, string[]>()
  for (const visit of visits) {
    const key = toDayKey(visit.date)
    const codes = byDay.get(key) ?? []
    if (!codes.includes(visit.countryCode)) codes.push(visit.countryCode)
    byDay.set(key, codes)
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, codes]) => ({ date, codes }))
}

function countriesInOrder(days: VideoDay[]): string[] {
  return [...new Set(days.flatMap((d) => d.codes))]
}

export function buildYearVideoData(
  visits: CountryVisit[],
  year: number
): YearVideoData {
  const yearVisits = visits.filter((v) => v.date.getFullYear() === year)
  const days = groupByDay(yearVisits)

  return {
    year,
    days,
    countries: countriesInOrder(days),
    stats: {
      totalCountries: calculateTotalCountriesVisited(yearVisits),
      totalDays: calculateTotalDaysTraveled(yearVisits),
      averageTripLength: calculateAverageTripLength(yearVisits),
      percentTraveled: calculatePercentageOfYearTraveled(yearVisits, year),
      busiestMonth: calculateBusiestMonth(yearVisits, year),
      topCountries: calculateCountriesByDays(yearVisits, 5),
    },
  }
}

export function buildMonthVideoData(
  visits: CountryVisit[],
  year: number,
  month: number
): MonthVideoData {
  const monthVisits = visits.filter(
    (v) => v.date.getFullYear() === year && v.date.getMonth() === month
  )
  const days = groupByDay(monthVisits)

  return {
    year,
    month,
    days,
    countries: countriesInOrder(days),
    stats: {
      totalCountries: calculateTotalCountriesVisited(monthVisits),
      totalDays: calculateTotalDaysTraveled(monthVisits),
      averageTripLength: calculateAverageTripLength(monthVisits),
      percentTraveled: calculatePercentageOfMonthTraveled(
        monthVisits,
        year,
        month
      ),
      topCountries: calculateCountriesByDays(monthVisits, 3),
    },
  }
}

export function dayOfYear(dayKey: string): number {
  const [year, month, date] = dayKey.split('-').map(Number)
  return (Date.UTC(year, month - 1, date) - Date.UTC(year, 0, 1)) / 86400000
}

export function daysInYear(year: number): number {
  return (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86400000
}
