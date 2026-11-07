import { getMonthData } from '@/lib/calendar'
import { MONTH_NAMES_SHORT } from '@/lib/constants'
import type { FlagDisplayMode } from '@/lib/contexts/SettingsContext'
import { EXPORT_FRAME, getExportContentBox } from '@/lib/export-canvas'
import { toDayKey } from '@/lib/selection'
import { memo, useMemo } from 'react'
import { interpolate } from 'remotion'
import { VideoWatermark } from './Brand'
import { type Palette, clamp, popAt, SANS } from './tokens'
import { DayFlags } from './VideoFlag'

export const SETTLED = 40

type DayCellProps = {
  day: number
  codes?: string[]
  since: number
  size: number
  color: string
  flagMode: FlagDisplayMode
}

export const DayCell = memo(function DayCell({
  day,
  codes,
  since,
  size,
  color,
  flagMode,
}: DayCellProps) {
  const shown = !!codes?.length && since >= 0
  const settled = since >= SETTLED
  const scale = shown ? (settled ? 1 : popAt(since)) : 0
  const numberOpacity = shown ? interpolate(since, [0, 4], [1, 0], clamp) : 1
  const flagSize = size * 0.76

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {numberOpacity > 0 && (
        <span
          style={{
            position: 'absolute',
            fontSize: size * 0.4,
            fontWeight: 500,
            color,
            opacity: numberOpacity,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {day}
        </span>
      )}
      {shown && codes && (
        <div
          style={{
            position: 'absolute',
            transform: `scale(${scale})`,
            filter: settled
              ? undefined
              : `drop-shadow(0 ${flagSize * 0.1}px ${flagSize * 0.2}px rgba(0,0,0,0.35))`,
          }}
        >
          <DayFlags codes={codes} size={flagSize} mode={flagMode} />
        </div>
      )}
    </div>
  )
})

type YearCalendarProps = {
  year: number
  codesByDay: Map<string, string[]>
  palette: Palette
  width: number
  frame: number
  revealAt: (dayKey: string) => number | undefined
  monthOpacity: (month: number) => number
  weekStartsOn: number
  flagMode: FlagDisplayMode
}

export function YearCalendar({
  year,
  codesByDay,
  palette,
  width,
  frame,
  revealAt,
  monthOpacity,
  weekStartsOn,
  flagMode,
}: YearCalendarProps) {
  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, month) =>
        getMonthData(year, month, weekStartsOn).map((week) =>
          week.map((date) => (date ? toDayKey(date) : null))
        )
      ),
    [year, weekStartsOn]
  )

  const colGap = width * 0.035
  const cell = (width - colGap * 2) / 21

  const sinceFor = (key: string) => {
    const reveal = revealAt(key)
    if (reveal === undefined || frame < reveal) return -1
    return Math.min(frame - reveal, SETTLED)
  }

  return (
    <div style={{ width, fontFamily: SANS, color: palette.text }}>
      <div
        style={{
          borderBottom: `2px solid ${palette.divider}`,
          paddingBottom: cell * 0.45,
          marginBottom: cell * 0.45,
          fontSize: cell * 1.55,
          fontWeight: 700,
          color: palette.red,
          lineHeight: 1,
          letterSpacing: -cell * 0.02,
        }}
      >
        {year}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          columnGap: colGap,
          rowGap: cell * 0.55,
        }}
      >
        {months.map((weeks, month) => (
          <div key={month} style={{ opacity: monthOpacity(month) }}>
            <div
              style={{
                fontSize: cell * 0.62,
                fontWeight: 700,
                color: palette.heading,
                paddingLeft: cell * 0.28,
                marginBottom: cell * 0.18,
                lineHeight: 1.2,
              }}
            >
              {MONTH_NAMES_SHORT[month]}
            </div>
            {weeks.map((week, w) => (
              <div key={w} style={{ display: 'flex' }}>
                {week.map((key, d) =>
                  key ? (
                    <DayCell
                      key={d}
                      day={Number(key.slice(8))}
                      codes={codesByDay.get(key)}
                      since={sinceFor(key)}
                      size={cell}
                      color={palette.text}
                      flagMode={flagMode}
                    />
                  ) : (
                    <div key={d} style={{ width: cell, height: cell }} />
                  )
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: cell * 0.5,
          paddingTop: cell * 0.4,
          borderTop: `${EXPORT_FRAME.divider}px solid ${palette.divider}`,
        }}
      >
        <VideoWatermark
          palette={palette}
          size={
            (EXPORT_FRAME.watermarkSize * width) /
            getExportContentBox('story').width
          }
        />
      </div>
    </div>
  )
}
