import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildYearVideoData } from './video'
import {
  EXAMPLE_YEAR,
  getExampleVisits,
  HERO_IMAGE,
  HOMEPAGE_EXAMPLES,
} from './homepage-examples'

function readJpegSize(file: string) {
  const data = readFileSync(file)
  let offset = 2
  while (offset < data.length) {
    const marker = data[offset + 1]
    const length = data.readUInt16BE(offset + 2)
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      ![0xc4, 0xc8, 0xcc].includes(marker)
    ) {
      return {
        height: data.readUInt16BE(offset + 5),
        width: data.readUInt16BE(offset + 7),
      }
    }
    offset += 2 + length
  }
  throw new Error(`No JPEG frame header in ${file}`)
}

const variants = [HERO_IMAGE, ...HOMEPAGE_EXAMPLES].flatMap((image) => [
  { theme: 'light', ...image.light },
  { theme: 'dark', ...image.dark },
])

describe('HOMEPAGE_EXAMPLES', () => {
  it.each(HOMEPAGE_EXAMPLES)(
    '$caption has separate light and dark images',
    ({ light, dark }) => {
      expect(dark.src).not.toBe(light.src)
      expect(dark.src).toBe(light.src.replace(/\.jpg$/, '-dark.jpg'))
    }
  )

  it.each(variants)(
    '$src exists with the declared size',
    ({ src, width, height }) => {
      const file = path.join(process.cwd(), 'public', src)

      expect(readJpegSize(file)).toEqual({ width, height })
    }
  )
})

describe('getExampleVisits', () => {
  it('matches the trips and stats in the example images', () => {
    const { stats, countries } = buildYearVideoData(
      getExampleVisits(),
      EXAMPLE_YEAR
    )

    expect(countries).toHaveLength(10)
    expect(stats.totalCountries).toBe(10)
    expect(stats.totalDays).toBe(67)
    expect(stats.busiestMonth?.month).toBe(5)
    expect(stats.topCountries.slice(0, 3)).toEqual(
      expect.arrayContaining([
        { countryCode: 'AU', days: 10 },
        { countryCode: 'MY', days: 9 },
        { countryCode: 'KR', days: 9 },
      ])
    )
  })

  it('gives every visit a unique id', () => {
    const visits = getExampleVisits()

    expect(new Set(visits.map((visit) => visit.id)).size).toBe(visits.length)
  })
})
