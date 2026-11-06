import { toDayKey } from '@/lib/selection'
import type { CalendarData } from '@/lib/types'

export type TripSummary = {
  year: number
  visitCount: number
  dayCount: number
  countryCount: number
  countryCodes: string[]
}

export const TRIP_SUMMARY_EVENTS = [
  'image_export_click',
  'image_download_click',
  'json_export',
] as const

type DayVisit = { countryCode: string; day: string }

export function summarizeTrips(visits: DayVisit[], year: number): TripSummary {
  const yearVisits = visits.filter((v) => v.day.startsWith(`${year}-`))
  const countryCodes = [...new Set(yearVisits.map((v) => v.countryCode))].sort()

  return {
    year,
    visitCount: yearVisits.length,
    dayCount: new Set(yearVisits.map((v) => v.day)).size,
    countryCount: countryCodes.length,
    countryCodes,
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
