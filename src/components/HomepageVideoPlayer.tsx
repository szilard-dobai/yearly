'use client'

import {
  MonthVideo,
  monthTimeline,
  type MonthVideoProps,
} from '@/components/video/MonthVideo'
import { STATS_DURATION, StatsVideo } from '@/components/video/StatsVideo'
import { stillFrame } from '@/components/video/still-frame'
import { FPS, VIDEO_HEIGHT, VIDEO_WIDTH } from '@/components/video/tokens'
import { usePrefetchVideoImages } from '@/components/video/usePrefetchVideoImages'
import {
  YearFillVideo,
  yearFillTimeline,
  type VideoProps,
} from '@/components/video/YearFillVideo'
import {
  EXAMPLE_MONTH,
  EXAMPLE_YEAR,
  getExampleVisits,
} from '@/lib/homepage-examples'
import {
  buildMonthVideoData,
  buildYearVideoData,
  type VideoKind,
  type VideoTheme,
} from '@/lib/video'
import { Player, type PlayerRef } from '@remotion/player'
import { useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef } from 'react'

const visits = getExampleVisits()
const yearData = buildYearVideoData(visits, EXAMPLE_YEAR)
const monthData = buildMonthVideoData(visits, EXAMPLE_YEAR, EXAMPLE_MONTH)
const yearTiming = yearFillTimeline(yearData.days.length)
const monthTiming = monthTimeline(monthData.days.length)

const STILL_FRAME: Record<VideoKind, number> = {
  year: stillFrame('year', yearData.days.length),
  stats: stillFrame('stats', yearData.days.length),
  month: stillFrame('month', monthData.days.length),
}

export default function HomepageVideoPlayer({
  theme,
  kind = 'year',
}: {
  theme: VideoTheme
  kind?: VideoKind
}) {
  const playerRef = useRef<PlayerRef>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion() ?? false
  usePrefetchVideoImages(
    kind === 'month' ? monthData.countries : yearData.countries
  )

  const yearProps = useMemo<VideoProps>(
    () => ({ data: yearData, theme, weekStartsOn: 1 }),
    [theme]
  )
  const monthProps = useMemo<MonthVideoProps>(
    () => ({ data: monthData, theme, weekStartsOn: 1 }),
    [theme]
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container || reducedMotion) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) playerRef.current?.play()
        else playerRef.current?.pause()
      },
      { threshold: 0.25 }
    )
    observer.observe(container)
    return () => observer.disconnect()
  }, [reducedMotion])

  const shared = {
    compositionWidth: VIDEO_WIDTH,
    compositionHeight: VIDEO_HEIGHT,
    fps: FPS,
    initialFrame: reducedMotion ? STILL_FRAME[kind] : 0,
    loop: true,
    initiallyMuted: true,
    controls: reducedMotion,
    clickToPlay: reducedMotion,
    showVolumeControls: false,
    acknowledgeRemotionLicense: true,
    style: { width: '100%', height: '100%' },
  }

  return (
    <div ref={containerRef} className="size-full">
      {kind === 'month' ? (
        <Player
          ref={playerRef}
          component={MonthVideo}
          inputProps={monthProps}
          durationInFrames={monthTiming.duration}
          {...shared}
        />
      ) : kind === 'stats' ? (
        <Player
          ref={playerRef}
          component={StatsVideo}
          inputProps={yearProps}
          durationInFrames={STATS_DURATION}
          {...shared}
        />
      ) : (
        <Player
          ref={playerRef}
          component={YearFillVideo}
          inputProps={yearProps}
          durationInFrames={yearTiming.duration}
          {...shared}
        />
      )}
    </div>
  )
}
