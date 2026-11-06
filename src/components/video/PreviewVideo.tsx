import type { VideoTheme } from '@/lib/video'
import { AbsoluteFill } from 'remotion'
import { MonthVideo, type MonthVideoProps } from './MonthVideo'
import { StatsVideo } from './StatsVideo'
import { SANS, VIDEO_HEIGHT, VIDEO_WIDTH } from './tokens'
import { YearFillVideo, type VideoProps } from './YearFillVideo'

export type PreviewVideoProps =
  | (VideoProps & { kind: 'year' | 'stats' })
  | (MonthVideoProps & { kind: 'month' })

const ANGLE = -30
const ROWS = 11
const PER_ROW = 4
const TILE_WIDTH = 2300
const TILE_HEIGHT = 2500

const INK: Record<VideoTheme, string> = {
  dark: 'rgba(255,255,255,0.14)',
  light: 'rgba(16,24,40,0.12)',
}

export function PreviewWatermark({ theme }: { theme: VideoTheme }) {
  return (
    <AbsoluteFill style={{ overflow: 'hidden', pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          left: (VIDEO_WIDTH - TILE_WIDTH) / 2,
          top: (VIDEO_HEIGHT - TILE_HEIGHT) / 2,
          width: TILE_WIDTH,
          height: TILE_HEIGHT,
          transform: `rotate(${ANGLE}deg)`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {Array.from({ length: ROWS }, (_, row) => (
          <div
            key={row}
            style={{
              display: 'flex',
              justifyContent: 'space-around',
              transform: `translateX(${row % 2 === 0 ? -150 : 150}px)`,
            }}
          >
            {Array.from({ length: PER_ROW }, (_, i) => (
              <span
                key={i}
                style={{
                  fontFamily: SANS,
                  fontSize: 46,
                  fontWeight: 600,
                  letterSpacing: '0.32em',
                  color: INK[theme],
                }}
              >
                PREVIEW
              </span>
            ))}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  )
}

function Video(props: PreviewVideoProps) {
  if (props.kind === 'month') return <MonthVideo {...props} />
  if (props.kind === 'stats') return <StatsVideo {...props} />
  return <YearFillVideo {...props} />
}

export function PreviewVideo(props: PreviewVideoProps) {
  return (
    <AbsoluteFill>
      <Video {...props} />
      <PreviewWatermark theme={props.theme} />
    </AbsoluteFill>
  )
}
