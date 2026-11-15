import { MonthVideo, monthTimeline } from '@/components/video/MonthVideo'
import { STATS_DURATION, StatsVideo } from '@/components/video/StatsVideo'
import { FPS, VIDEO_HEIGHT, VIDEO_WIDTH } from '@/components/video/tokens'
import {
  YearFillVideo,
  yearFillTimeline,
} from '@/components/video/YearFillVideo'
import {
  EXAMPLE_MONTH,
  EXAMPLE_YEAR,
  getExampleVisits,
} from '@/lib/homepage-examples'
import { buildMonthVideoData, buildYearVideoData } from '@/lib/video'
import type { ComponentProps, ComponentType } from 'react'
import { AbsoluteFill, Composition } from 'remotion'
import { FONT_VARIABLES } from './fonts'

function withFonts<P extends object>(Video: ComponentType<P>) {
  return function VideoWithFonts(props: P) {
    return (
      <AbsoluteFill style={FONT_VARIABLES}>
        <Video {...props} />
      </AbsoluteFill>
    )
  }
}

const Year = withFonts(YearFillVideo)
const Stats = withFonts(StatsVideo)
const Month = withFonts(MonthVideo)

const visits = getExampleVisits()
const exampleYear: ComponentProps<typeof YearFillVideo> = {
  data: buildYearVideoData(visits, EXAMPLE_YEAR),
  theme: 'dark',
  weekStartsOn: 1,
}
const exampleMonth: ComponentProps<typeof MonthVideo> = {
  data: buildMonthVideoData(visits, EXAMPLE_YEAR, EXAMPLE_MONTH),
  theme: 'dark',
  weekStartsOn: 1,
}

const size = { width: VIDEO_WIDTH, height: VIDEO_HEIGHT, fps: FPS }

export function Root() {
  return (
    <>
      <Composition
        id="year"
        component={Year}
        {...size}
        durationInFrames={
          yearFillTimeline(exampleYear.data.days.length).duration
        }
        defaultProps={exampleYear}
        calculateMetadata={({ props }) => ({
          durationInFrames: yearFillTimeline(props.data.days.length).duration,
        })}
      />
      <Composition
        id="stats"
        component={Stats}
        {...size}
        durationInFrames={STATS_DURATION}
        defaultProps={exampleYear}
      />
      <Composition
        id="month"
        component={Month}
        {...size}
        durationInFrames={monthTimeline(exampleMonth.data.days.length).duration}
        defaultProps={exampleMonth}
        calculateMetadata={({ props }) => ({
          durationInFrames: monthTimeline(props.data.days.length).duration,
        })}
      />
    </>
  )
}
