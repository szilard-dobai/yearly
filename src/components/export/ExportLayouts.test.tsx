import { getFlagEmoji } from '@/lib/countries'
import {
  EXPORT_CANVAS,
  EXPORT_FORMATS,
  EXPORT_FRAME,
  type ExportFormat,
} from '@/lib/export-canvas'
import type { CalendarData } from '@/lib/types'
import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import MonthlyExportLayout from '../MonthlyExportLayout'
import StatisticsExportLayout from '../StatisticsExportLayout'
import YearExportLayout from '../YearExportLayout'

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
    ...trip('GB', 5, 30, 30),
    ...trip('JP', 1, 14, 21),
    ...trip('AU', 11, 19, 28),
  ],
}

const settings = { flagDisplayMode: 'emoji', weekStartsOn: 1 } as const

function layouts(format: ExportFormat): [string, ReactElement][] {
  return [
    [
      'year',
      <YearExportLayout
        key="year"
        calendarData={calendarData}
        year={2026}
        format={format}
        {...settings}
      />,
    ],
    [
      'month',
      <MonthlyExportLayout
        key="month"
        calendarData={calendarData}
        year={2026}
        month={5}
        format={format}
        {...settings}
      />,
    ],
    [
      'statistics',
      <StatisticsExportLayout
        key="statistics"
        calendarData={calendarData}
        year={2026}
        format={format}
        flagDisplayMode="emoji"
      />,
    ],
  ]
}

describe.each(EXPORT_FORMATS)('%s exports', (format) => {
  it.each(layouts(format))(
    'draws the %s export on the fixed canvas with one watermark',
    (_, element) => {
      const { container } = render(element)
      const canvas = container.querySelector<HTMLElement>(
        '[data-export-canvas]'
      )
      const watermarks = container.querySelectorAll('[data-export-watermark]')

      expect(canvas).toHaveAttribute('data-export-canvas', format)
      expect(canvas?.style.width).toBe(`${EXPORT_CANVAS[format].width}px`)
      expect(canvas?.style.height).toBe(`${EXPORT_CANVAS[format].height}px`)
      expect(watermarks).toHaveLength(1)
      expect(watermarks[0].parentElement?.style.fontSize).toBe(
        `${EXPORT_FRAME.watermarkSize}px`
      )
    }
  )
})

describe('YearExportLayout', () => {
  it('shows every month and both flags on a two-country day', () => {
    render(
      <YearExportLayout
        calendarData={calendarData}
        year={2026}
        format="story"
        {...settings}
      />
    )

    expect(screen.getByRole('heading', { name: '2026' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(12)
    expect(screen.getAllByText(getFlagEmoji('FR'))).toHaveLength(7)
    expect(screen.getAllByText(getFlagEmoji('IT'))).toHaveLength(7)
  })
})

describe('MonthlyExportLayout', () => {
  it.each([
    { format: 'story', rows: 4 },
    { format: 'feed', rows: 3 },
  ] as const)(
    'ranks up to $rows countries in the $format format',
    ({ format, rows }) => {
      render(
        <MonthlyExportLayout
          calendarData={calendarData}
          year={2026}
          month={5}
          format={format}
          {...settings}
        />
      )

      expect(screen.getByText('Top Countries')).toBeInTheDocument()
      expect(screen.getAllByText(/^\d+ days?$/)).toHaveLength(rows)
    }
  )

  it('leaves out the ranking for a month without trips', () => {
    render(
      <MonthlyExportLayout
        calendarData={calendarData}
        year={2026}
        month={8}
        format="story"
        {...settings}
      />
    )

    expect(
      screen.getByRole('heading', { name: 'September 2026' })
    ).toBeInTheDocument()
    expect(screen.queryByText('Top Countries')).not.toBeInTheDocument()
    expect(screen.getByText('0.0%')).toBeInTheDocument()
  })
})

describe('StatisticsExportLayout', () => {
  it('shows the busiest month with its day count and the top five countries', () => {
    render(
      <StatisticsExportLayout
        calendarData={calendarData}
        year={2026}
        format="feed"
        flagDisplayMode="emoji"
      />
    )

    expect(screen.getByText('June')).toBeInTheDocument()
    expect(screen.getByText('14 days')).toBeInTheDocument()
    expect(screen.getByText('Australia')).toBeInTheDocument()
    expect(screen.getByText('5.')).toBeInTheDocument()
    expect(screen.queryByText('6.')).not.toBeInTheDocument()
  })
})
