import { trackEvent } from '@/lib/tracking'
import type { CountryVisit } from '@/lib/types'
import { renderWithSettings, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TravelNudgeCard from './TravelNudgeCard'

vi.mock('@/lib/tracking', () => ({
  trackEvent: vi.fn(),
}))

function days(countryCode: string, from: Date, count: number): CountryVisit[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(from)
    date.setDate(from.getDate() + i)
    return { id: `${countryCode}-${from.getMonth()}-${i}`, countryCode, date }
  })
}

const today = new Date(2026, 10, 12)
const visits = [
  ...days('ES', new Date(2026, 8, 2), 19),
  ...days('CH', new Date(2026, 9, 24), 2),
]

describe('TravelNudgeCard', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(trackEvent).mockClear()
  })

  it('compares the last two months and asks about the next trip', async () => {
    const onPlanTrip = vi.fn()
    renderWithSettings(
      <TravelNudgeCard
        calendarData={{ visits }}
        onPlanTrip={onPlanTrip}
        today={today}
      />
    )
    expect(
      screen.getByText('In September you travelled 10× more than in October.')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Nothing planned yet. Time to schedule a new trip?')
    ).toBeInTheDocument()
    expect(trackEvent).toHaveBeenCalledWith('travel_nudge_shown', {
      direction: 'down',
    })

    await userEvent.click(screen.getByRole('button', { name: /Plan a trip/ }))
    expect(onPlanTrip).toHaveBeenCalled()
    expect(trackEvent).toHaveBeenCalledWith('travel_nudge_plan_click', {
      direction: 'down',
      hasUpcomingTrip: false,
    })
  })

  it('mentions an upcoming trip', () => {
    renderWithSettings(
      <TravelNudgeCard
        calendarData={{
          visits: [...visits, ...days('TH', new Date(2026, 11, 5), 3)],
        }}
        onPlanTrip={vi.fn()}
        today={today}
      />
    )
    expect(
      screen.getByText('Thailand is 23 days away. Anything after that?')
    ).toBeInTheDocument()
  })

  it('stays hidden for the rest of the month once dismissed', async () => {
    const { rerender } = renderWithSettings(
      <TravelNudgeCard
        calendarData={{ visits }}
        onPlanTrip={vi.fn()}
        today={today}
      />
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Hide until next month' })
    )
    expect(screen.queryByText(/In September/)).not.toBeInTheDocument()

    rerender(
      <TravelNudgeCard
        calendarData={{ visits }}
        onPlanTrip={vi.fn()}
        today={new Date(2026, 11, 2)}
      />
    )
    expect(screen.getByText(/October/)).toBeInTheDocument()
  })

  it('shows nothing for an empty calendar', () => {
    const { container } = renderWithSettings(
      <TravelNudgeCard
        calendarData={{ visits: [] }}
        onPlanTrip={vi.fn()}
        today={today}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })
})
