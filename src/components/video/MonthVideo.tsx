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

const FILL_START = 72
const FILL_END = 192
const SETTLE = FILL_END + 14
const STATS = SETTLE + 18
const LIST = STATS + 26
const END_CARD = 336
export const MONTH_DURATION = 400

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

  const { codesByDay, revealAt } = useMemo(() => {
    const monthLength = new Date(data.year, data.month + 1, 0).getDate()
    const frameFor = (key: string) =>
      Math.round(
        FILL_START +
          ((Number(key.slice(8)) - 1) / monthLength) * (FILL_END - FILL_START)
      )
    return {
      codesByDay: new Map(data.days.map((d) => [d.date, d.codes])),
      revealAt: new Map(data.days.map((d) => [d.date, frameFor(d.date)])),
    }
  }, [data.days, data.year, data.month])

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
  const hookOut = interpolate(
    frame,
    [FILL_END + 6, FILL_END + 16],
    [1, 0],
    clamp
  )
  const calIn = interpolate(frame, [46, 70], [0, 1], {
    ...clamp,
    easing: easeOut,
  })
  const gridHeight = HEADER + WEEKDAY_ROW + weeks.length * ROW
  const fillTop =
    FILL_AREA_TOP + (FILL_AREA_BOTTOM - FILL_AREA_TOP - gridHeight) / 2
  const settle = smooth(frame, SETTLE, 26)
  const gridScale = interpolate(settle, [0, 1], [1, SETTLED_SCALE])
  const top = interpolate(settle, [0, 1], [fillTop, 250])
  const counterIn = fadeUp(frame, FILL_START, 16, 20)
  const counterOut = interpolate(frame, [SETTLE, SETTLE + 10], [1, 0], clamp)
  const hook = `Where did ${monthName}`
  const title = `Your ${monthName}, at a glance.`

  const num = (value: number, i: number, digits = 0) =>
    countUp(frame, STATS + i * 5, 30, value).toFixed(digits)
  const tile = (i: number) => fadeUp(frame, STATS + i * 5, 18, 36)
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
          start={FILL_END + 16}
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
              style={fadeUp(frame, LIST + i * 5, 18, 36)}
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

      <Sequence from={END_CARD}>
        <EndCard palette={palette} />
      </Sequence>
    </AbsoluteFill>
  )
}
