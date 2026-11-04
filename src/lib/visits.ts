import dayjs from 'dayjs'
import { getCountryByCode } from './countries'
import { toDayKey } from './selection'
import type { CountryVisit } from './types'
import { generateId } from './utils'

export const MAX_COUNTRIES_PER_DAY = 2

export interface AddCountryResult {
  visits: CountryVisit[]
  added: number
  skippedFull: number
  skippedExisting: number
}

export interface RemoveCountryResult {
  visits: CountryVisit[]
  removed: number
}

export interface DaysCountrySummary {
  countryCode: string
  days: number
}

export interface DaysSummary {
  countries: DaysCountrySummary[]
  emptyDays: Date[]
  fullDays: number
}

function groupVisitsByDay(visits: CountryVisit[]): Map<string, CountryVisit[]> {
  const byDay = new Map<string, CountryVisit[]>()
  for (const visit of visits) {
    const key = toDayKey(visit.date)
    const existing = byDay.get(key)
    if (existing) {
      existing.push(visit)
    } else {
      byDay.set(key, [visit])
    }
  }
  return byDay
}

export function addCountryToDays(
  visits: CountryVisit[],
  countryCode: string,
  days: Date[]
): AddCountryResult {
  const byDay = groupVisitsByDay(visits)
  const newVisits: CountryVisit[] = []
  let skippedFull = 0
  let skippedExisting = 0

  for (const day of days) {
    const dayVisits = byDay.get(toDayKey(day)) ?? []
    if (dayVisits.some((visit) => visit.countryCode === countryCode)) {
      skippedExisting++
    } else if (dayVisits.length >= MAX_COUNTRIES_PER_DAY) {
      skippedFull++
    } else {
      newVisits.push({
        id: generateId(),
        countryCode,
        date: dayjs(day).startOf('day').toDate(),
      })
    }
  }

  return {
    visits: [...visits, ...newVisits],
    added: newVisits.length,
    skippedFull,
    skippedExisting,
  }
}

export function removeCountryFromDays(
  visits: CountryVisit[],
  days: Date[],
  countryCode?: string
): RemoveCountryResult {
  const keys = new Set(days.map(toDayKey))
  const remaining = visits.filter(
    (visit) =>
      !keys.has(toDayKey(visit.date)) ||
      (countryCode !== undefined && visit.countryCode !== countryCode)
  )
  return { visits: remaining, removed: visits.length - remaining.length }
}

export function summarizeDays(
  visits: CountryVisit[],
  days: Date[]
): DaysSummary {
  const byDay = groupVisitsByDay(visits)
  const counts = new Map<string, number>()
  const emptyDays: Date[] = []
  let fullDays = 0

  for (const day of days) {
    const dayVisits = byDay.get(toDayKey(day)) ?? []
    if (dayVisits.length === 0) emptyDays.push(day)
    if (dayVisits.length >= MAX_COUNTRIES_PER_DAY) fullDays++
    for (const visit of dayVisits) {
      counts.set(visit.countryCode, (counts.get(visit.countryCode) ?? 0) + 1)
    }
  }

  const countries = [...counts.entries()]
    .map(([countryCode, count]) => ({ countryCode, days: count }))
    .sort((a, b) => b.days - a.days)

  return { countries, emptyDays, fullDays }
}

function countryCodesByDayCount(visits: CountryVisit[]): string[] {
  const counts = new Map<string, number>()
  for (const visit of visits) {
    counts.set(visit.countryCode, (counts.get(visit.countryCode) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([code]) => code)
}

interface SuggestCountriesOptions {
  visits: CountryVisit[]
  days: Date[]
  year: number
  fallback?: (string | null | undefined)[]
  limit?: number
}

export function suggestCountries({
  visits,
  days,
  year,
  fallback = [],
  limit = 6,
}: SuggestCountriesOptions): string[] {
  const byDay = groupVisitsByDay(visits)
  const neighbours: string[] = []

  if (days.length > 0) {
    const before = dayjs(days[0]).subtract(1, 'day').toDate()
    const after = dayjs(days[days.length - 1])
      .add(1, 'day')
      .toDate()
    for (const day of [before, after]) {
      for (const visit of byDay.get(toDayKey(day)) ?? []) {
        neighbours.push(visit.countryCode)
      }
    }
  }

  const thisYear = visits.filter((visit) => visit.date.getFullYear() === year)

  const ordered = [
    ...neighbours,
    ...countryCodesByDayCount(thisYear),
    ...countryCodesByDayCount(visits),
    ...fallback,
  ]

  const suggestions: string[] = []
  for (const code of ordered) {
    if (!code || suggestions.includes(code) || !getCountryByCode(code)) {
      continue
    }
    suggestions.push(code)
    if (suggestions.length >= limit) break
  }
  return suggestions
}

export function getLocaleCountryCode(): string | null {
  if (typeof navigator === 'undefined') return null
  const languages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language]
  for (const language of languages) {
    try {
      const region = new Intl.Locale(language).region
      if (region && getCountryByCode(region)) return region
    } catch {
      continue
    }
  }
  return null
}
