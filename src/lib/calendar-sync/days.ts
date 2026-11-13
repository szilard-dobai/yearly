import { fromDayKey, toDayKey } from '@/lib/selection'
import type { CountryVisit } from '@/lib/types'
import { generateId } from '@/lib/utils'
import { MAX_COUNTRIES_PER_DAY } from '@/lib/visits'
import { z } from 'zod'

export type CalendarDays = Record<string, string[]>

export interface RemoteCalendar {
  days: CalendarDays
  version: number
}

export const MAX_CALENDAR_DAYS = 366 * 10

export const calendarDaysSchema = z
  .record(
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    z
      .array(z.string().length(2))
      .min(1)
      .max(MAX_COUNTRIES_PER_DAY)
      .refine((codes) => new Set(codes).size === codes.length)
  )
  .refine((days) => Object.keys(days).length <= MAX_CALENDAR_DAYS)

export function toCalendarDays(visits: CountryVisit[]): CalendarDays {
  const days: CalendarDays = {}
  for (const visit of visits) {
    const codes = (days[toDayKey(visit.date)] ??= [])
    if (!codes.includes(visit.countryCode)) codes.push(visit.countryCode)
  }
  return days
}

export function fromCalendarDays(
  days: CalendarDays,
  existing: CountryVisit[]
): CountryVisit[] {
  const existingByKey = new Map(
    existing.map((visit) => [
      `${toDayKey(visit.date)}|${visit.countryCode}`,
      visit,
    ])
  )
  return Object.keys(days)
    .sort()
    .flatMap((day) =>
      days[day].map(
        (countryCode) =>
          existingByKey.get(`${day}|${countryCode}`) ?? {
            id: generateId(),
            countryCode,
            date: fromDayKey(day),
          }
      )
    )
}

function sameCodes(a: string[], b: string[]) {
  return a.length === b.length && a.every((code, index) => code === b[index])
}

export function sameCalendarDays(a: CalendarDays, b: CalendarDays) {
  const keys = Object.keys(a)
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => key in b && sameCodes(a[key], b[key]))
  )
}

export function countCalendarDays(days: CalendarDays) {
  return Object.keys(days).length
}

export interface FirstSyncSummary {
  newDays: number
  accountDays: number
  crowdedDays: number
}

export function summarizeFirstSync(
  device: CalendarDays,
  account: CalendarDays
): FirstSyncSummary {
  let newDays = 0
  let crowdedDays = 0
  for (const [day, codes] of Object.entries(device)) {
    const existing = account[day] ?? []
    const added = codes.filter((code) => !existing.includes(code))
    if (added.length > 0) newDays++
    if (existing.length + added.length > MAX_COUNTRIES_PER_DAY) crowdedDays++
  }
  return { newDays, accountDays: countCalendarDays(account), crowdedDays }
}

function mergeDay(base: string[], local: string[], remote: string[]) {
  if (sameCodes(local, remote)) return local
  if (sameCodes(local, base)) return remote
  if (sameCodes(remote, base)) return local

  const keep = (code: string) =>
    base.includes(code)
      ? local.includes(code) && remote.includes(code)
      : local.includes(code) || remote.includes(code)
  return [...new Set([...local, ...remote])]
    .filter(keep)
    .slice(0, MAX_COUNTRIES_PER_DAY)
}

export function mergeCalendarDays(
  base: CalendarDays,
  local: CalendarDays,
  remote: CalendarDays
): CalendarDays {
  const merged: CalendarDays = {}
  const keys = new Set([
    ...Object.keys(base),
    ...Object.keys(local),
    ...Object.keys(remote),
  ])
  for (const key of keys) {
    const codes = mergeDay(base[key] ?? [], local[key] ?? [], remote[key] ?? [])
    if (codes.length > 0) merged[key] = [...codes]
  }
  return merged
}
