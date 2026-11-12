import type { CountryVisit } from '@/lib/types'
import { projectWorld } from '@/lib/world-map'
import { renderWithSettings, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import atlas from 'world-atlas/countries-110m.json'
import { describe, expect, it, vi } from 'vitest'
import MapExportLayout from './MapExportLayout'
import WorldMapCard from './WorldMapCard'

vi.mock('@/lib/tracking', () => ({
  trackEvent: vi.fn(),
}))

function day(countryCode: string, date: Date): CountryVisit {
  return { id: `${countryCode}-${date.getTime()}`, countryCode, date }
}

const visits = [
  day('GR', new Date(2025, 7, 10)),
  day('FR', new Date(2026, 5, 18)),
  day('JP', new Date(2026, 1, 14)),
  day('AU', new Date(2026, 11, 20)),
]

function statValue(label: string) {
  return screen.getByText(label).nextElementSibling?.textContent
}

describe('WorldMapCard', () => {
  it('counts the selected year and switches to all time', async () => {
    renderWithSettings(<WorldMapCard calendarData={{ visits }} year={2026} />)
    expect(statValue('Countries')).toBe('3')
    expect(statValue('Continents')).toBe('3/7')

    await userEvent.click(screen.getByRole('radio', { name: 'All time' }))
    expect(statValue('Countries')).toBe('4')
    expect(
      await screen.findByRole('img', { name: /4 countries filled in/ })
    ).toBeInTheDocument()
  })

  it('offers a zoom per continent', () => {
    renderWithSettings(<WorldMapCard calendarData={{ visits }} year={2026} />)
    expect(screen.getByRole('radio', { name: 'Europe' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Oceania' })).toBeInTheDocument()
  })

  it('stays hidden until there are trips', () => {
    const { container } = renderWithSettings(
      <WorldMapCard calendarData={{ visits: [] }} year={2026} />
    )
    expect(container).toBeEmptyDOMElement()
  })
})

describe('MapExportLayout', () => {
  it('draws the map with the year and its numbers', () => {
    renderWithSettings(
      <MapExportLayout
        world={projectWorld(atlas)}
        countries={[
          { code: 'FR', days: 7 },
          { code: 'JP', days: 8 },
        ]}
        title="2026"
        mode="flags"
        format="story"
        flagDisplayMode="emoji"
        theme="light"
      />
    )
    expect(screen.getByText('2026')).toBeInTheDocument()
    expect(screen.getByText('countries')).toBeInTheDocument()
    expect(screen.getByText('continents')).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: /2 countries filled in/ })
    ).toBeInTheDocument()
  })
})
