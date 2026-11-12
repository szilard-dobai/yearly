import { trackEvent } from '@/lib/tracking'
import { renderWithSettings, screen } from '@/test/test-utils'
import type { CountryVisit } from '@/lib/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TripCountdown from './TripCountdown'

vi.mock('@/lib/tracking', () => ({
  trackEvent: vi.fn(),
}))

function days(countryCode: string, from: Date, count: number): CountryVisit[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(from)
    date.setDate(from.getDate() + i)
    return { id: `${countryCode}-${i}`, countryCode, date }
  })
}

const today = new Date(2026, 10, 12)

describe('TripCountdown', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(trackEvent).mockClear()
  })

  it('shows nothing when no trip is in progress or planned', () => {
    const { container } = renderWithSettings(
      <TripCountdown
        calendarData={{ visits: days('FR', new Date(2026, 5, 1), 3) }}
        today={today}
      />
    )
    expect(container).toBeEmptyDOMElement()
    expect(trackEvent).not.toHaveBeenCalled()
  })

  it('counts down to the next trip and mentions the one after', () => {
    renderWithSettings(
      <TripCountdown
        calendarData={{
          visits: [
            ...days('TH', new Date(2026, 11, 5), 3),
            ...days('AU', new Date(2026, 11, 19), 10),
          ],
        }}
        today={today}
      />
    )
    expect(screen.getByText('Thailand')).toBeInTheDocument()
    expect(screen.getByText('23')).toBeInTheDocument()
    expect(screen.getByText('days to go')).toBeInTheDocument()
    expect(screen.getByText(/Australia in 37 days/)).toBeInTheDocument()
    expect(trackEvent).toHaveBeenCalledWith('trip_countdown_shown', {
      state: 'upcoming',
    })
  })

  it('says pack your bags in the last week', () => {
    renderWithSettings(
      <TripCountdown
        calendarData={{ visits: days('TH', new Date(2026, 10, 15), 3) }}
        today={today}
      />
    )
    expect(screen.getByText('Pack your bags')).toBeInTheDocument()
  })

  it('wishes a good trip while you are away', () => {
    renderWithSettings(
      <TripCountdown
        calendarData={{ visits: days('AU', new Date(2026, 10, 9), 10) }}
        today={today}
      />
    )
    expect(screen.getByText('Have fun in Australia!')).toBeInTheDocument()
    expect(screen.getByText(/Day 4 of 10 · 6 days left/)).toBeInTheDocument()
    expect(trackEvent).toHaveBeenCalledWith('trip_countdown_shown', {
      state: 'during',
    })
  })
})
