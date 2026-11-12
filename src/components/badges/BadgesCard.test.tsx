import { computeBadges } from '@/lib/badges'
import { trackEvent } from '@/lib/tracking'
import type { DayMap } from '@/lib/trips'
import { renderWithSettings, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BadgesCard from './BadgesCard'
import BadgeUnlockedDialog from './BadgeUnlockedDialog'

vi.mock('@/lib/tracking', () => ({
  trackEvent: vi.fn(),
}))

const dayMap: DayMap = new Map([
  ['2026-02-14', ['JP']],
  ['2026-02-15', ['JP']],
  ['2026-06-18', ['FR']],
])

describe('BadgesCard', () => {
  beforeEach(() => {
    vi.mocked(trackEvent).mockClear()
  })

  it('shows progress and the next badge to earn', () => {
    renderWithSettings(
      <BadgesCard badges={computeBadges(dayMap, '2026-11-12')} />
    )
    expect(screen.getByText('2/17')).toBeInTheDocument()
    expect(screen.getByText('Next: Continent hopper')).toBeInTheDocument()
    expect(screen.getByText('2 of 3 continents')).toBeInTheDocument()
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
    expect(screen.getByText('Earned on 18 Jun 2026')).toBeInTheDocument()
  })

  it('encourages a first trip on an empty calendar', () => {
    renderWithSettings(
      <BadgesCard badges={computeBadges(new Map(), '2026-11-12')} />
    )
    expect(
      screen.getByText('Add your first trip to earn your first badge.')
    ).toBeInTheDocument()
  })
})

describe('BadgeUnlockedDialog', () => {
  it('celebrates the newest badge and counts the rest', async () => {
    const onClose = vi.fn()
    const earned = computeBadges(dayMap, '2026-11-12').filter((b) => b.earnedOn)
    renderWithSettings(
      <BadgeUnlockedDialog badges={earned} onClose={onClose} />
    )
    expect(screen.getByText('Badge unlocked')).toBeInTheDocument()
    expect(screen.getByText(earned.at(-1)!.name)).toBeInTheDocument()
    expect(screen.getByText('and 1 more badge')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Nice' }))
    expect(onClose).toHaveBeenCalled()
  })
})
