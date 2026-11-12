import { computeBadges } from '@/lib/badges'
import { trackEvent } from '@/lib/tracking'
import { buildDayMap } from '@/lib/trips'
import type { CountryVisit } from '@/lib/types'
import { act, renderWithSettings, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import WrappedButton from './WrappedButton'

vi.mock('@/lib/tracking', () => ({
  trackEvent: vi.fn(),
}))

vi.mock('@/components/map/WorldMap', () => ({
  default: () => <div data-testid="world-map" />,
}))

function days(countryCode: string, from: Date, count: number): CountryVisit[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(from)
    date.setDate(from.getDate() + i)
    return { id: `${countryCode}-${from.getTime()}-${i}`, countryCode, date }
  })
}

const visits = [
  ...days('ES', new Date(2025, 3, 17), 5),
  ...days('JP', new Date(2026, 1, 14), 8),
  ...days('ES', new Date(2026, 8, 2), 13),
  ...days('PT', new Date(2026, 8, 14), 7),
]
const badges = computeBadges(buildDayMap(visits), '2026-11-12')

describe('WrappedButton', () => {
  beforeEach(() => {
    vi.mocked(trackEvent).mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('hides itself for a year without trips', () => {
    const { container } = renderWithSettings(
      <WrappedButton
        calendarData={{ visits }}
        year={2024}
        badges={badges}
        onDownloadCalendar={vi.fn()}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('plays the year slide by slide and ends on the share screen', async () => {
    const user = userEvent.setup()
    const onDownloadCalendar = vi.fn()
    renderWithSettings(
      <WrappedButton
        calendarData={{ visits }}
        year={2026}
        badges={badges}
        onDownloadCalendar={onDownloadCalendar}
      />
    )
    await user.click(
      screen.getByRole('button', { name: /Play your 2026 story/ })
    )
    expect(trackEvent).toHaveBeenCalledWith('wrapped_open', {
      year: 2026,
      countryCount: 3,
    })
    expect(await screen.findByText('Your year in travel')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('3 countries')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('27')).toBeInTheDocument()

    for (let i = 0; i < 10; i++) {
      const next = screen.queryByRole('button', { name: 'Next' })
      if (!next) break
      await user.click(next)
    }
    expect(await screen.findByText('That was 2026.')).toBeInTheDocument()
    await act(async () => {})
    expect(trackEvent).toHaveBeenCalledWith(
      'wrapped_complete',
      expect.objectContaining({ year: 2026 })
    )

    await user.click(screen.getByRole('button', { name: /Calendar image/ }))
    expect(onDownloadCalendar).toHaveBeenCalled()
  })
})
