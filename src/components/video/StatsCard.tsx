import { MONTH_NAMES } from '@/lib/constants'
import type { FlagDisplayMode } from '@/lib/contexts/SettingsContext'
import {
  EXPORT_CANVAS,
  EXPORT_FRAME,
  EXPORT_WATERMARK_LINE,
  fitRankNameSize,
  fitStatValueSize,
  getExportContentBox,
  getStatsLayout,
  UNIT_SCALE,
  type RankRowSizes,
  type StatValue,
} from '@/lib/export-canvas'
import type { YearVideoData } from '@/lib/video'
import type { CSSProperties, ReactNode } from 'react'
import { useCurrentFrame } from 'remotion'
import { getCountryName } from '../export/ExportBlocks'
import { VideoWatermark } from './Brand'
import {
  countUp,
  EMOJI_FONT,
  fadeUp,
  type Palette,
  plural,
  SANS,
} from './tokens'
import { VideoFlag } from './VideoFlag'

const MEDALS = ['🥇', '🥈', '🥉']

export function StatTile({
  label,
  children,
  palette,
  labelSize = 20,
  style,
}: {
  label: string
  children: ReactNode
  palette: Palette
  labelSize?: number
  style?: CSSProperties
}) {
  return (
    <div
      style={{
        padding: 32,
        borderRadius: 32,
        border: `1px solid ${palette.border}`,
        background: palette.statBg,
        minWidth: 0,
        ...style,
      }}
    >
      <div
        style={{ fontSize: labelSize, color: palette.muted, marginBottom: 8 }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}

export function RankRow({
  rank,
  code,
  days,
  palette,
  flagMode,
  style,
}: {
  rank: number
  code: string
  days: number
  palette: Palette
  flagMode: FlagDisplayMode
  style?: CSSProperties
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        padding: 28,
        borderRadius: 32,
        border: `1px solid ${palette.border}`,
        background: palette.statBg,
        ...style,
      }}
    >
      <div
        style={{
          width: 48,
          display: 'flex',
          justifyContent: 'center',
          fontSize: rank <= 3 ? 48 : 32,
          fontWeight: 600,
          color: palette.muted,
          fontFamily: rank <= 3 ? EMOJI_FONT : SANS,
          lineHeight: 1,
        }}
      >
        {rank <= 3 ? MEDALS[rank - 1] : `${rank}.`}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          flex: 1,
          minWidth: 0,
        }}
      >
        <VideoFlag code={code} size={48} mode={flagMode} />
        <span
          style={{
            fontSize: 32,
            fontWeight: 500,
            color: palette.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {getCountryName(code)}
        </span>
      </div>
      <span
        style={{
          padding: '8px 16px',
          borderRadius: 999,
          background: palette.pill,
          fontSize: 24,
          fontWeight: 500,
          color: palette.pillText,
          whiteSpace: 'nowrap',
        }}
      >
        {days} {plural(days, 'day', 'days')}
      </span>
    </div>
  )
}

function CardTile({
  label,
  value,
  palette,
  labelSize,
  valueSize,
  height,
  padding,
  wide,
  style,
}: {
  label: string
  value: StatValue
  palette: Palette
  labelSize: number
  valueSize: number
  height: number
  padding: number
  wide?: boolean
  style?: CSSProperties
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
        minWidth: 0,
        height,
        padding,
        borderRadius: 32,
        border: `1px solid ${palette.border}`,
        background: palette.statBg,
        gridColumn: wide ? 'span 2' : undefined,
        ...style,
      }}
    >
      <div
        style={{
          fontSize: labelSize,
          lineHeight: 1.2,
          color: palette.label,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: valueSize,
          lineHeight: 1,
          fontWeight: 700,
          color: palette.text,
          whiteSpace: 'nowrap',
        }}
      >
        {value.value}
        {value.unit && (
          <span
            style={{
              marginLeft: '0.2em',
              fontSize: `${UNIT_SCALE}em`,
              fontWeight: 400,
              color: palette.label,
            }}
          >
            {value.unit}
          </span>
        )}
      </div>
    </div>
  )
}

function CardRankRow({
  rank,
  code,
  days,
  sizes,
  nameSize,
  palette,
  flagMode,
  style,
}: {
  rank: number
  code: string
  days: number
  sizes: RankRowSizes
  nameSize: number
  palette: Palette
  flagMode: FlagDisplayMode
  style?: CSSProperties
}) {
  const medal = rank <= MEDALS.length

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        boxSizing: 'border-box',
        height: sizes.height,
        paddingInline: sizes.paddingX,
        gap: sizes.gap,
        borderRadius: 32,
        border: `1px solid ${palette.border}`,
        background: palette.statBg,
        ...style,
      }}
    >
      <span
        style={{
          display: 'flex',
          flexShrink: 0,
          justifyContent: 'center',
          width: sizes.rankWidth,
          fontFamily: medal ? EMOJI_FONT : SANS,
          fontSize: medal ? sizes.medalSize : sizes.rankSize,
          fontWeight: 600,
          lineHeight: 1,
          color: palette.label,
        }}
      >
        {medal ? MEDALS[rank - 1] : `${rank}.`}
      </span>
      <span
        style={{
          display: 'flex',
          flexShrink: 0,
          alignItems: 'center',
          justifyContent: 'center',
          width: sizes.flagSize,
        }}
      >
        <VideoFlag code={code} size={sizes.flagSize} mode={flagMode} />
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: nameSize,
          lineHeight: 1.2,
          fontWeight: 500,
          color: palette.text,
        }}
      >
        {getCountryName(code)}
      </span>
      <span
        style={{
          flexShrink: 0,
          borderRadius: 999,
          background: palette.pill,
          fontSize: sizes.pillSize,
          fontWeight: 500,
          lineHeight: 1,
          color: palette.pillText,
          whiteSpace: 'nowrap',
          padding: `${sizes.pillSize * 0.4}px ${sizes.pillSize * 0.7}px`,
        }}
      >
        {days} {plural(days, 'day', 'days')}
      </span>
    </div>
  )
}

export function StatsCard({
  data,
  palette,
  flagMode,
  statsStart,
  listStart,
}: {
  data: YearVideoData
  palette: Palette
  flagMode: FlagDisplayMode
  statsStart: number
  listStart: number
}) {
  const frame = useCurrentFrame()
  const s = data.stats
  const { width, height } = EXPORT_CANVAS.story
  const content = getExportContentBox('story')
  const layout = getStatsLayout('story', s.topCountries.length)
  const topCountries = s.topCountries.slice(0, layout.countries)

  const count = (i: number, to: number, digits = 0) =>
    countUp(frame, statsStart + i * 5, 36, to).toFixed(digits)
  const tileStyle = (i: number) => fadeUp(frame, statsStart + i * 5, 18, 36)
  const rowStyle = (i: number) => fadeUp(frame, listStart + i * 5, 18, 36)

  const busiestMonth: StatValue = s.busiestMonth
    ? {
        value: MONTH_NAMES[s.busiestMonth.month],
        unit: `${s.busiestMonth.days} ${plural(s.busiestMonth.days, 'day', 'days')}`,
      }
    : { value: '–' }
  const tiles: {
    label: string
    final: StatValue
    shown: StatValue
    wide?: boolean
  }[] = [
    {
      label: 'Countries Visited',
      final: { value: String(s.totalCountries) },
      shown: { value: count(0, s.totalCountries) },
    },
    {
      label: 'Days Abroad',
      final: { value: String(s.totalDays) },
      shown: { value: count(1, s.totalDays) },
    },
    {
      label: 'Average Trip',
      final: { value: s.averageTripLength.toFixed(1), unit: 'days' },
      shown: { value: count(2, s.averageTripLength, 1), unit: 'days' },
    },
    {
      label: 'Year Abroad',
      final: { value: `${s.percentTraveled.toFixed(1)}%` },
      shown: { value: `${count(3, s.percentTraveled, 1)}%` },
    },
    {
      label: 'Busiest Month',
      final: busiestMonth,
      shown: busiestMonth,
      wide: true,
    },
  ]
  const valueSize = fitStatValueSize(
    tiles.map(({ final, wide }) => ({
      value: final,
      width: wide ? layout.wideTileContentWidth : layout.tileContentWidth,
    })),
    layout.tileValueSize
  )
  const nameSize = fitRankNameSize(
    topCountries.map(({ countryCode }) => getCountryName(countryCode)),
    layout.rank,
    layout.rowWidth
  )

  return (
    <div
      style={{
        width,
        height,
        padding: EXPORT_FRAME.padding,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        background: palette.card,
        fontFamily: SANS,
        color: palette.text,
      }}
    >
      <div
        style={{
          boxSizing: 'border-box',
          fontSize: EXPORT_FRAME.titleSize,
          lineHeight: `${EXPORT_FRAME.titleSize}px`,
          fontWeight: 700,
          color: palette.red,
          whiteSpace: 'nowrap',
          paddingBottom: EXPORT_FRAME.titleGap,
          borderBottom: `${EXPORT_FRAME.divider}px solid ${palette.divider}`,
          marginBottom: EXPORT_FRAME.headerGap,
        }}
      >
        {data.year}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: content.width,
          height: content.height,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: layout.tileGap,
          }}
        >
          {tiles.map((tile, i) => (
            <CardTile
              key={tile.label}
              label={tile.label}
              value={tile.shown}
              palette={palette}
              labelSize={layout.tileLabelSize}
              valueSize={valueSize}
              height={layout.tileHeight}
              padding={layout.tilePadding}
              wide={tile.wide}
              style={tileStyle(i)}
            />
          ))}
        </div>

        {layout.countries > 0 && (
          <div style={{ marginTop: layout.sectionGap }}>
            <div
              style={{
                height: layout.listHeaderHeight,
                fontSize: layout.listHeaderSize,
                fontWeight: 600,
                lineHeight: 1,
                ...rowStyle(0),
              }}
            >
              Top Countries
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: layout.rowGap,
              }}
            >
              {topCountries.map((item, i) => (
                <CardRankRow
                  key={item.countryCode}
                  rank={i + 1}
                  code={item.countryCode}
                  days={item.days}
                  sizes={layout.rank}
                  nameSize={nameSize}
                  palette={palette}
                  flagMode={flagMode}
                  style={rowStyle(i + 1)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          boxSizing: 'border-box',
          marginTop: EXPORT_FRAME.watermarkGap,
          paddingTop: EXPORT_FRAME.watermarkGap,
          borderTop: `${EXPORT_FRAME.divider}px solid ${palette.divider}`,
          height:
            EXPORT_FRAME.watermarkGap +
            EXPORT_FRAME.divider +
            EXPORT_WATERMARK_LINE,
        }}
      >
        <VideoWatermark palette={palette} size={EXPORT_FRAME.watermarkSize} />
      </div>
    </div>
  )
}
