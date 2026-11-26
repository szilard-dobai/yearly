import { CONTINENT_BY_COUNTRY, type ContinentCode } from './continents'
import type { DayMap, Trip } from './trips'

export interface YearSummary {
  year: number
  days: number
  countries: { code: string; days: number }[]
  trips: Trip[]
  months: number[]
  continents: ContinentCode[]
  newCountries: string[]
  returningCountries: string[]
  longestTrip: Trip | null
}

export function summarizeYear(
  dayMap: DayMap,
  trips: Trip[],
  year: number
): YearSummary {
  const prefix = `${year}-`
  const months = Array.from({ length: 12 }, () => 0)
  const byCountry = new Map<string, number>()
  const seenBefore = new Set<string>()
  let days = 0
  for (const [key, codes] of dayMap) {
    if (key < prefix) {
      codes.forEach((code) => seenBefore.add(code))
      continue
    }
    if (!key.startsWith(prefix)) break
    days++
    months[Number(key.slice(5, 7)) - 1]++
    for (const code of codes) {
      byCountry.set(code, (byCountry.get(code) ?? 0) + 1)
    }
  }
  const countries = [...byCountry.entries()]
    .map(([code, count]) => ({ code, days: count }))
    .sort((a, b) => b.days - a.days)
  const codes = countries.map((c) => c.code)
  const yearTrips = trips.filter(
    (trip) => trip.end >= `${year}-01-01` && trip.start <= `${year}-12-31`
  )
  return {
    year,
    days,
    countries,
    trips: yearTrips,
    months,
    continents: [
      ...new Set(
        codes
          .map((code) => CONTINENT_BY_COUNTRY[code])
          .filter((c): c is ContinentCode => Boolean(c))
      ),
    ],
    newCountries: codes.filter((code) => !seenBefore.has(code)),
    returningCountries: codes.filter((code) => seenBefore.has(code)),
    longestTrip: yearTrips.reduce<Trip | null>(
      (best, trip) =>
        !best || trip.days.length > best.days.length ? trip : best,
      null
    ),
  }
}

function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`
}

export function compareHeadline(
  previous: YearSummary,
  current: YearSummary,
  yearOver: boolean
) {
  const ratio = current.days / previous.days
  const days = plural(current.days, 'day')
  const bigger = yearOver
    ? `${current.year} was a bigger year`
    : `${current.year} is already a bigger year`
  const newCountries =
    current.newCountries.length > 0
      ? `, and ${plural(current.newCountries.length, 'new country', 'new countries')}`
      : ''
  if (ratio >= 1.95) {
    return `${bigger}: ${Number(ratio.toFixed(1))}× the days abroad of ${previous.year}${newCountries}.`
  }
  if (ratio >= 1.15) {
    return `${bigger}: ${Math.round((ratio - 1) * 100)}% more days abroad than ${previous.year}${newCountries}.`
  }
  if (!yearOver) {
    return `${current.year} so far: ${days} abroad, against ${previous.days} in ${previous.year}.`
  }
  if (ratio <= 0.85) {
    return `A quieter year: ${days} abroad in ${current.year}, down from ${previous.days} in ${previous.year}.`
  }
  return `About the same as ${previous.year}: ${days} abroad against ${previous.days}.`
}
