import {
  EXPORT_CANVAS,
  EXPORT_FORMATS,
  EXPORT_FRAME,
  type ExportFormat,
} from '@/lib/export-canvas'
import type { CalendarData } from '@/lib/types'
import { MAP_COLOURS } from '@/lib/world-map'
import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import MapExportLayout from '../map/MapExportLayout'
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

const settings = { weekStartsOn: 1 } as const

const mapImage = { src: 'data:image/png;base64,map', width: 952, height: 426 }

const mapCountries = [
  { code: 'FR', days: 7 },
  { code: 'IT', days: 7 },
  { code: 'AU', days: 10 },
  { code: 'JP', days: 8 },
]

function manyCountries(count: number) {
  return [
    'FR',
    'IT',
    'ES',
    'PT',
    'DE',
    'NL',
    'BE',
    'AT',
    'CH',
    'GR',
    'TR',
    'JP',
    'KR',
    'TH',
    'VN',
    'SG',
    'MY',
    'ID',
    'AU',
    'NZ',
  ]
    .slice(0, count)
    .map((code) => ({ code, days: 2 }))
}

function flagImages(container: HTMLElement, code: string) {
  return container.querySelectorAll<HTMLImageElement>(
    `img[src^="/emoji/flags/large/${code.toLowerCase()}."]`
  )
}

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
      />,
    ],
    [
      'map',
      <MapExportLayout
        key="map"
        map={mapImage}
        countries={mapCountries}
        title="2026"
        mode="flags"
        format={format}
        colours={MAP_COLOURS.light}
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
    const { container } = render(
      <YearExportLayout
        calendarData={calendarData}
        year={2026}
        format="story"
        {...settings}
      />
    )

    expect(screen.getByRole('heading', { name: '2026' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(12)
    expect(flagImages(container, 'FR')).toHaveLength(7)
    expect(flagImages(container, 'IT')).toHaveLength(7)
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
      />
    )

    expect(screen.getByText('June')).toBeInTheDocument()
    expect(screen.getByText('14 days')).toBeInTheDocument()
    expect(screen.getByText('Australia')).toBeInTheDocument()
    expect(screen.getByText('5.')).toBeInTheDocument()
    expect(screen.queryByText('6.')).not.toBeInTheDocument()
  })

  it('draws the medals and flags from the large images', () => {
    const { container } = render(
      <StatisticsExportLayout
        calendarData={calendarData}
        year={2026}
        format="story"
      />
    )

    const medals = [
      ...container.querySelectorAll<HTMLImageElement>('img[src*="-medal."]'),
    ].map((image) => image.getAttribute('src')?.split('/')[2])
    expect(medals).toEqual(['large', 'large', 'large'])
    expect(flagImages(container, 'AU')).toHaveLength(1)
    expect(screen.queryByText('🥇')).not.toBeInTheDocument()
  })
})

describe('MapExportLayout', () => {
  it('draws the map image, a ranked list for a few countries and the totals', () => {
    const { container } = render(
      <MapExportLayout
        map={mapImage}
        countries={mapCountries}
        title="All time"
        mode="flags"
        format="story"
        colours={MAP_COLOURS.light}
      />
    )

    const map = container.querySelector<HTMLImageElement>(
      'img[data-export-map]'
    )
    expect(map?.getAttribute('src')).toBe(mapImage.src)
    expect(map?.style.width).toBe('952px')
    expect(
      screen.getByRole('heading', { name: 'All time' })
    ).toBeInTheDocument()
    expect(screen.getByText('Australia')).toBeInTheDocument()
    expect(screen.getByText('10 days')).toBeInTheDocument()
    expect(screen.getByText('Countries').nextElementSibling).toHaveTextContent(
      '4'
    )
    expect(screen.getByText('Continents').nextElementSibling).toHaveTextContent(
      '3of 7'
    )
    expect(screen.queryByText('Days spent')).not.toBeInTheDocument()
  })

  it('shows many countries as a grid of large flags with their names', () => {
    const { container } = render(
      <MapExportLayout
        map={mapImage}
        countries={manyCountries(20)}
        title="2026"
        mode="flags"
        format="feed"
        colours={MAP_COLOURS.dark}
      />
    )

    expect(screen.getByText('France')).toBeInTheDocument()
    expect(screen.queryByText('2 days')).not.toBeInTheDocument()
    expect(flagImages(container, 'FR')).toHaveLength(1)
    expect(flagImages(container, 'NZ')).toHaveLength(1)
  })

  it('adds a legend for the days shading', () => {
    render(
      <MapExportLayout
        map={mapImage}
        countries={mapCountries}
        title="2026"
        mode="shade"
        format="story"
        colours={MAP_COLOURS.light}
      />
    )

    expect(screen.getByText('1–3 days')).toBeInTheDocument()
    expect(screen.getByText('15+')).toBeInTheDocument()
  })
})
