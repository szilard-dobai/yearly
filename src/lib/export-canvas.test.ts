import { describe, expect, it } from 'vitest'
import {
  EXPORT_CANVAS,
  EXPORT_FOOTER_HEIGHT,
  EXPORT_FORMATS,
  EXPORT_FRAME,
  EXPORT_HEADER_HEIGHT,
  estimateStatValueWidth,
  fitRankNameSize,
  fitStatValueSize,
  getExportContentBox,
  getMonthLayout,
  getRankNameWidth,
  getRankRowSizes,
  getStatsLayout,
  getYearLayout,
  isExportFormat,
  STATS_TILE_ROWS,
  type ExportFormat,
} from './export-canvas'

const LONGEST_COUNTRY = 'Saint Vincent and the Grenadines'

describe('export canvas sizes', () => {
  it('uses 9:16 for Stories and 3:4 for feed posts at the same width', () => {
    expect(EXPORT_CANVAS.story).toMatchObject({ width: 1080, height: 1920 })
    expect(EXPORT_CANVAS.feed).toMatchObject({ width: 1080, height: 1440 })
    expect(EXPORT_CANVAS.story.width / EXPORT_CANVAS.story.height).toBe(9 / 16)
    expect(EXPORT_CANVAS.feed.width / EXPORT_CANVAS.feed.height).toBe(3 / 4)
  })

  it('accepts only known formats', () => {
    expect(EXPORT_FORMATS.every(isExportFormat)).toBe(true)
    expect(isExportFormat('square')).toBe(false)
    expect(isExportFormat(undefined)).toBe(false)
  })

  it.each(EXPORT_FORMATS)(
    'splits the %s canvas into padding, title, content and watermark',
    (format) => {
      const box = getExportContentBox(format)

      expect(box.width).toBe(
        EXPORT_CANVAS[format].width - EXPORT_FRAME.padding * 2
      )
      expect(
        EXPORT_FRAME.padding * 2 +
          EXPORT_HEADER_HEIGHT +
          box.height +
          EXPORT_FOOTER_HEIGHT
      ).toBe(EXPORT_CANVAS[format].height)
    }
  )

  it('sizes the watermark in canvas pixels', () => {
    expect(EXPORT_FRAME.watermarkSize).toBe(29)
    expect(EXPORT_FOOTER_HEIGHT).toBeGreaterThan(EXPORT_FRAME.watermarkSize)
  })
})

describe('getYearLayout', () => {
  const cases = [2024, 2025, 2026, 2027].flatMap((year) =>
    [0, 1, 6].flatMap((weekStartsOn) =>
      EXPORT_FORMATS.map((format) => ({ year, weekStartsOn, format }))
    )
  )

  it.each(cases)(
    'fills the $format content box for $year starting on day $weekStartsOn',
    ({ year, weekStartsOn, format }) => {
      const layout = getYearLayout(year, weekStartsOn, format)
      const box = getExportContentBox(format)
      const weeks = layout.rowWeeks.reduce((sum, w) => sum + w, 0)
      const height =
        layout.rowWeeks.length * layout.labelHeight +
        weeks * layout.cellHeight +
        (layout.rowWeeks.length - 1) * layout.rowGap
      const width =
        layout.columns * 7 * layout.cellWidth +
        (layout.columns - 1) * layout.columnGap

      expect(height).toBeCloseTo(box.height, 6)
      expect(width).toBeCloseTo(box.width, 6)
      expect(layout.flagSize).toBeLessThanOrEqual(layout.cellWidth)
      expect(layout.flagSize).toBeLessThanOrEqual(layout.cellHeight)
      expect(layout.daySize).toBeLessThan(layout.cellHeight)
    }
  )

  it('keeps the 3×4 grid and gives each month row the tallest month in it', () => {
    const layout = getYearLayout(2026, 1, 'story')

    expect(layout.columns).toBe(3)
    expect(layout.rowWeeks).toEqual([6, 5, 6, 6])
  })

  it('draws the same cells in both formats, with shorter rows in the feed', () => {
    const story = getYearLayout(2026, 1, 'story')
    const feed = getYearLayout(2026, 1, 'feed')

    expect(feed.cellWidth).toBe(story.cellWidth)
    expect(feed.cellHeight).toBeLessThan(story.cellHeight)
    expect(feed.flagSize).toBeGreaterThanOrEqual(30)
    expect(feed.daySize).toBeGreaterThanOrEqual(22)
  })
})

describe('getMonthLayout', () => {
  const months = [
    { year: 2026, month: 1, weekStartsOn: 0, weeks: 4 },
    { year: 2026, month: 5, weekStartsOn: 1, weeks: 5 },
    { year: 2026, month: 2, weekStartsOn: 1, weeks: 6 },
  ]
  const cases = months.flatMap((month) =>
    EXPORT_FORMATS.flatMap((format) =>
      [0, 1, 3, 5].map((countryCount) => ({ ...month, format, countryCount }))
    )
  )

  it.each(cases)(
    'fills the $format box for a $weeks-week month with $countryCount countries',
    ({ year, month, weekStartsOn, weeks, format, countryCount }) => {
      const layout = getMonthLayout(
        year,
        month,
        weekStartsOn,
        format,
        countryCount
      )
      const tileRows = 4 / layout.tileColumns
      const list =
        layout.countries > 0
          ? layout.sectionGap +
            layout.listHeaderHeight +
            layout.countries * layout.rowHeight +
            (layout.countries - 1) * layout.rowGap
          : 0
      const height =
        layout.weekdayHeight +
        weeks * layout.dayHeight +
        layout.sectionGap +
        tileRows * layout.tileHeight +
        (tileRows - 1) * layout.tileGap +
        list

      expect(layout.weeks).toBe(weeks)
      expect(height).toBeCloseTo(getExportContentBox(format).height, 6)
      expect(layout.flagSize).toBeLessThan(layout.dayHeight)
      expect(layout.dayHeight).toBeGreaterThan(80)
    }
  )

  it('lists five countries in a Story and three in a feed post', () => {
    expect(getMonthLayout(2026, 5, 1, 'story', 7).countries).toBe(5)
    expect(getMonthLayout(2026, 5, 1, 'feed', 7).countries).toBe(3)
    expect(getMonthLayout(2026, 5, 1, 'feed', 2).countries).toBe(2)
  })
})

describe('getStatsLayout', () => {
  const cases = EXPORT_FORMATS.flatMap((format) =>
    [0, 1, 2, 5, 9].map((countryCount) => ({ format, countryCount }))
  )

  it.each(cases)(
    'fills the $format box with $countryCount top countries',
    ({ format, countryCount }) => {
      const layout = getStatsLayout(format, countryCount)
      const list =
        layout.countries > 0
          ? layout.sectionGap +
            layout.listHeaderHeight +
            layout.countries * layout.rowHeight +
            (layout.countries - 1) * layout.rowGap
          : 0
      const tiles =
        STATS_TILE_ROWS * layout.tileHeight +
        (STATS_TILE_ROWS - 1) * layout.tileGap

      expect(layout.countries).toBe(Math.min(countryCount, 5))
      expect(tiles + list).toBeCloseTo(getExportContentBox(format).height, 6)
      expect(layout.tileValueSize).toBeGreaterThanOrEqual(56)
      expect(layout.tileValueSize).toBeLessThanOrEqual(120)
      expect(
        layout.tilePadding * 2 +
          layout.tileLabelSize * 1.2 +
          layout.tileValueSize
      ).toBeLessThan(layout.tileHeight)
    }
  )

  it('grows the tiles when there are fewer countries to list', () => {
    const five = getStatsLayout('story', 5)
    const one = getStatsLayout('story', 1)

    expect(one.tileHeight).toBeGreaterThan(five.tileHeight)
    expect(one.tileValueSize).toBeGreaterThan(five.tileValueSize)
  })
})

describe('fitStatValueSize', () => {
  it('keeps the base size when every value fits', () => {
    expect(fitStatValueSize([{ value: { value: '10' }, width: 300 }], 96)).toBe(
      96
    )
  })

  it.each<{
    format: ExportFormat
    countries: number
    value: string
    unit?: string
  }>([
    { format: 'story', countries: 1, value: '100.0%' },
    { format: 'story', countries: 1, value: '365.0', unit: 'days' },
    { format: 'story', countries: 5, value: '365.0', unit: 'days' },
    { format: 'feed', countries: 1, value: '365.0', unit: 'days' },
    { format: 'feed', countries: 5, value: '100.0%' },
  ])(
    'fits $value $unit in a $format stats tile with $countries countries',
    ({ format, countries, value, unit }) => {
      const layout = getStatsLayout(format, countries)
      const size = fitStatValueSize(
        [{ value: { value, unit }, width: layout.tileContentWidth }],
        layout.tileValueSize
      )

      expect(size).toBeLessThanOrEqual(layout.tileValueSize)
      expect(estimateStatValueWidth({ value, unit }, size)).toBeLessThanOrEqual(
        layout.tileContentWidth
      )
    }
  )

  it('shrinks the widest values in a tall Story tile', () => {
    const layout = getStatsLayout('story', 1)

    expect(
      fitStatValueSize(
        [{ value: { value: '100.0%' }, width: layout.tileContentWidth }],
        layout.tileValueSize
      )
    ).toBeLessThan(layout.tileValueSize)
  })

  it('fits the longest busiest month in the wide tile', () => {
    const layout = getStatsLayout('story', 1)
    const value = { value: 'September', unit: '30 days' }
    const size = fitStatValueSize(
      [{ value, width: layout.wideTileContentWidth }],
      layout.tileValueSize
    )

    expect(estimateStatValueWidth(value, size)).toBeLessThanOrEqual(
      layout.wideTileContentWidth
    )
  })

  it('uses one size for every tile so the values line up', () => {
    const size = fitStatValueSize(
      [
        { value: { value: '3' }, width: 300 },
        { value: { value: '100.0%' }, width: 300 },
      ],
      120
    )

    expect(size).toBe(
      fitStatValueSize([{ value: { value: '100.0%' }, width: 300 }], 120)
    )
  })
})

describe('fitRankNameSize', () => {
  it.each(EXPORT_FORMATS)(
    'keeps short names at full size in a %s stats list',
    (format) => {
      const layout = getStatsLayout(format, 5)

      expect(
        fitRankNameSize(['Japan', 'France'], layout.rank, layout.rowWidth)
      ).toBe(layout.rank.nameSize)
    }
  )

  const lists = EXPORT_FORMATS.flatMap((format) => [
    { format, list: 'stats', layout: getStatsLayout(format, 5) },
    { format, list: 'month', layout: getMonthLayout(2026, 5, 1, format, 5) },
  ])

  it.each(lists)(
    'fits the longest country name in a $format $list list',
    ({ layout }) => {
      const size = fitRankNameSize(
        ['Japan', LONGEST_COUNTRY],
        layout.rank,
        layout.rowWidth
      )

      expect(size).toBeLessThanOrEqual(layout.rank.nameSize)
      expect(size).toBeGreaterThanOrEqual(24)
      expect(LONGEST_COUNTRY.length * size * 0.53).toBeLessThanOrEqual(
        getRankNameWidth(layout.rank, layout.rowWidth)
      )
    }
  )

  it('shrinks the whole Story stats list when one name is long', () => {
    const layout = getStatsLayout('story', 2)

    expect(
      fitRankNameSize(['Japan', LONGEST_COUNTRY], layout.rank, layout.rowWidth)
    ).toBeLessThan(layout.rank.nameSize)
  })

  it('scales the rank row parts with its height', () => {
    const small = getRankRowSizes(72)
    const large = getRankRowSizes(112)

    expect(large.nameSize).toBeGreaterThan(small.nameSize)
    expect(large.flagSize).toBeLessThan(large.height)
    expect(large.medalSize).toBeLessThan(large.height)
  })
})
