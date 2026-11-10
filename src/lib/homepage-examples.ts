import type { CountryVisit } from '@/lib/types'

export interface HomepageExampleImage {
  src: string
  width: number
  height: number
}

export interface HomepageImagePair {
  light: HomepageExampleImage
  dark: HomepageExampleImage
  alt: string
}

export interface HomepageExample extends HomepageImagePair {
  caption: string
}

export const HERO_IMAGE: HomepageImagePair = {
  light: { src: '/example_light.jpg', width: 2160, height: 2880 },
  dark: { src: '/example_dark.jpg', width: 2160, height: 2880 },
  alt: 'A 2026 travel calendar made with Yearly, with country flags on the days spent in Germany, Romania, Hungary, Spain, Serbia, Greece, Italy and the UK',
}

export const HOMEPAGE_EXAMPLES: HomepageExample[] = [
  {
    light: {
      src: '/examples/travel-calendar-2026-yearly.jpg',
      width: 1080,
      height: 1920,
    },
    dark: {
      src: '/examples/travel-calendar-2026-yearly-dark.jpg',
      width: 1080,
      height: 1920,
    },
    alt: 'A 2026 travel calendar where country flags replace the days spent in Malaysia, Japan, France, Italy, South Korea and Australia, made with Yearly',
    caption: 'Full year',
  },
  {
    light: {
      src: '/examples/travel-calendar-june-2026-yearly.jpg',
      width: 1080,
      height: 1920,
    },
    dark: {
      src: '/examples/travel-calendar-june-2026-yearly-dark.jpg',
      width: 1080,
      height: 1920,
    },
    alt: 'A June 2026 travel calendar with flags on the days spent in Vietnam, France, Italy and the UK, followed by the month’s travel stats, made with Yearly',
    caption: 'One month',
  },
  {
    light: {
      src: '/examples/travel-stats-2026-yearly.jpg',
      width: 1080,
      height: 1920,
    },
    dark: {
      src: '/examples/travel-stats-2026-yearly-dark.jpg',
      width: 1080,
      height: 1920,
    },
    alt: 'Travel statistics for 2026 made with Yearly: 10 countries, 67 days abroad, June as the busiest month, and Australia, Malaysia and South Korea as the top countries',
    caption: 'Travel stats',
  },
]

export const EXAMPLE_YEAR = 2026

const EXAMPLE_TRIPS: { countryCode: string; from: string; to: string }[] = [
  { countryCode: 'MY', from: '01-09', to: '01-11' },
  { countryCode: 'JP', from: '02-14', to: '02-21' },
  { countryCode: 'ID', from: '04-03', to: '04-06' },
  { countryCode: 'MY', from: '05-01', to: '05-03' },
  { countryCode: 'VN', from: '05-29', to: '06-01' },
  { countryCode: 'FR', from: '06-18', to: '06-24' },
  { countryCode: 'IT', from: '06-25', to: '06-30' },
  { countryCode: 'GB', from: '06-30', to: '07-04' },
  { countryCode: 'TH', from: '08-07', to: '08-10' },
  { countryCode: 'KR', from: '10-02', to: '10-10' },
  { countryCode: 'MY', from: '11-06', to: '11-08' },
  { countryCode: 'TH', from: '11-09', to: '11-10' },
  { countryCode: 'AU', from: '12-19', to: '12-28' },
]

function toDate(monthDay: string): Date {
  const [month, day] = monthDay.split('-').map(Number)
  return new Date(EXAMPLE_YEAR, month - 1, day)
}

export function getExampleVisits(): CountryVisit[] {
  return EXAMPLE_TRIPS.flatMap(({ countryCode, from, to }) => {
    const visits: CountryVisit[] = []
    const end = toDate(to)
    for (
      const date = toDate(from);
      date <= end;
      date.setDate(date.getDate() + 1)
    ) {
      visits.push({
        id: `example-${countryCode}-${date.getMonth() + 1}-${date.getDate()}`,
        countryCode,
        date: new Date(date),
      })
    }
    return visits
  })
}
