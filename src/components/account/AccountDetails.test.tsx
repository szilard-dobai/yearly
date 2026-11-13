import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AccountDetails from './AccountDetails'

const { signOut, runCalendarSync, forgetSyncedCalendar, trackEvent, replace } =
  vi.hoisted(() => ({
    signOut: vi.fn(),
    runCalendarSync: vi.fn(),
    forgetSyncedCalendar: vi.fn(),
    trackEvent: vi.fn(),
    replace: vi.fn(),
  }))

vi.mock('@/lib/auth/client', () => ({ authClient: { signOut } }))
vi.mock('@/lib/calendar-sync/sync', () => ({ runCalendarSync }))
vi.mock('@/lib/calendar-sync/sign-out', () => ({ forgetSyncedCalendar }))
vi.mock('@/lib/tracking', () => ({ trackEvent }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh: vi.fn() }),
}))

describe('AccountDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signOut.mockResolvedValue({})
  })

  it('saves the latest changes, then signs out and clears the device', async () => {
    runCalendarSync.mockResolvedValue({ pending: false, firstSync: null })
    render(<AccountDetails userId="ana" email="ana@example.com" />)

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(runCalendarSync).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'ana', refresh: false })
    )
    expect(signOut).toHaveBeenCalled()
    expect(forgetSyncedCalendar).toHaveBeenCalled()
    expect(trackEvent).toHaveBeenCalledWith('sign_out', {
      unsavedChanges: false,
    })
    expect(replace).toHaveBeenCalledWith('/')
  })

  it('warns when the latest changes couldn’t be saved, and lets people sign out anyway', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    runCalendarSync.mockRejectedValue(new Error('offline'))
    render(<AccountDetails userId="ana" email="ana@example.com" />)

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      "Your latest changes haven't reached your account yet"
    )
    expect(signOut).not.toHaveBeenCalled()

    await userEvent.click(
      screen.getByRole('button', { name: 'Sign out anyway' })
    )

    expect(signOut).toHaveBeenCalled()
    expect(trackEvent).toHaveBeenCalledWith('sign_out', {
      unsavedChanges: true,
    })
  })
})
