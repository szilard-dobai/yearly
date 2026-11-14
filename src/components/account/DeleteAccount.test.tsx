import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DeleteAccount from './DeleteAccount'

const {
  deleteUser,
  signOut,
  clearSyncState,
  forgetSyncedCalendar,
  trackEvent,
  replace,
} = vi.hoisted(() => ({
  deleteUser: vi.fn(),
  signOut: vi.fn(),
  clearSyncState: vi.fn(),
  forgetSyncedCalendar: vi.fn(),
  trackEvent: vi.fn(),
  replace: vi.fn(),
}))

vi.mock('@/lib/auth/client', () => ({ authClient: { deleteUser, signOut } }))
vi.mock('@/lib/calendar-sync/sync', () => ({ clearSyncState }))
vi.mock('@/lib/calendar-sync/sign-out', () => ({ forgetSyncedCalendar }))
vi.mock('@/lib/tracking', () => ({ trackEvent }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh: vi.fn() }),
}))

async function confirmDelete() {
  await userEvent.click(screen.getByRole('button', { name: 'Delete account' }))
  await userEvent.click(
    screen.getByRole('alertdialog').querySelector('button:last-of-type')!
  )
}

describe('DeleteAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('says what is deleted and what stays on the device', () => {
    render(<DeleteAccount />)

    expect(
      screen.getByText(/Deletes your account, your email address and the trips/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Trips on this device stay here/)
    ).toBeInTheDocument()
  })

  it('asks for confirmation before deleting anything', async () => {
    render(<DeleteAccount />)

    await userEvent.click(
      screen.getByRole('button', { name: 'Delete account' })
    )

    expect(screen.getByText('Delete your account?')).toBeInTheDocument()
    expect(deleteUser).not.toHaveBeenCalled()
  })

  it('deletes the account and keeps the trips on the device', async () => {
    deleteUser.mockResolvedValue({ data: { success: true }, error: null })
    render(<DeleteAccount />)

    await confirmDelete()

    expect(deleteUser).toHaveBeenCalled()
    expect(clearSyncState).toHaveBeenCalled()
    expect(forgetSyncedCalendar).not.toHaveBeenCalled()
    expect(trackEvent).toHaveBeenCalledWith('account_deleted')
    expect(replace).toHaveBeenCalledWith('/')
  })

  it('asks people to sign in again when their session is too old', async () => {
    deleteUser.mockResolvedValue({
      data: null,
      error: { code: 'SESSION_EXPIRED', status: 400 },
    })
    render(<DeleteAccount />)

    await confirmDelete()

    expect(screen.getByRole('alert')).toHaveTextContent(
      'For your security, sign in again'
    )
    await userEvent.click(screen.getByRole('button', { name: 'Sign in again' }))

    expect(signOut).toHaveBeenCalled()
    expect(replace).toHaveBeenCalledWith('/sign-in?next=/account')
  })

  it('explains other failures and how to reach us', async () => {
    deleteUser.mockResolvedValue({
      data: null,
      error: { code: 'INTERNAL', status: 500 },
    })
    render(<DeleteAccount />)

    await confirmDelete()

    expect(screen.getByRole('alert')).toHaveTextContent('hello@yearly.world')
    expect(replace).not.toHaveBeenCalled()
  })
})
