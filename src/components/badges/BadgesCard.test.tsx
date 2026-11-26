import { computeBadges } from '@/lib/badges'
import { trackEvent } from '@/lib/tracking'
import type { DayMap } from '@/lib/trips'
import { renderWithSettings, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BadgesCard from './BadgesCard'
import BadgesTeaser from './BadgesTeaser'
import BadgeUnlockedDialog from './BadgeUnlockedDialog'

vi.mock('@/lib/tracking', () => ({
  trackEvent: vi.fn(),
}))

const dayMap: DayMap = new Map([
  ['2026-02-14', ['JP']],
  ['2026-02-15', ['JP']],
  ['2026-06-18', ['FR']],
])

beforeEach(() => {
  vi.mocked(trackEvent).mockClear()
})

describe('BadgesCard', () => {
  it('shows progress and the next badge to earn', () => {
    renderWithSettings(
      <BadgesCard badges={computeBadges(dayMap, '2026-11-12')} />
    )
    expect(screen.getByText('2/17')).toBeInTheDocument()
    expect(screen.getByText('Next: Continent hopper')).toBeInTheDocument()
    expect(screen.getByText('2 of 3 continents')).toBeInTheDocument()
  })

  describe('with a planned trip', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date(2026, 10, 12))
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('says which trip unlocks the next badge', () => {
      const planned = new Map(dayMap).set('2026-12-05', ['KR'])
      renderWithSettings(
        <BadgesCard badges={computeBadges(planned, '2026-11-12')} />
      )
      expect(screen.getByText('Next: Weekend warrior')).toBeInTheDocument()
      expect(
        screen.getByText('Your trip to South Korea on 5 Dec unlocks it')
      ).toBeInTheDocument()
    })

    it('adds the year for a trip next year', () => {
      const planned = new Map(dayMap).set('2027-01-05', ['KR'])
      renderWithSettings(
        <BadgesCard badges={computeBadges(planned, '2026-11-12')} />
      )
      expect(
        screen.getByText('Your trip to South Korea on 5 Jan 2027 unlocks it')
      ).toBeInTheDocument()
    })
  })

  it('opens a badge from the card', async () => {
    renderWithSettings(
      <BadgesCard badges={computeBadges(dayMap, '2026-11-12')} />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Two flags' }))
    expect(screen.getByRole('dialog', { name: 'Two flags' })).toHaveTextContent(
      'Your trip to France on 18 Jun 2026 earned it'
    )
    await userEvent.keyboard('{Escape}')

    await userEvent.click(
      screen.getByRole('button', { name: /Next: Continent hopper/ })
    )
    expect(
      screen.getByRole('dialog', { name: 'Continent hopper' })
    ).toHaveTextContent('2 of 3 continents')
  })

  it('opens every badge from the extra count', async () => {
    const busy = new Map([
      ['2026-01-01', ['ES', 'FR']],
      ['2026-03-10', ['ES']],
      ['2026-05-10', ['ES']],
      ['2026-06-10', ['JP']],
      ['2026-09-10', ['MA']],
    ])
    renderWithSettings(
      <BadgesCard badges={computeBadges(busy, '2026-11-12')} />
    )
    await userEvent.click(screen.getByRole('button', { name: /more badges/ }))
    expect(trackEvent).toHaveBeenCalledWith('badges_open', { earned: 8 })
    expect(screen.getByRole('dialog', { name: 'Badges' })).toBeInTheDocument()
  })

  it('opens every badge and the details of one', async () => {
    renderWithSettings(
      <BadgesCard badges={computeBadges(dayMap, '2026-11-12')} />
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'See all badges' })
    )
    expect(trackEvent).toHaveBeenCalledWith('badges_open', { earned: 2 })
    expect(screen.getByText('Globetrotter')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Two flags/ }))
    expect(
      screen.getByText('Your trip to France on 18 Jun 2026 earned it')
    ).toBeInTheDocument()
  })

  it('encourages a first trip on an empty calendar', () => {
    renderWithSettings(
      <BadgesCard badges={computeBadges(new Map(), '2026-11-12')} />
    )
    expect(screen.getByText('0/17')).toBeInTheDocument()
    expect(
      screen.getByText('Add your first trip to earn your first badge.')
    ).toBeInTheDocument()
    expect(screen.queryByText(/^Next:/)).not.toBeInTheDocument()
  })
})

describe('BadgesTeaser', () => {
  it('counts the badges a signed-out calendar already earns', async () => {
    renderWithSettings(<BadgesTeaser earned={5} total={17} />)
    expect(
      screen.getByText('Your trips already earn 5 of 17 badges.')
    ).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Sign in to see them' })
    expect(link).toHaveAttribute('href', '/sign-in?next=/create')
    await userEvent.click(link)
    expect(trackEvent).toHaveBeenCalledWith('badges_teaser_click', {
      earned: 5,
    })
  })

  it('invites an empty calendar to start collecting', () => {
    renderWithSettings(<BadgesTeaser earned={0} total={17} />)
    expect(
      screen.getByRole('link', { name: 'Sign in to start collecting' })
    ).toBeInTheDocument()
  })
})

describe('BadgeUnlockedDialog', () => {
  it('celebrates the newest badge and counts the rest', async () => {
    const onOpenChange = vi.fn()
    const earned = computeBadges(dayMap, '2026-11-12').filter((b) => b.earnedOn)
    renderWithSettings(
      <BadgeUnlockedDialog badges={earned} open onOpenChange={onOpenChange} />
    )
    expect(screen.getByText('Badge unlocked')).toBeInTheDocument()
    expect(
      screen.getByRole('dialog', { name: 'Two flags' })
    ).toBeInTheDocument()
    expect(screen.getByText('and 1 more badge')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Nice' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('stays closed without a badge', () => {
    renderWithSettings(
      <BadgeUnlockedDialog badges={[]} open onOpenChange={vi.fn()} />
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
