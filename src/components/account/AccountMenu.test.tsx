import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AccountMenu from './AccountMenu'
import { AccountsEnabledProvider } from './AccountsEnabledProvider'

const { useSession, pathname } = vi.hoisted(() => ({
  useSession: vi.fn(),
  pathname: { value: '/create' },
}))

vi.mock('@/lib/auth/client', () => ({ authClient: { useSession } }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.value }))

function renderMenu(enabled = true) {
  return render(
    <AccountsEnabledProvider enabled={enabled}>
      <AccountMenu />
    </AccountsEnabledProvider>
  )
}

describe('AccountMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pathname.value = '/create'
    useSession.mockReturnValue({ data: null, isPending: false })
  })

  it('shows nothing and checks no session while accounts are switched off', () => {
    const { container } = renderMenu(false)

    expect(container).toBeEmptyDOMElement()
    expect(useSession).not.toHaveBeenCalled()
  })

  it('links signed-out visitors to sign in and back to this page', () => {
    renderMenu()

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/sign-in?next=%2Fcreate'
    )
  })

  it('shows the first letter of the email, linking to the account page', () => {
    useSession.mockReturnValue({
      data: { user: { email: 'ana@example.com' } },
      isPending: false,
    })
    renderMenu()

    const link = screen.getByRole('link', { name: 'Your account' })
    expect(link).toHaveAttribute('href', '/account')
    expect(link).toHaveTextContent('A')
  })

  it('holds the space while the session loads', () => {
    useSession.mockReturnValue({ data: null, isPending: true })
    renderMenu()

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('hides itself on the sign-in page', () => {
    pathname.value = '/sign-in'
    renderMenu()

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
