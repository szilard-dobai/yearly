import { CONTINENT_BY_COUNTRY, type ContinentCode } from './continents'
import type { EmojiName } from './emoji'
import { groupTrips, type DayMap, type Trip } from './trips'

interface BadgeContext {
  trips: number
  shortTrips: number
  longestTrip: number
  mostCountriesOnOneTrip: number
  countries: number
  continents: number
  borderDays: number
  newYearDays: number
  mostDaysInOneYear: number
  mostSeasonsInOneYear: number
  mostMonthsInOneYear: number
  mostTripsToOneCountry: number
}

export interface BadgeDefinition {
  id: string
  emoji: EmojiName
  name: string
  description: string
  target: number
  unit: string
  metric: keyof BadgeContext
}

export interface Badge extends Omit<BadgeDefinition, 'metric'> {
  value: number
  earnedOn: string | null
  unlocksOn: string | null
  trip: Trip | null
  dayCountries: string[]
}

const SHORT_TRIP_DAYS = 3

export const BADGES: BadgeDefinition[] = [
  {
    id: 'first-trip',
    emoji: 'airplane',
    name: 'First trip',
    description: 'Log your first trip abroad',
    target: 1,
    unit: 'trip',
    metric: 'trips',
  },
  {
    id: 'two-flags',
    emoji: 'compass',
    name: 'Two flags',
    description: 'Visit 2 countries',
    target: 2,
    unit: 'countries',
    metric: 'countries',
  },
  {
    id: 'high-five',
    emoji: 'raisedHand',
    name: 'High five',
    description: 'Visit 5 countries',
    target: 5,
    unit: 'countries',
    metric: 'countries',
  },
  {
    id: 'perfect-ten',
    emoji: 'directHit',
    name: 'Perfect ten',
    description: 'Visit 10 countries',
    target: 10,
    unit: 'countries',
    metric: 'countries',
  },
  {
    id: 'globetrotter',
    emoji: 'globeEuropeAfrica',
    name: 'Globetrotter',
    description: 'Visit 25 countries',
    target: 25,
    unit: 'countries',
    metric: 'countries',
  },
  {
    id: 'continent-hopper',
    emoji: 'worldMap',
    name: 'Continent hopper',
    description: 'Set foot on 3 continents',
    target: 3,
    unit: 'continents',
    metric: 'continents',
  },
  {
    id: 'five-continents',
    emoji: 'globeWithMeridians',
    name: 'Five continents',
    description: 'Set foot on 5 continents',
    target: 5,
    unit: 'continents',
    metric: 'continents',
  },
  {
    id: 'grand-tour',
    emoji: 'train',
    name: 'Grand tour',
    description: 'Visit 4 countries on one trip',
    target: 4,
    unit: 'countries on one trip',
    metric: 'mostCountriesOnOneTrip',
  },
  {
    id: 'weekend-warrior',
    emoji: 'backpack',
    name: 'Weekend warrior',
    description: `Take 3 trips of ${SHORT_TRIP_DAYS} days or fewer`,
    target: 3,
    unit: 'short trips',
    metric: 'shortTrips',
  },
  {
    id: 'long-haul',
    emoji: 'luggage',
    name: 'Long haul',
    description: 'Spend 14 days in a row abroad',
    target: 14,
    unit: 'days in a row',
    metric: 'longestTrip',
  },
  {
    id: 'month-away',
    emoji: 'desertIsland',
    name: 'A month away',
    description: 'Spend 30 days abroad in one year',
    target: 30,
    unit: 'days',
    metric: 'mostDaysInOneYear',
  },
  {
    id: 'hundred-club',
    emoji: 'hundredPoints',
    name: 'Hundred club',
    description: 'Spend 100 days abroad in one year',
    target: 100,
    unit: 'days',
    metric: 'mostDaysInOneYear',
  },
  {
    id: 'border-hopper',
    emoji: 'automobile',
    name: 'Border hopper',
    description: 'Be in 2 countries on the same day',
    target: 1,
    unit: 'day',
    metric: 'borderDays',
  },
  {
    id: 'new-year-abroad',
    emoji: 'clinkingGlasses',
    name: 'New Year abroad',
    description: 'Wake up abroad on 1 January',
    target: 1,
    unit: 'New Year',
    metric: 'newYearDays',
  },
  {
    id: 'regular',
    emoji: 'roundPushpin',
    name: 'Regular',
    description: 'Go back to the same country 3 times',
    target: 3,
    unit: 'trips to one country',
    metric: 'mostTripsToOneCountry',
  },
  {
    id: 'all-seasons',
    emoji: 'fallenLeaf',
    name: 'All seasons',
    description: 'Travel in winter, spring, summer and autumn of one year',
    target: 4,
    unit: 'seasons',
    metric: 'mostSeasonsInOneYear',
  },
  {
    id: 'every-month',
    emoji: 'spiralCalendar',
    name: 'Every month',
    description: 'Travel in all 12 months of one year',
    target: 12,
    unit: 'months',
    metric: 'mostMonthsInOneYear',
  },
]

function createTally() {
  const countries = new Set<string>()
  const continents = new Set<ContinentCode>()
  const tripsPerCountry = new Map<string, number>()
  const years = new Map<
    string,
    { days: number; seasons: Set<number>; months: Set<number> }
  >()
  const context: BadgeContext = {
    trips: 0,
    shortTrips: 0,
    longestTrip: 0,
    mostCountriesOnOneTrip: 0,
    countries: 0,
    continents: 0,
    borderDays: 0,
    newYearDays: 0,
    mostDaysInOneYear: 0,
    mostSeasonsInOneYear: 0,
    mostMonthsInOneYear: 0,
    mostTripsToOneCountry: 0,
  }
  let tripDays = 0
  let tripCountries = new Set<string>()

  return {
    startTrip() {
      context.trips++
      tripDays = 0
      tripCountries = new Set()
    },
    addDay(key: string, codes: string[], lastDayOfShortTrip: boolean) {
      tripDays++
      context.longestTrip = Math.max(context.longestTrip, tripDays)
      if (lastDayOfShortTrip) context.shortTrips++
      for (const code of codes) {
        countries.add(code)
        const continent = CONTINENT_BY_COUNTRY[code]
        if (continent) continents.add(continent)
        if (!tripCountries.has(code)) {
          tripCountries.add(code)
          const trips = (tripsPerCountry.get(code) ?? 0) + 1
          tripsPerCountry.set(code, trips)
          context.mostTripsToOneCountry = Math.max(
            context.mostTripsToOneCountry,
            trips
          )
        }
      }
      context.countries = countries.size
      context.continents = continents.size
      context.mostCountriesOnOneTrip = Math.max(
        context.mostCountriesOnOneTrip,
        tripCountries.size
      )
      if (codes.length > 1) context.borderDays++
      if (key.endsWith('-01-01')) context.newYearDays++

      const month = Number(key.slice(5, 7)) - 1
      const yearKey = key.slice(0, 4)
      const year = years.get(yearKey) ?? {
        days: 0,
        seasons: new Set<number>(),
        months: new Set<number>(),
      }
      year.days++
      year.months.add(month)
      year.seasons.add(Math.floor(((month + 1) % 12) / 3))
      years.set(yearKey, year)
      context.mostDaysInOneYear = Math.max(context.mostDaysInOneYear, year.days)
      context.mostSeasonsInOneYear = Math.max(
        context.mostSeasonsInOneYear,
        year.seasons.size
      )
      context.mostMonthsInOneYear = Math.max(
        context.mostMonthsInOneYear,
        year.months.size
      )
    },
    snapshot(): BadgeContext {
      return { ...context }
    },
  }
}

export function computeBadges(dayMap: DayMap, todayKey: string): Badge[] {
  const tally = createTally()
  const reachedOn = new Map<string, { day: string; trip: Trip }>()
  let now: BadgeContext | null = null

  for (const trip of groupTrips(dayMap)) {
    tally.startTrip()
    for (const key of trip.days) {
      if (!now && key > todayKey) now = tally.snapshot()
      tally.addDay(
        key,
        dayMap.get(key) ?? [],
        key === trip.end && trip.days.length <= SHORT_TRIP_DAYS
      )
      const context = tally.snapshot()
      for (const badge of BADGES) {
        if (!reachedOn.has(badge.id) && context[badge.metric] >= badge.target) {
          reachedOn.set(badge.id, { day: key, trip })
        }
      }
    }
  }
  now ??= tally.snapshot()

  return BADGES.map(({ metric, ...badge }) => {
    const reached = reachedOn.get(badge.id)
    const earned = reached !== undefined && reached.day <= todayKey
    return {
      ...badge,
      value: Math.min(badge.target, now[metric]),
      earnedOn: earned ? reached.day : null,
      unlocksOn: reached && !earned ? reached.day : null,
      trip: reached?.trip ?? null,
      dayCountries: reached ? (dayMap.get(reached.day) ?? []) : [],
    }
  })
}

export function earnedBadges(badges: Badge[]): Badge[] {
  return badges
    .filter((badge) => badge.earnedOn)
    .sort((a, b) => b.earnedOn!.localeCompare(a.earnedOn!))
}

export function newlyEarned(before: Badge[], after: Badge[]): Badge[] {
  const had = new Set(before.filter((b) => b.earnedOn).map((b) => b.id))
  return after.filter((b) => b.earnedOn && !had.has(b.id))
}

export function nextBadge(badges: Badge[]): Badge | null {
  const locked = badges.filter((badge) => !badge.earnedOn)
  const planned = locked
    .filter((badge) => badge.unlocksOn)
    .sort((a, b) => a.unlocksOn!.localeCompare(b.unlocksOn!))
  return (
    planned[0] ??
    locked.sort((a, b) => b.value / b.target - a.value / a.target)[0] ??
    null
  )
}
