import { getMonthData } from '@/lib/calendar'
import { MONTH_NAMES } from '@/lib/constants'
import type { FlagDisplayMode } from '@/lib/contexts/SettingsContext'
import { toDayKey } from '@/lib/selection'
import type { MonthVideoData, VideoTheme } from '@/lib/video'
import { type ReactNode, useMemo } from 'react'
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from 'remotion'
import { EndCard, WordReveal } from './Brand'
import { RankRow, StatTile } from './StatsCard'
import {
  clamp,
  countUp,
  easeOut,
  fadeUp,
  PALETTES,
  plural,
  SANS,
  smooth,
} from './tokens'
import {
  END_CARD_LENGTH,
  FILL_START,
  fillLength,
  revealFrames,
} from './timeline'
import { DayCell, SETTLED } from './YearCalendar'

export type MonthVideoProps = {
  data: MonthVideoData
  theme: VideoTheme
  flagMode: FlagDisplayMode
  weekStartsOn: number
}

const WIDTH = 960
const COLUMN = WIDTH / 7
const ROW = 148
const CELL = 128
const HEADER = 150
const WEEKDAY_ROW = 56
const SETTLED_SCALE = 0.62
const FILL_AREA_TOP = 270
const FILL_AREA_BOTTOM = 1740
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function monthTimeline(dayCount: number) {
  const fillEnd = FILL_START + fillLength(dayCount, 30, 120)
  const settle = fillEnd + 14
  const stats = settle + 18
  const list = stats + 26
  const endCard = fillEnd + 144
  return {
    fillEnd,
    settle,
    stats,
    list,
    endCard,
    duration: endCard + END_CARD_LENGTH,
  }
}

function fitSize(line: string, max: number, budget: number) {
  return Math.min(max, Math.floor(budget / line.length))
}

export function MonthVideo({
  data,
  theme,
  flagMode,
  weekStartsOn,
}: MonthVideoProps) {
  const palette = PALETTES[theme]
  const frame = useCurrentFrame()
  const monthName = MONTH_NAMES[data.month]
  const s = data.stats

  const weeks = useMemo(
    () =>
      getMonthData(data.year, data.month, weekStartsOn).map((week) =>
        week.map((date) => (date ? toDayKey(date) : null))
      ),
    [data.year, data.month, weekStartsOn]
  )

  const { fillEnd, settle, stats, list, endCard } = monthTimeline(
    data.days.length
  )

  const { codesByDay, revealAt } = useMemo(() => {
    const reveals = revealFrames(data.days, FILL_START, fillEnd - FILL_START)
    return {
      codesByDay: new Map(data.days.map((d) => [d.date, d.codes])),
      revealAt: new Map(reveals.map((r) => [r.date, r.frame])),
    }
  }, [data.days, fillEnd])

  const sinceFor = (key: string) => {
    const reveal = revealAt.get(key)
    if (reveal === undefined || frame < reveal) return -1
    return Math.min(frame - reveal, SETTLED)
  }

  const revealed = data.days.filter((d) => (revealAt.get(d.date) ?? 0) <= frame)
  const countries = new Set(revealed.flatMap((d) => d.codes)).size
  const days = revealed.length

  const lift = smooth(frame, 36, 24)
  const hookY = interpolate(lift, [0, 1], [760, 92])
  const hookScale = interpolate(lift, [0, 1], [1, 0.56])
  const hookOut = interpolate(frame, [fillEnd + 6, fillEnd + 16], [1, 0], clamp)
  const calIn = interpolate(frame, [46, 70], [0, 1], {
    ...clamp,
    easing: easeOut,
  })
  const gridHeight = HEADER + WEEKDAY_ROW + weeks.length * ROW
  const fillTop =
    FILL_AREA_TOP + (FILL_AREA_BOTTOM - FILL_AREA_TOP - gridHeight) / 2
  const settled = smooth(frame, settle, 26)
  const gridScale = interpolate(settled, [0, 1], [1, SETTLED_SCALE])
  const top = interpolate(settled, [0, 1], [fillTop, 250])
  const counterIn = fadeUp(frame, FILL_START, 16, 20)
  const counterOut = interpolate(frame, [settle, settle + 10], [1, 0], clamp)
  const hook = `Where did ${monthName}`
  const title = `Your ${monthName}, at a glance.`

  const num = (value: number, i: number, digits = 0) =>
    countUp(frame, stats + i * 5, 30, value).toFixed(digits)
  const tile = (i: number) => fadeUp(frame, stats + i * 5, 18, 36)
  const value = (children: ReactNode) => (
    <div
      style={{
        fontSize: 64,
        fontWeight: 700,
        color: palette.text,
        lineHeight: 1.15,
      }}
    >
      {children}
    </div>
  )

  return (
    <AbsoluteFill style={{ background: palette.canvas }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: hookY,
          transform: `scale(${hookScale})`,
          transformOrigin: 'top center',
          opacity: hookOut,
        }}
      >
        <WordReveal
          lines={[hook, 'take you?']}
          start={4}
          size={fitSize(hook, 120, 1700)}
          color={palette.heading}
          italicWords={['you']}
          stagger={4}
        />
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, top: 112 }}>
        <WordReveal
          lines={[title]}
          start={fillEnd + 16}
          size={fitSize(title, 76, 2050)}
          color={palette.heading}
          italicWords={['glance']}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 60,
          top,
          width: WIDTH,
          fontFamily: SANS,
          color: palette.text,
          opacity: calIn,
          transform: `translateY(${(1 - calIn) * 80}px)`,
        }}
      >
        <div style={{ height: gridHeight * gridScale }}>
          <div
            style={{
              width: WIDTH,
              transform: `scale(${gridScale})`,
              transformOrigin: 'top center',
            }}
          >
            <div
              style={{
                height: HEADER - 24,
                marginBottom: 24,
                paddingBottom: 28,
                boxSizing: 'border-box',
                borderBottom: `2px solid ${palette.divider}`,
                display: 'flex',
                alignItems: 'flex-end',
                fontSize: 96,
                fontWeight: 700,
                lineHeight: 1,
                color: palette.red,
              }}
            >
              {monthName} {data.year}
            </div>
            <div style={{ display: 'flex', height: WEEKDAY_ROW }}>
              {WEEKDAYS.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: COLUMN,
                    textAlign: 'center',
                    fontSize: 30,
                    fontWeight: 500,
                    color: palette.muted,
                  }}
                >
                  {WEEKDAYS[(weekStartsOn + i) % 7]}
                </div>
              ))}
            </div>
            {weeks.map((week, w) => (
              <div key={w} style={{ display: 'flex', height: ROW }}>
                {week.map((key, d) => (
                  <div
                    key={d}
                    style={{
                      width: COLUMN,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {key && (
                      <DayCell
                        day={Number(key.slice(8))}
                        codes={codesByDay.get(key)}
                        since={sinceFor(key)}
                        size={CELL}
                        color={palette.text}
                        flagMode={flagMode}
                      />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 20,
            marginTop: 40,
          }}
        >
          <StatTile
            label="Countries Visited"
            labelSize={28}
            palette={palette}
            style={{ padding: 28, ...tile(0) }}
          >
            {value(num(s.totalCountries, 0))}
          </StatTile>
          <StatTile
            label="Days Abroad"
            labelSize={28}
            palette={palette}
            style={{ padding: 28, ...tile(1) }}
          >
            {value(num(s.totalDays, 1))}
          </StatTile>
          <StatTile
            label="Average Trip"
            labelSize={28}
            palette={palette}
            style={{ padding: 28, ...tile(2) }}
          >
            {value(
              <>
                {num(s.averageTripLength, 2, 1)}
                <span
                  style={{
                    fontSize: 32,
                    fontWeight: 400,
                    color: palette.muted,
                    marginLeft: 10,
                  }}
                >
                  days
                </span>
              </>
            )}
          </StatTile>
          <StatTile
            label="Month Abroad"
            labelSize={28}
            palette={palette}
            style={{ padding: 28, ...tile(3) }}
          >
            {value(`${num(s.percentTraveled, 3, 1)}%`)}
          </StatTile>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            marginTop: 36,
          }}
        >
          {s.topCountries.map((country, i) => (
            <RankRow
              key={country.countryCode}
              rank={i + 1}
              code={country.countryCode}
              days={country.days}
              palette={palette}
              flagMode={flagMode}
              style={fadeUp(frame, list + i * 5, 18, 36)}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 92,
          display: 'flex',
          justifyContent: 'center',
          gap: 18,
          fontFamily: SANS,
          fontSize: 40,
          color: palette.secondary,
          ...counterIn,
          opacity: counterIn.opacity * counterOut,
        }}
      >
        <span>
          <b style={{ color: palette.heading, fontWeight: 700 }}>{countries}</b>{' '}
          {plural(countries, 'country', 'countries')}
        </span>
        <span style={{ color: palette.muted }}>·</span>
        <span>
          <b style={{ color: palette.heading, fontWeight: 700 }}>{days}</b>{' '}
          {plural(days, 'day', 'days')} abroad
        </span>
      </div>

      <Sequence from={endCard}>
        <EndCard palette={palette} />
      </Sequence>
    </AbsoluteFill>
  )
}
