import type { FlagDisplayMode } from '@/lib/contexts/SettingsContext'
import {
  dayOfYear,
  daysInYear,
  type VideoTheme,
  type YearVideoData,
} from '@/lib/video'
import { useMemo } from 'react'
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from 'remotion'
import { EndCard, WordReveal } from './Brand'
import {
  clamp,
  easeInOut,
  easeOut,
  fadeUp,
  PALETTES,
  plural,
  SANS,
  smooth,
} from './tokens'
import { YearCalendar } from './YearCalendar'

export type VideoProps = {
  data: YearVideoData
  theme: VideoTheme
  flagMode: FlagDisplayMode
  weekStartsOn: number
}

const FILL_START = 72
const FILL_END = 252
const END_CARD = 336
export const YEAR_FILL_DURATION = 400

export function YearFillVideo({
  data,
  theme,
  flagMode,
  weekStartsOn,
}: VideoProps) {
  const palette = PALETTES[theme]
  const frame = useCurrentFrame()
  const yearLength = daysInYear(data.year)

  const { codesByDay, reveals } = useMemo(() => {
    const frameFor = (key: string) =>
      Math.round(
        FILL_START + (dayOfYear(key) / yearLength) * (FILL_END - FILL_START)
      )
    return {
      codesByDay: new Map(data.days.map((d) => [d.date, d.codes])),
      reveals: data.days.map((d) => ({ ...d, frame: frameFor(d.date) })),
    }
  }, [data.days, yearLength])

  const revealAt = useMemo(() => {
    const byKey = new Map(reveals.map((r) => [r.date, r.frame]))
    return (key: string) => byKey.get(key)
  }, [reveals])

  const monthReachedAt = (month: number) => {
    const firstOfMonth = Date.UTC(data.year, month, 1)
    const doy = (firstOfMonth - Date.UTC(data.year, 0, 1)) / 86400000
    return FILL_START + (doy / yearLength) * (FILL_END - FILL_START)
  }
  const monthOpacity = (month: number) =>
    interpolate(
      frame,
      [monthReachedAt(month) - 6, monthReachedAt(month) + 4],
      [0.32, 1],
      clamp
    )

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
  const zoom = interpolate(frame, [FILL_END, END_CARD], [1, 1.035], {
    ...clamp,
    easing: easeInOut,
  })

  const revealed = reveals.filter((r) => r.frame <= frame)
  const countries = new Set(revealed.flatMap((r) => r.codes)).size
  const days = revealed.length

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
          lines={[`Where did ${data.year}`, 'take you?']}
          start={4}
          size={120}
          color={palette.heading}
          italicWords={['you']}
          stagger={4}
        />
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, top: 112 }}>
        <WordReveal
          lines={['Your year, at a glance.']}
          start={FILL_END + 16}
          size={80}
          color={palette.heading}
          italicWords={['glance']}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 60,
          top: 300,
          opacity: calIn,
          transform: `translateY(${(1 - calIn) * 80}px) scale(${zoom})`,
          transformOrigin: '50% 40%',
        }}
      >
        <YearCalendar
          year={data.year}
          codesByDay={codesByDay}
          palette={palette}
          width={960}
          frame={frame}
          revealAt={revealAt}
          monthOpacity={monthOpacity}
          weekStartsOn={weekStartsOn}
          flagMode={flagMode}
        />
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
          ...fadeUp(frame, FILL_START, 16, 20),
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
