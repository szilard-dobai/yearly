'use client'

import { FPS, VIDEO_HEIGHT, VIDEO_WIDTH } from '@/components/video/tokens'
import {
  YearFillVideo,
  yearFillTimeline,
  type VideoProps,
} from '@/components/video/YearFillVideo'
import { EXAMPLE_YEAR, getExampleVisits } from '@/lib/homepage-examples'
import { buildYearVideoData, type VideoTheme } from '@/lib/video'
import { Player, type PlayerRef } from '@remotion/player'
import { useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef } from 'react'

const data = buildYearVideoData(getExampleVisits(), EXAMPLE_YEAR)
const timeline = yearFillTimeline(data.days.length)

export default function HomepageVideoPlayer({ theme }: { theme: VideoTheme }) {
  const playerRef = useRef<PlayerRef>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion() ?? false

  const inputProps = useMemo<VideoProps>(
    () => ({ data, theme, flagMode: 'icon', weekStartsOn: 1 }),
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

  return (
    <div ref={containerRef} className="size-full">
      <Player
        ref={playerRef}
        component={YearFillVideo}
        inputProps={inputProps}
        durationInFrames={timeline.duration}
        compositionWidth={VIDEO_WIDTH}
        compositionHeight={VIDEO_HEIGHT}
        fps={FPS}
        initialFrame={reducedMotion ? timeline.fillEnd + 30 : 0}
        loop
        controls={reducedMotion}
        clickToPlay={reducedMotion}
        showVolumeControls={false}
        acknowledgeRemotionLicense
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}
