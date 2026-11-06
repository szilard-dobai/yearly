import type { FlagDisplayMode } from '@/lib/contexts/SettingsContext'
import type { VideoTheme, YearVideoData } from '@/lib/video'
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
import {
  END_CARD_LENGTH,
  FILL_START,
  fillLength,
  revealFrames,
} from './timeline'
import { YearCalendar } from './YearCalendar'

export type VideoProps = {
  data: YearVideoData
  theme: VideoTheme
  flagMode: FlagDisplayMode
  weekStartsOn: number
}

export function yearFillTimeline(dayCount: number) {
  const fillEnd = FILL_START + fillLength(dayCount, 30, 180)
  const endCard = fillEnd + 84
  return { fillEnd, endCard, duration: endCard + END_CARD_LENGTH }
}

export function YearFillVideo({
  data,
  theme,
  flagMode,
  weekStartsOn,
}: VideoProps) {
  const palette = PALETTES[theme]
  const frame = useCurrentFrame()
  const { fillEnd, endCard } = yearFillTimeline(data.days.length)

  const { codesByDay, reveals, monthReachedAt } = useMemo(() => {
    const reveals = revealFrames(data.days, FILL_START, fillEnd - FILL_START)
    const monthReachedAt = Array.from({ length: 12 }, (_, month) => {
      const firstDay = `${data.year}-${String(month + 1).padStart(2, '0')}-01`
      return reveals.find((r) => r.date >= firstDay)?.frame ?? fillEnd
    })
    return {
      codesByDay: new Map(data.days.map((d) => [d.date, d.codes])),
      reveals,
      monthReachedAt,
    }
  }, [data.days, data.year, fillEnd])

  const revealAt = useMemo(() => {
    const byKey = new Map(reveals.map((r) => [r.date, r.frame]))
    return (key: string) => byKey.get(key)
  }, [reveals])

  const monthOpacity = (month: number) =>
    interpolate(
      frame,
      [monthReachedAt[month] - 6, monthReachedAt[month] + 4],
      [0.32, 1],
      clamp
    )

  const lift = smooth(frame, 36, 24)
  const hookY = interpolate(lift, [0, 1], [760, 92])
  const hookScale = interpolate(lift, [0, 1], [1, 0.56])
  const hookOut = interpolate(frame, [fillEnd + 6, fillEnd + 16], [1, 0], clamp)
  const calIn = interpolate(frame, [46, 70], [0, 1], {
    ...clamp,
    easing: easeOut,
  })
  const zoom = interpolate(frame, [fillEnd, endCard], [1, 1.035], {
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
          start={fillEnd + 16}
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

      <Sequence from={endCard}>
        <EndCard palette={palette} />
      </Sequence>
    </AbsoluteFill>
  )
}
