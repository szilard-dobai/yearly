import { addDays, type DayMap } from './trips'

export const SCHENGEN_LIMIT = 90
export const SCHENGEN_WINDOW = 180
export const TAX_RESIDENCY_DAYS = 183

export const SCHENGEN_COUNTRIES = new Set([
  'AT',
  'BE',
  'BG',
  'HR',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IS',
  'IT',
  'LV',
  'LI',
  'LT',
  'LU',
  'MT',
  'NL',
  'NO',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
  'CH',
])

export function getSchengenDays(dayMap: DayMap): Map<string, string> {
  const days = new Map<string, string>()
  for (const [day, codes] of dayMap) {
    const code = codes.find((c) => SCHENGEN_COUNTRIES.has(c))
    if (code) days.set(day, code)
  }
  return days
}

export function countWindow(days: Map<string, string>, endKey: string) {
  let count = 0
  for (let i = 0; i < SCHENGEN_WINDOW; i++) {
    if (days.has(addDays(endKey, -i))) count++
  }
  return count
}

export function hasRecentSchengenDays(dayMap: DayMap, todayKey: string) {
  const from = addDays(todayKey, -364)
  for (const day of getSchengenDays(dayMap).keys()) {
    if (day >= from) return true
  }
  return false
}

export function getSchengenSummary(dayMap: DayMap, todayKey: string) {
  const days = getSchengenDays(dayMap)
  const used = countWindow(days, todayKey)
  const windowDays = Array.from({ length: SCHENGEN_WINDOW }, (_, i) => {
    const key = addDays(todayKey, i - SCHENGEN_WINDOW + 1)
    return { key, country: days.get(key) ?? null }
  })
  const countries = new Map<string, number>()
  for (const { country } of windowDays) {
    if (country) countries.set(country, (countries.get(country) ?? 0) + 1)
  }
  return {
    used,
    left: Math.max(0, SCHENGEN_LIMIT - used),
    windowStart: windowDays[0].key,
    windowDays,
    projection: [30, 60, 90].map((offset) => {
      const key = addDays(todayKey, offset)
      return {
        key,
        left: Math.max(0, SCHENGEN_LIMIT - countWindow(days, key)),
      }
    }),
    countries: [...countries.entries()]
      .map(([code, count]) => ({ code, days: count }))
      .sort((a, b) => b.days - a.days),
  }
}

export function checkStay(dayMap: DayMap, startKey: string, length: number) {
  const days = getSchengenDays(dayMap)
  for (let i = 0; i < length; i++) days.set(addDays(startKey, i), 'PLAN')
  let maxUsed = 0
  let firstOver: string | null = null
  for (let i = 0; i < length; i++) {
    const key = addDays(startKey, i)
    const used = countWindow(days, key)
    maxUsed = Math.max(maxUsed, used)
    if (used > SCHENGEN_LIMIT && !firstOver) firstOver = key
  }
  return {
    maxUsed,
    firstOver,
    lastSafeDay: firstOver ? addDays(firstOver, -1) : null,
  }
}

export function daysPerCountry(
  dayMap: DayMap,
  endKey: string,
  windowLength = 365
) {
  const startKey = addDays(endKey, -(windowLength - 1))
  const counts = new Map<string, number>()
  for (const [day, codes] of dayMap) {
    if (day < startKey || day > endKey) continue
    for (const code of codes) counts.set(code, (counts.get(code) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([code, days]) => ({ code, days }))
    .sort((a, b) => b.days - a.days)
}
