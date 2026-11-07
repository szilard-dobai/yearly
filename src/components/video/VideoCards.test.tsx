import { EXPORT_CANVAS, EXPORT_FRAME } from '@/lib/export-canvas'
import type { CalendarData } from '@/lib/types'
import { buildYearVideoData } from '@/lib/video'
import { render, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import StatisticsExportLayout from '../StatisticsExportLayout'
import { StatsCard } from './StatsCard'
import { PALETTES } from './tokens'
import { YearCalendar } from './YearCalendar'

const timeline = vi.hoisted(() => ({ frame: 1000 }))

vi.mock('remotion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('remotion')>()),
  useCurrentFrame: () => timeline.frame,
}))

function trip(countryCode: string, month: number, from: number, to: number) {
  return Array.from({ length: to - from + 1 }, (_, i) => ({
    id: `${countryCode}-${month}-${from + i}`,
    countryCode,
    date: new Date(2026, month, from + i),
  }))
}

const calendarData: CalendarData = {
  visits: [
    ...trip('VN', 5, 1, 1),
    ...trip('FR', 5, 18, 24),
    ...trip('IT', 5, 24, 30),
    ...trip('JP', 1, 14, 21),
    ...trip('AU', 11, 19, 28),
  ],
}

const LABELS = [
  'Countries Visited',
  'Days Abroad',
  'Average Trip',
  'Year Abroad',
  'Busiest Month',
]

function renderStatsCard() {
  return render(
    <StatsCard
      data={buildYearVideoData(calendarData.visits, 2026)}
      palette={PALETTES.light}
      flagMode="emoji"
      statsStart={0}
      listStart={0}
    />
  )
}

describe('StatsCard', () => {
  beforeEach(() => {
    timeline.frame = 1000
  })

  it('draws the Story stats export at its full canvas size', () => {
    const { container } = renderStatsCard()
    const card = container.firstElementChild as HTMLElement

    expect(card.style.width).toBe(`${EXPORT_CANVAS.story.width}px`)
    expect(card.style.height).toBe(`${EXPORT_CANVAS.story.height}px`)
    expect(within(card).getByText('yearly.world')).toBeInTheDocument()
  })

  it('uses the same tiles, type sizes and ranking as the image export', () => {
    const video = within(renderStatsCard().container)
    const image = within(
      render(
        <StatisticsExportLayout
          calendarData={calendarData}
          year={2026}
          format="story"
          flagDisplayMode="emoji"
        />
      ).container
    )

    for (const label of LABELS) {
      const videoLabel = video.getByText(label)
      const imageLabel = image.getByText(label)
      const videoValue = videoLabel.nextElementSibling as HTMLElement
      const imageValue = imageLabel.nextElementSibling as HTMLElement

      expect(videoLabel.style.fontSize).toBe(imageLabel.style.fontSize)
      expect(videoValue.style.fontSize).toBe(imageValue.style.fontSize)
      expect(videoValue.textContent).toBe(imageValue.textContent)
      expect(videoLabel.parentElement?.style.height).toBe(
        imageLabel.parentElement?.style.height
      )
    }
    expect(video.getByText('Australia').style.fontSize).toBe(
      image.getByText('Australia').style.fontSize
    )
  })

  it('counts the numbers up from zero as the tiles come in', () => {
    timeline.frame = 0
    const video = within(renderStatsCard().container)

    expect(video.getByText('Days Abroad').nextElementSibling).toHaveTextContent(
      /^0$/
    )
  })
})

describe('YearCalendar', () => {
  it('sizes the watermark like the export does for the same width', () => {
    const view = within(
      render(
        <YearCalendar
          year={2026}
          codesByDay={new Map()}
          palette={PALETTES.dark}
          width={480}
          frame={0}
          revealAt={() => undefined}
          monthOpacity={() => 1}
          weekStartsOn={1}
          flagMode="emoji"
        />
      ).container
    )
    const watermark = view.getByText('made with').parentElement as HTMLElement

    expect(parseFloat(watermark.style.fontSize)).toBeCloseTo(
      (EXPORT_FRAME.watermarkSize * 480) / 952,
      6
    )
    expect(view.getByText('yearly.world')).toBeInTheDocument()
  })
})
