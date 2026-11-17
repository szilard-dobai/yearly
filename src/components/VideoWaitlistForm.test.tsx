import { AccountsEnabledProvider } from '@/components/account/AccountsEnabledProvider'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VideoWaitlistForm } from './VideoWaitlistForm'

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }))

vi.mock('@/lib/auth/client', () => ({ authClient: { getSession } }))

vi.mock('@/lib/tracking', () => ({
  trackEvent: vi.fn(),
  getDeviceType: () => 'desktop',
}))

vi.mock('@/lib/tracking/device-id', () => ({
  getDeviceId: () => 'device-123',
}))

const fetchMock = vi.fn()

function sentEmail() {
  return JSON.parse(fetchMock.mock.calls[0][1].body).email
}

describe('VideoWaitlistForm', () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue({ data: null })
    fetchMock
      .mockReset()
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 201 })
      )
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('asks for an email when nobody is signed in', async () => {
    const user = userEvent.setup()
    render(
      <AccountsEnabledProvider enabled>
        <VideoWaitlistForm />
      </AccountsEnabledProvider>
    )

    const input = screen.getByLabelText(/Join the list/)
    await user.type(input, 'me@example.com')
    await user.click(screen.getByRole('button', { name: 'Save my free video' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      "You're on the list."
    )
    expect(sentEmail()).toBe('me@example.com')
    expect(
      screen.queryByText(/This is the email you sign in with/)
    ).not.toBeInTheDocument()
  })

  it('uses the signed-in email without asking for one', async () => {
    const user = userEvent.setup()
    getSession.mockResolvedValue({
      data: { user: { id: 'ana', email: 'ana@example.com' } },
    })
    render(
      <AccountsEnabledProvider enabled>
        <VideoWaitlistForm />
      </AccountsEnabledProvider>
    )

    const input = screen.getByLabelText(/Join the list/)
    expect(await screen.findByDisplayValue('ana@example.com')).toBe(input)
    expect(input).toHaveAttribute('readonly')
    expect(
      screen.getByText(
        /This is the email you sign in with\. We'll only use it for this\./
      )
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save my free video' }))

    expect(await screen.findByRole('status')).toBeInTheDocument()
    expect(sentEmail()).toBe('ana@example.com')
  })

  it('does not check for a session while accounts are off', () => {
    render(<VideoWaitlistForm />)

    expect(getSession).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/Join the list/)).not.toHaveAttribute(
      'readonly'
    )
  })
})
