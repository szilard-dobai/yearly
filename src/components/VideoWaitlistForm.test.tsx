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

function json(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }))
}

function mockWaitlistApi({ joined = false } = {}) {
  fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    if (method === 'GET') return json({ joined })
    return json({ success: true }, method === 'POST' ? 201 : 200)
  })
}

function requestsWith(method: string) {
  return fetchMock.mock.calls.filter(([, init]) => init?.method === method)
}

function sentEmail() {
  return JSON.parse(requestsWith('POST')[0][1].body).email
}

function renderSignedIn() {
  getSession.mockResolvedValue({
    data: { user: { id: 'ana', email: 'ana@example.com' } },
  })
  return render(
    <AccountsEnabledProvider enabled>
      <VideoWaitlistForm />
    </AccountsEnabledProvider>
  )
}

describe('VideoWaitlistForm', () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue({ data: null })
    fetchMock.mockReset()
    mockWaitlistApi()
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
    expect(
      screen.queryByRole('button', { name: 'Remove me from the list' })
    ).not.toBeInTheDocument()
  })

  it('uses the signed-in email without asking for one', async () => {
    const user = userEvent.setup()
    renderSignedIn()

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
    expect(
      screen.getByRole('button', { name: 'Remove me from the list' })
    ).toBeVisible()
  })

  it('shows a signed-in person who is already on the list, and lets them leave', async () => {
    const user = userEvent.setup()
    mockWaitlistApi({ joined: true })
    renderSignedIn()

    expect(await screen.findByRole('status')).toHaveTextContent(
      "You're on the list."
    )
    expect(screen.queryByLabelText(/Join the list/)).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Remove me from the list' })
    )

    expect(await screen.findByLabelText(/Join the list/)).toBeVisible()
    expect(requestsWith('DELETE')).toEqual([
      ['/api/waitlist?feature=animated_video', { method: 'DELETE' }],
    ])
  })

  it('does not check for a session while accounts are off', () => {
    render(<VideoWaitlistForm />)

    expect(getSession).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/Join the list/)).not.toHaveAttribute(
      'readonly'
    )
  })
})
