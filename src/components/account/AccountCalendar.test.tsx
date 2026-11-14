import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AccountCalendar from './AccountCalendar'

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

describe('AccountCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loadCalendarData.mockReturnValue(null)
  })

  it('syncs this device with the account', async () => {
    runCalendarSync.mockResolvedValue({ pending: false, firstSync: null })
    render(<AccountCalendar userId="ana" />)

    expect(screen.getByText('Checking your saved trips…')).toBeInTheDocument()
    await screen.findByText(/saved to your account/)
    expect(runCalendarSync).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'ana', refresh: true })
    )
  })

  it('says how many days of trips are saved', async () => {
    runCalendarSync.mockResolvedValue({ pending: false, firstSync: null })
    loadCalendarData.mockReturnValue({
      visits: [
        { id: '1', countryCode: 'FR', date: new Date(2026, 2, 10) },
        { id: '2', countryCode: 'DE', date: new Date(2026, 2, 10) },
        { id: '3', countryCode: 'DE', date: new Date(2026, 2, 11) },
      ],
    })
    render(<AccountCalendar userId="ana" />)

    expect(
      await screen.findByText(/2 days of trips are saved to your account/)
    ).toBeInTheDocument()
  })

  it('uses the singular for one day', async () => {
    runCalendarSync.mockResolvedValue({ pending: false, firstSync: null })
    loadCalendarData.mockReturnValue({
      visits: [{ id: '1', countryCode: 'FR', date: new Date(2026, 2, 10) }],
    })
    render(<AccountCalendar userId="ana" />)

    expect(
      await screen.findByText(/1 day of trips is saved to your account/)
    ).toBeInTheDocument()
  })

  it('asks before adding this device’s trips to an account with its own', async () => {
    runCalendarSync.mockImplementation(async ({ chooseFirstSync }) => {
      const choice = await chooseFirstSync({
        newDays: 2,
        accountDays: 5,
        crowdedDays: 0,
      })
      return { pending: false, firstSync: choice }
    })
    render(<AccountCalendar userId="ana" />)

    await userEvent.click(
      await screen.findByRole('button', { name: 'Add them to my account' })
    )

    await screen.findByText(/saved to your account/)
    expect(await runCalendarSync.mock.results[0].value).toEqual({
      pending: false,
      firstSync: 'merge',
    })
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('explains when the account can’t be reached', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    runCalendarSync.mockRejectedValue(new Error('offline'))
    render(<AccountCalendar userId="ana" />)

    expect(
      await screen.findByText(/couldn't reach your saved trips/)
    ).toBeInTheDocument()
  })
})
