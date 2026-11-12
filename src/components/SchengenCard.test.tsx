import { trackEvent } from '@/lib/tracking'
import type { CountryVisit } from '@/lib/types'
import { renderWithSettings, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SchengenCard from './SchengenCard'

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

const today = new Date(2026, 10, 12)
const visits = [
  ...days('ES', new Date(2026, 8, 2), 13),
  ...days('PT', new Date(2026, 8, 15), 6),
  ...days('TH', new Date(2026, 7, 7), 4),
]

describe('SchengenCard', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(trackEvent).mockClear()
  })

  it('stays hidden without Schengen days in the last year', () => {
    const { container } = renderWithSettings(
      <SchengenCard
        calendarData={{ visits: days('TH', new Date(2026, 7, 7), 4) }}
        today={today}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('counts the last 180 days and asks about the passport', async () => {
    renderWithSettings(<SchengenCard calendarData={{ visits }} today={today} />)
    expect(
      screen.getByText('days left', { selector: 'span' }).previousElementSibling
    ).toHaveTextContent('71')
    expect(screen.getByText(/19 of 90 days/)).toBeInTheDocument()
    expect(trackEvent).toHaveBeenCalledWith('schengen_counter_shown', {
      passport: 'unknown',
      left: 71,
    })

    await userEvent.click(screen.getByRole('button', { name: 'No' }))
    expect(screen.queryByText(/Do you travel on an EU/)).not.toBeInTheDocument()
    expect(trackEvent).toHaveBeenCalledWith('schengen_passport_set', {
      passport: 'limited',
    })
  })

  it('has nothing to count for EU, EEA and Swiss passports', async () => {
    renderWithSettings(<SchengenCard calendarData={{ visits }} today={today} />)
    await userEvent.click(screen.getByRole('button', { name: 'Yes' }))
    expect(screen.getByText('No Schengen limit for you')).toBeInTheDocument()
    expect(screen.queryByText('days left')).not.toBeInTheDocument()
  })

  it('checks whether a planned stay fits', async () => {
    renderWithSettings(<SchengenCard calendarData={{ visits }} today={today} />)
    expect(screen.getByRole('status')).toHaveTextContent('That works.')
    for (let i = 0; i < 60; i++) {
      await userEvent.click(
        screen.getByRole('button', { name: 'One day more' })
      )
    }
    expect(screen.getByRole('status')).toHaveTextContent('Too long.')
  })
})
