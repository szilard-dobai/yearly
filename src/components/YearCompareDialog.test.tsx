import { trackEvent } from '@/lib/tracking'
import type { CountryVisit } from '@/lib/types'
import { renderWithSettings, screen, within } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import YearCompareDialog from './YearCompareDialog'

vi.mock('@/lib/tracking', () => ({
  trackEvent: vi.fn(),
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
  ...days('GR', new Date(2025, 7, 10), 9),
  ...days('ES', new Date(2026, 8, 2), 13),
  ...days('JP', new Date(2026, 1, 14), 8),
]

describe('YearCompareDialog', () => {
  beforeEach(() => {
    vi.mocked(trackEvent).mockClear()
  })

  it('hides the button when the year before has no trips', () => {
    const { container } = renderWithSettings(
      <YearCompareDialog calendarData={{ visits }} year={2025} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('compares the selected year with the one before', async () => {
    renderWithSettings(
      <YearCompareDialog calendarData={{ visits }} year={2026} />
    )
    await userEvent.click(screen.getByRole('button', { name: /vs 2025/ }))

    expect(trackEvent).toHaveBeenCalledWith('year_compare_open', { year: 2026 })
    const dialog = screen.getByRole('dialog')
    expect(
      within(dialog).getByText(
        '2026 was a bigger year: 50% more days abroad than 2025, and 1 new country.'
      )
    ).toBeInTheDocument()
    const daysRow = within(dialog).getByText('Days abroad').closest('tr')!
    expect(within(daysRow).getByText('14')).toBeInTheDocument()
    expect(within(daysRow).getByText('21')).toBeInTheDocument()
    expect(within(dialog).getByText('New in 2026')).toBeInTheDocument()
    expect(within(dialog).getByText('Only in 2025')).toBeInTheDocument()
  })
})
