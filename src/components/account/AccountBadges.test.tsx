import { render, renderWithSettings, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AccountBadges from './AccountBadges'
import AccountTrips from './AccountTrips'

const { runCalendarSync, loadCalendarData } = vi.hoisted(() => ({
  runCalendarSync: vi.fn(),
  loadCalendarData: vi.fn(),
}))

vi.mock('@/lib/calendar-sync/sync', () => ({ runCalendarSync }))
vi.mock('@/lib/tracking', () => ({ trackEvent: vi.fn() }))
vi.mock('@/lib/storage', () => ({
  loadCalendarData,
  saveCalendarData: vi.fn(),
}))

const TODAY = new Date(2026, 10, 12)

describe('AccountBadges', () => {
  it('shows every badge with the trip that earned it', async () => {
    render(
      <AccountBadges
        days={{
          '2026-06-18': ['FR'],
          '2026-02-14': ['JP'],
          '2026-02-15': ['JP'],
        }}
        today={TODAY}
      />
    )
    expect(screen.getByText('2/17')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(17)

    await userEvent.click(screen.getByRole('button', { name: /Two flags/ }))
    expect(screen.getByRole('dialog', { name: 'Two flags' })).toHaveTextContent(
      'Your trip to France on 18 Jun 2026 earned it'
    )
  })

  it('encourages a first trip', () => {
    render(<AccountBadges days={{}} today={TODAY} />)
    expect(screen.getByText('0/17')).toBeInTheDocument()
    expect(
      screen.getByText('Add your first trip to earn your first badge.')
    ).toBeInTheDocument()
  })
})

describe('AccountTrips', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        disconnect() {}
      }
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the world map and badges once the calendar is synced', async () => {
    runCalendarSync.mockResolvedValue({ pending: false, firstSync: null })
    loadCalendarData.mockReturnValue({
      visits: [{ id: '1', countryCode: 'FR', date: new Date(2026, 2, 10) }],
    })
    renderWithSettings(<AccountTrips userId="ana" />)

    expect(screen.queryByText('Badges')).not.toBeInTheDocument()
    expect(screen.queryByText('World map')).not.toBeInTheDocument()
    expect(await screen.findByText('Badges')).toBeInTheDocument()
    expect(screen.getByText('1/17')).toBeInTheDocument()
    expect(screen.getByText('World map')).toBeInTheDocument()
    expect(screen.getByText('Countries').nextElementSibling).toHaveTextContent(
      '1'
    )
    expect(
      screen.queryByRole('radio', { name: 'All time' })
    ).not.toBeInTheDocument()
  })

  it('leaves badges out when the calendar can’t be reached', async () => {
    runCalendarSync.mockRejectedValue(new Error('offline'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderWithSettings(<AccountTrips userId="ana" />)

    await screen.findByText(/couldn't reach your saved trips/)
    expect(screen.queryByText('Badges')).not.toBeInTheDocument()
    expect(screen.queryByText('World map')).not.toBeInTheDocument()
  })
})
