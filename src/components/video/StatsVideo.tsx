import { MONTH_NAMES } from '@/lib/constants'
import type { ReactNode } from 'react'
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from 'remotion'
import { EndCard, WordReveal } from './Brand'
import { STATS_CARD_SIZE, StatsCard } from './StatsCard'
import {
  clamp,
  countUp,
  easeInOut,
  fadeUp,
  type Palette,
  PALETTES,
  plural,
  popAt,
  SANS,
  SERIF,
  smooth,
  VIDEO_WIDTH,
} from './tokens'
import { VideoFlag } from './VideoFlag'
import type { VideoProps } from './YearFillVideo'

const BEATS = [56, 104, 152, 200] as const
const BEAT_LEN = 48
const CARD = 250
const END_CARD = 352
const CARD_SCALE = 0.84
export const STATS_DURATION = 418

function valueFontSize(value: string) {
  const base = value.length > 4 ? 240 : 320
  return Math.min(base, 1000 / (value.length * 0.6))
}

function flagGrid(count: number) {
  const size = count <= 12 ? 78 : count <= 24 ? 64 : count <= 48 ? 48 : 36
  return { size, gap: size * 0.28, stagger: Math.min(2, 36 / count) }
}

function Beat({
  start,
  value,
  label,
  sub,
  palette,
  children,
}: {
  start: number
  value: string
  label: string
  sub?: string
  palette: Palette
  children?: ReactNode
}) {
  const frame = useCurrentFrame()
  if (frame < start - 2 || frame > start + BEAT_LEN + 8) return null
  const enter = smooth(frame, start, 14)
  const exit = interpolate(
    frame,
    [start + BEAT_LEN - 4, start + BEAT_LEN + 6],
    [1, 0],
    { ...clamp, easing: easeInOut }
  )

  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        opacity: exit,
        transform: `scale(${0.92 + enter * 0.08 + (1 - exit) * 0.08})`,
      }}
    >
      <div
        style={{
          fontFamily: SANS,
          fontWeight: 700,
          fontSize: valueFontSize(value),
          lineHeight: 1,
          color: palette.heading,
          letterSpacing: -12,
          fontVariantNumeric: 'tabular-nums',
          opacity: enter,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: SERIF,
          fontStyle: 'italic',
          fontSize: 84,
          color: palette.heading,
          marginTop: 12,
          ...fadeUp(frame, start + 4, 14, 24),
        }}
      >
        {label}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: SANS,
            fontSize: 36,
            color: palette.secondary,
            marginTop: 20,
            ...fadeUp(frame, start + 8, 14, 20),
          }}
        >
          {sub}
        </div>
      )}
      {children}
    </AbsoluteFill>
  )
}

export function StatsVideo({ data, theme, flagMode }: VideoProps) {
  const palette = PALETTES[theme]
  const frame = useCurrentFrame()
  const s = data.stats

  const hookOut = interpolate(frame, [BEATS[0] - 8, BEATS[0]], [1, 0], clamp)
  const card = smooth(frame, CARD, 28)
  const showCard = frame >= CARD - 4

  const countries = Math.round(countUp(frame, BEATS[0], 30, s.totalCountries))
  const days = Math.round(countUp(frame, BEATS[1], 30, s.totalDays))
  const pct = countUp(frame, BEATS[2], 30, s.percentTraveled).toFixed(1)
  const grid = flagGrid(data.countries.length)

  return (
    <AbsoluteFill style={{ background: palette.canvas }}>
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          opacity: hookOut,
        }}
      >
        <WordReveal
          lines={[`Your ${data.year},`, 'by the numbers.']}
          start={4}
          size={120}
          color={palette.heading}
          italicWords={['numbers']}
        />
      </AbsoluteFill>

      <Beat
        start={BEATS[0]}
        value={String(countries)}
        label={plural(s.totalCountries, 'country', 'countries')}
        palette={palette}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            gap: grid.gap,
            width: 860,
            marginTop: 64,
          }}
        >
          {data.countries.map((code, i) => (
            <div
              key={code}
              style={{
                transform: `scale(${popAt(frame - (BEATS[0] + 4 + i * grid.stagger))})`,
              }}
            >
              <VideoFlag code={code} size={grid.size} mode={flagMode} />
            </div>
          ))}
        </div>
      </Beat>
      <Beat
        start={BEATS[1]}
        value={String(days)}
        label={plural(s.totalDays, 'day abroad', 'days abroad')}
        sub={`${s.averageTripLength.toFixed(1)} days per trip, on average`}
        palette={palette}
      />
      <Beat
        start={BEATS[2]}
        value={`${pct}%`}
        label="of the year, away"
        palette={palette}
      />
      {s.busiestMonth && (
        <Beat
          start={BEATS[3]}
          value={MONTH_NAMES[s.busiestMonth.month]}
          label="was your busiest month"
          sub={`${s.busiestMonth.days} ${plural(s.busiestMonth.days, 'day', 'days')} on the road`}
          palette={palette}
        />
      )}

      {showCard && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 104 }}>
          <WordReveal
            lines={['All of it, in one card.']}
            start={CARD + 4}
            size={76}
            color={palette.heading}
            italicWords={['one']}
          />
        </div>
      )}
      {showCard && (
        <div
          style={{
            position: 'absolute',
            left: (VIDEO_WIDTH - STATS_CARD_SIZE.width * CARD_SCALE) / 2,
            top: 290,
            width: STATS_CARD_SIZE.width * CARD_SCALE,
            height: STATS_CARD_SIZE.height * CARD_SCALE,
            borderRadius: 36,
            overflow: 'hidden',
            boxShadow:
              theme === 'dark'
                ? `0 0 0 2px ${palette.border}, 0 40px 120px rgba(0,0,0,0.5)`
                : `0 0 0 2px ${palette.border}, 0 30px 90px rgba(16,24,40,0.16)`,
            opacity: card,
            transform: `translateY(${(1 - card) * 300}px)`,
          }}
        >
          <div
            style={{
              transform: `scale(${CARD_SCALE})`,
              transformOrigin: 'top left',
            }}
          >
            <StatsCard
              data={data}
              palette={palette}
              flagMode={flagMode}
              statsStart={CARD + 6}
              listStart={CARD + 26}
            />
          </div>
        </div>
      )}

      <Sequence from={END_CARD}>
        <EndCard palette={palette} />
      </Sequence>
    </AbsoluteFill>
  )
}
