import { CONTINENT_BY_COUNTRY, type ContinentCode } from './continents'
import { groupTrips, type DayMap, type Trip } from './trips'

interface BadgeContext {
  trips: Trip[]
  countries: Set<string>
  continents: Set<ContinentCode>
  borderDays: number
  newYearDays: number
  maxDaysInYear: number
  maxSeasonsInYear: number
  maxMonthsInYear: number
  maxTripsToOneCountry: number
}

export interface BadgeDefinition {
  id: string
  emoji: string
  name: string
  description: string
  target: number
  unit: string
  progress: (context: BadgeContext) => number
}

export interface Badge extends Omit<BadgeDefinition, 'progress'> {
  value: number
  earnedOn: string | null
  unlocksOn: string | null
}

const longestTrip = (c: BadgeContext) =>
  Math.max(0, ...c.trips.map((t) => t.days.length))

export const BADGES: BadgeDefinition[] = [
  {
    id: 'first-trip',
    emoji: '✈️',
    name: 'First trip',
    description: 'Log your first trip abroad',
    target: 1,
    unit: 'trip',
    progress: (c) => c.trips.length,
  },
  {
    id: 'two-flags',
    emoji: '🧭',
    name: 'Two flags',
    description: 'Visit 2 countries',
    target: 2,
    unit: 'countries',
    progress: (c) => c.countries.size,
  },
  {
    id: 'high-five',
    emoji: '🖐️',
    name: 'High five',
    description: 'Visit 5 countries',
    target: 5,
    unit: 'countries',
    progress: (c) => c.countries.size,
  },
  {
    id: 'perfect-ten',
    emoji: '🔟',
    name: 'Perfect ten',
    description: 'Visit 10 countries',
    target: 10,
    unit: 'countries',
    progress: (c) => c.countries.size,
  },
  {
    id: 'globetrotter',
    emoji: '🌍',
    name: 'Globetrotter',
    description: 'Visit 25 countries',
    target: 25,
    unit: 'countries',
    progress: (c) => c.countries.size,
  },
  {
    id: 'continent-hopper',
    emoji: '🗺️',
    name: 'Continent hopper',
    description: 'Set foot on 3 continents',
    target: 3,
    unit: 'continents',
    progress: (c) => c.continents.size,
  },
  {
    id: 'five-continents',
    emoji: '🌐',
    name: 'Five continents',
    description: 'Set foot on 5 continents',
    target: 5,
    unit: 'continents',
    progress: (c) => c.continents.size,
  },
  {
    id: 'grand-tour',
    emoji: '🚆',
    name: 'Grand tour',
    description: 'Visit 4 countries on one trip',
    target: 4,
    unit: 'countries on one trip',
    progress: (c) => Math.max(0, ...c.trips.map((t) => t.countries.length)),
  },
  {
    id: 'weekend-warrior',
    emoji: '🎒',
    name: 'Weekend warrior',
    description: 'Take 3 trips of 3 days or fewer',
    target: 3,
    unit: 'short trips',
    progress: (c) => c.trips.filter((t) => t.days.length <= 3).length,
  },
  {
    id: 'long-haul',
    emoji: '🧳',
    name: 'Long haul',
    description: 'Spend 14 days in a row abroad',
    target: 14,
    unit: 'days in a row',
    progress: longestTrip,
  },
  {
    id: 'month-away',
    emoji: '📆',
    name: 'A month away',
    description: 'Spend 30 days abroad in one year',
    target: 30,
    unit: 'days',
    progress: (c) => c.maxDaysInYear,
  },
  {
    id: 'century',
    emoji: '💯',
    name: 'Century',
    description: 'Spend 100 days abroad in one year',
    target: 100,
    unit: 'days',
    progress: (c) => c.maxDaysInYear,
  },
  {
    id: 'border-hopper',
    emoji: '🛂',
    name: 'Border hopper',
    description: 'Be in 2 countries on the same day',
    target: 1,
    unit: 'day',
    progress: (c) => c.borderDays,
  },
  {
    id: 'new-year-abroad',
    emoji: '🎆',
    name: 'New Year abroad',
    description: 'Wake up abroad on 1 January',
    target: 1,
    unit: 'New Year',
    progress: (c) => c.newYearDays,
  },
  {
    id: 'regular',
    emoji: '🔁',
    name: 'Regular',
    description: 'Go back to the same country 3 times',
    target: 3,
    unit: 'trips',
    progress: (c) => c.maxTripsToOneCountry,
  },
  {
    id: 'all-seasons',
    emoji: '🍂',
    name: 'All seasons',
    description: 'Travel in winter, spring, summer and autumn of one year',
    target: 4,
    unit: 'seasons',
    progress: (c) => c.maxSeasonsInYear,
  },
  {
    id: 'every-month',
    emoji: '🗓️',
    name: 'Every month',
    description: 'Travel in all 12 months of one year',
    target: 12,
    unit: 'months',
    progress: (c) => c.maxMonthsInYear,
  },
]

function buildContext(dayMap: DayMap, keys: string[]): BadgeContext {
  const subset: DayMap = new Map(keys.map((key) => [key, dayMap.get(key)!]))
  const trips = groupTrips(subset)
  const countries = new Set<string>()
  const continents = new Set<ContinentCode>()
  const perYear = new Map<
    string,
    { days: number; seasons: Set<number>; months: Set<number> }
  >()
  let borderDays = 0
  let newYearDays = 0
  for (const [key, codes] of subset) {
    for (const code of codes) {
      countries.add(code)
      const continent = CONTINENT_BY_COUNTRY[code]
      if (continent) continents.add(continent)
    }
    if (codes.length > 1) borderDays++
    if (key.endsWith('-01-01')) newYearDays++
    const month = Number(key.slice(5, 7)) - 1
    const year = perYear.get(key.slice(0, 4)) ?? {
      days: 0,
      seasons: new Set<number>(),
      months: new Set<number>(),
    }
    year.days++
    year.months.add(month)
    year.seasons.add(Math.floor(((month + 1) % 12) / 3))
    perYear.set(key.slice(0, 4), year)
  }
  const tripsPerCountry = new Map<string, number>()
  for (const trip of trips) {
    for (const code of trip.countries) {
      tripsPerCountry.set(code, (tripsPerCountry.get(code) ?? 0) + 1)
    }
  }
  const years = [...perYear.values()]
  return {
    trips,
    countries,
    continents,
    borderDays,
    newYearDays,
    maxDaysInYear: Math.max(0, ...years.map((y) => y.days)),
    maxSeasonsInYear: Math.max(0, ...years.map((y) => y.seasons.size)),
    maxMonthsInYear: Math.max(0, ...years.map((y) => y.months.size)),
    maxTripsToOneCountry: Math.max(0, ...tripsPerCountry.values()),
  }
}

export function computeBadges(dayMap: DayMap, todayKey: string): Badge[] {
  const keys = [...dayMap.keys()]
  const reachedOn = new Map<string, string>()
  for (let i = 0; i < keys.length && reachedOn.size < BADGES.length; i++) {
    const context = buildContext(dayMap, keys.slice(0, i + 1))
    for (const badge of BADGES) {
      if (!reachedOn.has(badge.id) && badge.progress(context) >= badge.target) {
        reachedOn.set(badge.id, keys[i])
      }
    }
  }
  const now = buildContext(
    dayMap,
    keys.filter((key) => key <= todayKey)
  )
  return BADGES.map(({ progress, ...badge }) => {
    const reached = reachedOn.get(badge.id) ?? null
    const earned = reached !== null && reached <= todayKey
    return {
      ...badge,
      value: Math.min(badge.target, progress(now)),
      earnedOn: earned ? reached : null,
      unlocksOn: earned ? null : reached,
    }
  })
}

export function newlyEarned(before: Badge[], after: Badge[]): Badge[] {
  const had = new Set(before.filter((b) => b.earnedOn).map((b) => b.id))
  return after.filter((b) => b.earnedOn && !had.has(b.id))
}

export function nextBadge(badges: Badge[]): Badge | null {
  return (
    badges
      .filter((b) => !b.earnedOn)
      .sort((a, b) => b.value / b.target - a.value / a.target)[0] ?? null
  )
}
