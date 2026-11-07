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
  light: { src: '/example_light.jpg', width: 2400, height: 3696 },
  dark: { src: '/example_dark.jpg', width: 2400, height: 3696 },
  alt: 'A 2026 travel calendar made with Yearly, with country flags on the days spent in Germany, Romania, Hungary, Spain, Serbia, Greece, Italy and the UK',
}

export const HOMEPAGE_EXAMPLES: HomepageExample[] = [
  {
    light: {
      src: '/examples/travel-calendar-2026-yearly.jpg',
      width: 1200,
      height: 1848,
    },
    dark: {
      src: '/examples/travel-calendar-2026-yearly-dark.jpg',
      width: 1200,
      height: 1848,
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
      width: 1200,
      height: 1739,
    },
    dark: {
      src: '/examples/travel-stats-2026-yearly-dark.jpg',
      width: 1200,
      height: 1739,
    },
    alt: 'Travel statistics for 2026 made with Yearly: 10 countries, 67 days abroad, June as the busiest month, and Australia, Malaysia and South Korea as the top countries',
    caption: 'Travel stats',
  },
]
