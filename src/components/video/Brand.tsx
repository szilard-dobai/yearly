import type { CSSProperties } from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { LogoMark as WatermarkLogo } from '../ExportWatermark'
import {
  type Palette,
  clamp,
  easeOut,
  fadeUp,
  SANS,
  SERIF,
  smooth,
} from './tokens'

function LogoMark({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect
        x="4"
        y="6"
        width="32"
        height="28"
        rx="3"
        stroke={color}
        strokeWidth="2"
      />
      <line x1="4" y1="14" x2="36" y2="14" stroke={color} strokeWidth="2" />
      {[12, 20, 28].flatMap((cx) =>
        [19, 24, 29].map((cy) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.5" fill={color} />
        ))
      )}
    </svg>
  )
}

function Wordmark({ size, color }: { size: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.3 }}>
      <LogoMark size={size * 1.33} color={color} />
      <span
        style={{
          fontFamily: SERIF,
          fontSize: size,
          color,
          lineHeight: 1,
          paddingTop: size * 0.18,
          letterSpacing: -size * 0.01,
        }}
      >
        Yearly
      </span>
    </div>
  )
}

export function VideoWatermark({
  palette,
  size,
}: {
  palette: Palette
  size: number
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'center',
        gap: '0.14em',
        fontFamily: SANS,
        fontSize: size,
        lineHeight: 1,
      }}
    >
      <span style={{ fontSize: '0.62em', color: palette.label }}>
        made with
      </span>
      <span
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '0.22em',
          fontWeight: 600,
          letterSpacing: '-0.025em',
          color: palette.heading,
        }}
      >
        <WatermarkLogo
          style={{
            width: '1.15em',
            height: '1.15em',
            flexShrink: 0,
            alignSelf: 'center',
          }}
        />
        <span>yearly.world</span>
      </span>
    </div>
  )
}

export function WordReveal({
  lines,
  start,
  size,
  color,
  italicWords = [],
  stagger = 3,
  style,
}: {
  lines: string[]
  start: number
  size: number
  color: string
  italicWords?: string[]
  stagger?: number
  style?: CSSProperties
}) {
  const frame = useCurrentFrame()
  let index = 0

  return (
    <div
      style={{
        fontFamily: SERIF,
        fontSize: size,
        fontWeight: 400,
        color,
        lineHeight: 1.08,
        letterSpacing: -size * 0.02,
        textAlign: 'center',
        ...style,
      }}
    >
      {lines.map((line, l) => (
        <div key={l}>
          {line.split(' ').map((word) => {
            const i = index++
            const clean = word.replace(/[.,!?]/g, '')
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  marginRight: '0.24em',
                  fontStyle: italicWords.includes(clean) ? 'italic' : 'normal',
                  ...fadeUp(frame, start + i * stagger, 16, size * 0.4),
                }}
              >
                {word}
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export function EndCard({ palette }: { palette: Palette }) {
  const frame = useCurrentFrame()
  const bg = interpolate(frame, [0, 12], [0, 1], { ...clamp, easing: easeOut })
  const logo = smooth(frame, 4)

  return (
    <AbsoluteFill
      style={{
        background: palette.canvas,
        opacity: bg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 56,
      }}
    >
      <div style={{ transform: `scale(${0.85 + logo * 0.15})`, opacity: logo }}>
        <Wordmark size={110} color={palette.heading} />
      </div>
      <WordReveal
        lines={['Your year, at a glance.']}
        start={12}
        size={76}
        color={palette.heading}
        italicWords={['glance']}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 22,
          ...fadeUp(frame, 26, 16, 20),
        }}
      >
        <div
          style={{
            fontFamily: SANS,
            fontSize: 40,
            fontWeight: 500,
            padding: '26px 56px',
            borderRadius: 999,
            background: palette.primaryBtn,
            color: palette.primaryBtnText,
          }}
        >
          yearly.world
        </div>
        <div style={{ fontFamily: SANS, fontSize: 28, color: palette.muted }}>
          Make your own travel calendar
        </div>
      </div>
    </AbsoluteFill>
  )
}
