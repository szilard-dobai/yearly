import { toDayKey } from '@/lib/selection'
import type { CalendarData } from '@/lib/types'

export type CountryDays = { code: string; days: number }

export type TripSummary = {
  year: number
  visitCount: number
  dayCount: number
  countryCount: number
  countries: CountryDays[]
}

export const TRIP_SUMMARY_EVENTS = [
  'image_export_click',
  'image_download_click',
  'json_export',
] as const

type DayVisit = { countryCode: string; day: string }

export function summarizeTrips(visits: DayVisit[], year: number): TripSummary {
  const yearVisits = visits.filter((v) => v.day.startsWith(`${year}-`))
  const daysByCountry = new Map<string, Set<string>>()
  for (const { countryCode, day } of yearVisits) {
    const days = daysByCountry.get(countryCode) ?? new Set<string>()
    days.add(day)
    daysByCountry.set(countryCode, days)
  }
  const countries = [...daysByCountry]
    .map(([code, days]) => ({ code, days: days.size }))
    .sort((a, b) => (a.code < b.code ? -1 : 1))

  return {
    year,
    visitCount: yearVisits.length,
    dayCount: new Set(yearVisits.map((v) => v.day)).size,
    countryCount: countries.length,
    countries,
  }
}

export function summarizeCalendar(
  calendarData: CalendarData,
  year: number
): TripSummary {
  return summarizeTrips(
    calendarData.visits.map((v) => ({
      countryCode: v.countryCode,
      day: toDayKey(v.date),
    })),
    year
  )
}

export function dayKeyFromStoredDate(isoDate: string): string {
  const middayAware = new Date(Date.parse(isoDate) + 12 * 60 * 60 * 1000)
  return middayAware.toISOString().slice(0, 10)
}
