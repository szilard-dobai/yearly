import { getMonthData } from './calendar'

export const EXPORT_FORMATS = ['story', 'feed'] as const

export type ExportFormat = (typeof EXPORT_FORMATS)[number]

export const DEFAULT_EXPORT_FORMAT: ExportFormat = 'story'

export function isExportFormat(value: unknown): value is ExportFormat {
  return EXPORT_FORMATS.includes(value as ExportFormat)
}

export const EXPORT_CANVAS: Record<
  ExportFormat,
  { width: number; height: number; label: string; ratio: string }
> = {
  story: { width: 1080, height: 1920, label: 'Story', ratio: '9:16' },
  feed: { width: 1080, height: 1440, label: 'Feed', ratio: '3:4' },
}

export const EXPORT_PIXEL_RATIO = 2

export const EXPORT_JPEG_QUALITY = 0.95

export const EXPORT_FRAME = {
  padding: 64,
  titleSize: 80,
  titleGap: 28,
  divider: 2,
  headerGap: 36,
  watermarkSize: 29,
  watermarkGap: 32,
} as const

export const EXPORT_WATERMARK_LINE = Math.ceil(
  EXPORT_FRAME.watermarkSize * 1.15
)

export const EXPORT_HEADER_HEIGHT =
  EXPORT_FRAME.titleSize +
  EXPORT_FRAME.titleGap +
  EXPORT_FRAME.divider +
  EXPORT_FRAME.headerGap

export const EXPORT_FOOTER_HEIGHT =
  EXPORT_FRAME.watermarkGap * 2 + EXPORT_FRAME.divider + EXPORT_WATERMARK_LINE

export function getExportContentBox(format: ExportFormat) {
  const { width, height } = EXPORT_CANVAS[format]
  return {
    width: width - EXPORT_FRAME.padding * 2,
    height:
      height -
      EXPORT_FRAME.padding * 2 -
      EXPORT_HEADER_HEIGHT -
      EXPORT_FOOTER_HEIGHT,
  }
}

const YEAR_COLUMNS = 3
const YEAR_COLUMN_GAP = 40
const YEAR_LABEL_SIZE = 30
const YEAR_LABEL_HEIGHT = 48
const YEAR_ROW_GAP: Record<ExportFormat, number> = { story: 32, feed: 20 }

export function getYearLayout(
  year: number,
  weekStartsOn: number,
  format: ExportFormat
) {
  const box = getExportContentBox(format)
  const monthWeeks = Array.from(
    { length: 12 },
    (_, month) => getMonthData(year, month, weekStartsOn).length
  )
  const rowWeeks = Array.from({ length: 12 / YEAR_COLUMNS }, (_, row) =>
    Math.max(...monthWeeks.slice(row * YEAR_COLUMNS, (row + 1) * YEAR_COLUMNS))
  )
  const totalWeeks = rowWeeks.reduce((sum, weeks) => sum + weeks, 0)
  const rowGap = YEAR_ROW_GAP[format]
  const cellWidth =
    (box.width - YEAR_COLUMN_GAP * (YEAR_COLUMNS - 1)) / (YEAR_COLUMNS * 7)
  const cellHeight =
    (box.height -
      rowWeeks.length * YEAR_LABEL_HEIGHT -
      (rowWeeks.length - 1) * rowGap) /
    totalWeeks

  return {
    columns: YEAR_COLUMNS,
    columnGap: YEAR_COLUMN_GAP,
    rowGap,
    rowWeeks,
    labelSize: YEAR_LABEL_SIZE,
    labelHeight: YEAR_LABEL_HEIGHT,
    cellWidth,
    cellHeight,
    daySize: Math.round(Math.min(cellWidth * 0.58, cellHeight * 0.66)),
    flagSize: Math.round(Math.min(cellWidth * 0.86, cellHeight * 0.92)),
  }
}

export function getRankRowSizes(height: number) {
  const nameSize = Math.min(36, Math.round(height * 0.37))
  return {
    height,
    paddingX: Math.round(height * 0.3),
    gap: Math.round(height * 0.24),
    rankWidth: Math.round(height * 0.5),
    medalSize: Math.round(height * 0.44),
    rankSize: Math.round(nameSize * 0.9),
    flagSize: Math.min(52, Math.round(height * 0.48)),
    nameSize,
    pillSize: Math.round(nameSize * 0.78),
  }
}

export type RankRowSizes = ReturnType<typeof getRankRowSizes>

const NAME_CHAR_WIDTH = 0.53
const VALUE_CHAR_WIDTH = 0.62

export const UNIT_SCALE = 0.45

export interface StatValue {
  value: string
  unit?: string
}

export function estimateStatValueWidth(
  { value, unit }: StatValue,
  size: number
) {
  const unitWidth = unit
    ? (0.2 + unit.length * NAME_CHAR_WIDTH * UNIT_SCALE) * size
    : 0
  return value.length * VALUE_CHAR_WIDTH * size + unitWidth
}

export function fitStatValueSize(
  values: { value: StatValue; width: number }[],
  size: number
) {
  return Math.floor(
    Math.min(
      size,
      ...values.map(
        ({ value, width }) =>
          (size * width) / estimateStatValueWidth(value, size)
      )
    )
  )
}

export function getRankNameWidth(sizes: RankRowSizes, rowWidth: number) {
  const pillWidth = sizes.pillSize * (8 * NAME_CHAR_WIDTH + 1.4)
  return (
    rowWidth -
    sizes.paddingX * 2 -
    sizes.rankWidth -
    sizes.flagSize -
    pillWidth -
    sizes.gap * 3
  )
}

export function fitRankNameSize(
  names: string[],
  sizes: RankRowSizes,
  rowWidth: number
) {
  const longest = Math.max(1, ...names.map((name) => name.length))
  return Math.min(
    sizes.nameSize,
    Math.floor(getRankNameWidth(sizes, rowWidth) / (longest * NAME_CHAR_WIDTH))
  )
}

const MONTH_SPEC = {
  story: {
    weekdayHeight: 44,
    weekdaySize: 22,
    sectionGap: 40,
    tileColumns: 2,
    tileHeight: 136,
    tileGap: 16,
    tileLabelSize: 22,
    tileValueSize: 52,
    maxCountries: 5,
    listHeaderSize: 30,
    listHeaderHeight: 52,
    rowHeight: 84,
    rowGap: 12,
  },
  feed: {
    weekdayHeight: 40,
    weekdaySize: 20,
    sectionGap: 28,
    tileColumns: 4,
    tileHeight: 112,
    tileGap: 14,
    tileLabelSize: 20,
    tileValueSize: 44,
    maxCountries: 3,
    listHeaderSize: 26,
    listHeaderHeight: 44,
    rowHeight: 72,
    rowGap: 10,
  },
} as const

export function getMonthLayout(
  year: number,
  month: number,
  weekStartsOn: number,
  format: ExportFormat,
  countryCount: number
) {
  const spec = MONTH_SPEC[format]
  const box = getExportContentBox(format)
  const weeks = getMonthData(year, month, weekStartsOn).length
  const countries = Math.min(countryCount, spec.maxCountries)
  const tileRows = Math.ceil(4 / spec.tileColumns)
  const tilesHeight = tileRows * spec.tileHeight + (tileRows - 1) * spec.tileGap
  const listHeight =
    countries > 0
      ? spec.sectionGap +
        spec.listHeaderHeight +
        countries * spec.rowHeight +
        (countries - 1) * spec.rowGap
      : 0
  const calendarHeight =
    box.height - spec.weekdayHeight - spec.sectionGap - tilesHeight - listHeight
  const dayHeight = calendarHeight / weeks
  const dayWidth = box.width / 7
  const tilePadding = Math.round(spec.tileHeight * 0.18)

  return {
    ...spec,
    countries,
    weeks,
    rowWidth: box.width,
    dayWidth,
    dayHeight,
    daySize: Math.round(Math.min(30, dayHeight * 0.32)),
    flagSize: Math.round(Math.min(64, dayHeight * 0.66, dayWidth * 0.5)),
    tilePadding,
    tileContentWidth:
      (box.width - (spec.tileColumns - 1) * spec.tileGap) / spec.tileColumns -
      tilePadding * 2,
    rank: getRankRowSizes(spec.rowHeight),
  }
}

const STATS_SPEC = {
  story: {
    tileGap: 24,
    sectionGap: 48,
    tileLabelSize: 24,
    listHeaderSize: 32,
    listHeaderHeight: 56,
    rowHeight: 112,
    rowGap: 16,
  },
  feed: {
    tileGap: 20,
    sectionGap: 32,
    tileLabelSize: 21,
    listHeaderSize: 28,
    listHeaderHeight: 48,
    rowHeight: 84,
    rowGap: 12,
  },
} as const

export const STATS_TILE_ROWS = 3

export const STATS_MAX_COUNTRIES = 5

export function getStatsLayout(format: ExportFormat, countryCount: number) {
  const spec = STATS_SPEC[format]
  const box = getExportContentBox(format)
  const countries = Math.min(countryCount, STATS_MAX_COUNTRIES)
  const listHeight =
    countries > 0
      ? spec.sectionGap +
        spec.listHeaderHeight +
        countries * spec.rowHeight +
        (countries - 1) * spec.rowGap
      : 0
  const tileHeight =
    (box.height - listHeight - (STATS_TILE_ROWS - 1) * spec.tileGap) /
    STATS_TILE_ROWS
  const tilePadding = Math.round(Math.min(36, tileHeight * 0.16))

  return {
    ...spec,
    countries,
    rowWidth: box.width,
    tileHeight,
    tilePadding,
    tileContentWidth: (box.width - spec.tileGap) / 2 - tilePadding * 2,
    wideTileContentWidth: box.width - tilePadding * 2,
    tileValueSize: Math.round(Math.min(120, Math.max(56, tileHeight * 0.36))),
    rank: getRankRowSizes(spec.rowHeight),
  }
}
