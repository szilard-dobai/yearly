import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SignInForm from './SignInForm'

const { sendVerificationOtp, emailOtp, social, replace, refresh } = vi.hoisted(
  () => ({
    sendVerificationOtp: vi.fn(),
    emailOtp: vi.fn(),
    social: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  })
)

vi.mock('@/lib/auth/client', () => ({
  authClient: {
    emailOtp: { sendVerificationOtp },
    signIn: { emailOtp, social },
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh }),
}))

const OK = { data: { success: true }, error: null }

async function requestCode(email = 'ana@example.com') {
  await userEvent.type(screen.getByLabelText('Email'), ` ${email} `)
  await userEvent.click(screen.getByRole('button', { name: 'Email me a code' }))
}

describe('SignInForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('emails a code and then asks for it', async () => {
    sendVerificationOtp.mockResolvedValue(OK)
    render(<SignInForm googleEnabled={false} next="/account" />)

    await requestCode()

    expect(sendVerificationOtp).toHaveBeenCalledWith({
      email: 'ana@example.com',
      type: 'sign-in',
    })
    expect(screen.getByText('ana@example.com')).toBeInTheDocument()
    expect(screen.getByLabelText('Code')).toHaveAttribute(
      'autocomplete',
      'one-time-code'
    )
  })

  it('signs in with the code and goes to the next page', async () => {
    sendVerificationOtp.mockResolvedValue(OK)
    emailOtp.mockResolvedValue(OK)
    render(<SignInForm googleEnabled={false} next="/create" />)

    await requestCode()
    await userEvent.type(screen.getByLabelText('Code'), '48 29-13')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(emailOtp).toHaveBeenCalledWith({
      email: 'ana@example.com',
      otp: '482913',
    })
    expect(replace).toHaveBeenCalledWith('/create')
    expect(refresh).toHaveBeenCalled()
  })

  it('keeps the sign-in button off until the code has 6 digits', async () => {
    sendVerificationOtp.mockResolvedValue(OK)
    render(<SignInForm googleEnabled={false} next="/account" />)

    await requestCode()
    await userEvent.type(screen.getByLabelText('Code'), '4829')

    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled()
  })

  it.each([
    [{ status: 400, code: 'INVALID_OTP' }, "That code isn't right"],
    [{ status: 400, code: 'OTP_EXPIRED' }, 'That code has expired'],
    [{ status: 403, code: 'TOO_MANY_ATTEMPTS' }, 'Too many wrong tries'],
    [{ status: 429 }, 'Too many tries'],
  ])('explains a rejected code (%j)', async (error, message) => {
    sendVerificationOtp.mockResolvedValue(OK)
    emailOtp.mockResolvedValue({ data: null, error })
    render(<SignInForm googleEnabled={false} next="/account" />)

    await requestCode()
    await userEvent.type(screen.getByLabelText('Code'), '482913')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(screen.getByRole('alert')).toHaveTextContent(message)
    expect(replace).not.toHaveBeenCalled()
  })

  it('sends a new code to the same address', async () => {
    sendVerificationOtp.mockResolvedValue(OK)
    render(<SignInForm googleEnabled={false} next="/account" />)

    await requestCode()
    await userEvent.click(
      screen.getByRole('button', { name: 'Send a new code' })
    )

    expect(sendVerificationOtp).toHaveBeenCalledTimes(2)
    expect(sendVerificationOtp).toHaveBeenLastCalledWith({
      email: 'ana@example.com',
      type: 'sign-in',
    })
  })

  it('goes back to the email step to use a different address', async () => {
    sendVerificationOtp.mockResolvedValue(OK)
    render(<SignInForm googleEnabled={false} next="/account" />)

    await requestCode()
    await userEvent.click(
      screen.getByRole('button', { name: 'Use a different email' })
    )

    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('explains when too many codes were requested', async () => {
    sendVerificationOtp.mockResolvedValue({
      data: null,
      error: { status: 429 },
    })
    render(<SignInForm googleEnabled={false} next="/account" />)

    await requestCode()

    expect(screen.getByRole('alert')).toHaveTextContent('Too many codes')
    expect(screen.queryByLabelText('Code')).not.toBeInTheDocument()
  })

  it('shows a general error when the email cannot be sent', async () => {
    sendVerificationOtp.mockResolvedValue({
      data: null,
      error: { status: 500 },
    })
    render(<SignInForm googleEnabled={false} next="/account" />)

    await requestCode()

    expect(screen.getByRole('alert')).toHaveTextContent(
      "We couldn't send the email"
    )
  })

  it('hides Google sign-in when it is turned off', () => {
    render(<SignInForm googleEnabled={false} next="/account" />)

    expect(
      screen.queryByRole('button', { name: 'Continue with Google' })
    ).not.toBeInTheDocument()
  })

  it('starts Google sign-in and returns to the next page', async () => {
    social.mockResolvedValue({ data: {}, error: null })
    render(<SignInForm googleEnabled next="/create" />)

    await userEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' })
    )

    expect(social).toHaveBeenCalledWith({
      provider: 'google',
      callbackURL: '/create',
      errorCallbackURL: '/sign-in',
    })
  })
})
