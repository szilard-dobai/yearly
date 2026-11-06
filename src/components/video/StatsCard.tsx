import { MONTH_NAMES } from '@/lib/constants'
import type { FlagDisplayMode } from '@/lib/contexts/SettingsContext'
import { getCountryByCode } from '@/lib/countries'
import type { YearVideoData } from '@/lib/video'
import type { CSSProperties, ReactNode } from 'react'
import { useCurrentFrame } from 'remotion'
import {
  countUp,
  EMOJI_FONT,
  fadeUp,
  type Palette,
  plural,
  SANS,
} from './tokens'
import { VideoFlag } from './VideoFlag'

export const STATS_CARD_SIZE = { width: 1200, height: 1739 }

const MEDALS = ['🥇', '🥈', '🥉']

function StatTile({
  label,
  children,
  palette,
  style,
}: {
  label: string
  children: ReactNode
  palette: Palette
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
      <div style={{ fontSize: 20, color: palette.muted, marginBottom: 8 }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function RankRow({
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
          {getCountryByCode(code)?.name ?? code}
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

  const num = (v: number, i: number, digits = 0) =>
    countUp(frame, statsStart + i * 5, 36, v).toFixed(digits)
  const tileStyle = (i: number) => fadeUp(frame, statsStart + i * 5, 18, 36)
  const rowStyle = (i: number) => fadeUp(frame, listStart + i * 5, 18, 36)

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
    <div
      style={{
        ...STATS_CARD_SIZE,
        padding: '64px 48px',
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
          borderBottom: `2px solid ${palette.divider}`,
          paddingBottom: 24,
          marginBottom: 24,
          fontSize: 80,
          fontWeight: 700,
          color: palette.red,
          lineHeight: 1.1,
        }}
      >
        {data.year}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 24,
          marginBottom: 24,
        }}
      >
        <StatTile
          label="Countries Visited"
          palette={palette}
          style={tileStyle(0)}
        >
          {value(num(s.totalCountries, 0))}
        </StatTile>
        <StatTile label="Days Abroad" palette={palette} style={tileStyle(1)}>
          {value(num(s.totalDays, 1))}
        </StatTile>
        <StatTile label="Average Trip" palette={palette} style={tileStyle(2)}>
          {value(
            <>
              {num(s.averageTripLength, 2, 1)}
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 400,
                  color: palette.muted,
                  marginLeft: 8,
                }}
              >
                days
              </span>
            </>
          )}
        </StatTile>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 24,
          marginBottom: 40,
        }}
      >
        {s.busiestMonth && (
          <StatTile
            label="Busiest Month"
            palette={palette}
            style={tileStyle(3)}
          >
            {value(MONTH_NAMES[s.busiestMonth.month])}
            <div style={{ fontSize: 28, color: palette.muted }}>
              {s.busiestMonth.days} {plural(s.busiestMonth.days, 'day', 'days')}
            </div>
          </StatTile>
        )}
        <StatTile label="Year Abroad" palette={palette} style={tileStyle(4)}>
          {value(`${num(s.percentTraveled, 4, 1)}%`)}
        </StatTile>
      </div>

      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 32,
            fontWeight: 600,
            marginBottom: 24,
            ...rowStyle(0),
          }}
        >
          Top Countries
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {s.topCountries.map((item, i) => (
            <RankRow
              key={item.countryCode}
              rank={i + 1}
              code={item.countryCode}
              days={item.days}
              palette={palette}
              flagMode={flagMode}
              style={rowStyle(i + 1)}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          marginTop: 'auto',
          paddingTop: 32,
          borderTop: `2px solid ${palette.divider}`,
          textAlign: 'center',
          fontSize: 24,
          color: palette.muted,
          letterSpacing: 0.5,
        }}
      >
        made with <span style={{ fontWeight: 500 }}>yearly.world</span>
      </div>
    </div>
  )
}
