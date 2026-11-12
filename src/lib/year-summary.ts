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
  longestTrip: Trip | null
  busiestMonth: number | null
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
    if (!key.startsWith(prefix)) continue
    days++
    months[Number(key.slice(5, 7)) - 1]++
    for (const code of codes) {
      byCountry.set(code, (byCountry.get(code) ?? 0) + 1)
    }
  }
  const countries = [...byCountry.entries()]
    .map(([code, count]) => ({ code, days: count }))
    .sort((a, b) => b.days - a.days)
  const yearTrips = trips.filter(
    (trip) => trip.end >= `${year}-01-01` && trip.start <= `${year}-12-31`
  )
  const busiest = Math.max(...months)
  return {
    year,
    days,
    countries,
    trips: yearTrips,
    months,
    continents: [
      ...new Set(
        countries
          .map((c) => CONTINENT_BY_COUNTRY[c.code])
          .filter((c): c is ContinentCode => Boolean(c))
      ),
    ],
    newCountries: countries
      .map((c) => c.code)
      .filter((code) => !seenBefore.has(code)),
    longestTrip: yearTrips.reduce<Trip | null>(
      (best, trip) =>
        !best || trip.days.length > best.days.length ? trip : best,
      null
    ),
    busiestMonth: busiest > 0 ? months.indexOf(busiest) : null,
  }
}

function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`
}

export function compareHeadline(previous: YearSummary, current: YearSummary) {
  if (previous.days === 0 && current.days === 0) {
    return `No trips logged in ${previous.year} or ${current.year} yet.`
  }
  if (previous.days === 0) {
    return `${current.year} is your first year on Yearly: ${plural(current.days, 'day')} abroad so far.`
  }
  const ratio = current.days / previous.days
  const newCountries = plural(
    current.newCountries.length,
    'new country',
    'new countries'
  )
  if (ratio >= 1.95) {
    return `${current.year} was a bigger year: ${ratio.toFixed(1)}× the days abroad of ${previous.year}, and ${newCountries}.`
  }
  if (ratio >= 1.15) {
    return `${current.year} was a bigger year: ${Math.round((ratio - 1) * 100)}% more days abroad than ${previous.year}, and ${newCountries}.`
  }
  if (ratio <= 0.85) {
    return `A quieter year: ${plural(current.days, 'day')} abroad in ${current.year}, down from ${previous.days} in ${previous.year}.`
  }
  return `About the same as ${previous.year}: ${plural(current.days, 'day')} abroad against ${previous.days}.`
}
