import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SignInForm from './SignInForm'

const { magicLink, social } = vi.hoisted(() => ({
  magicLink: vi.fn(),
  social: vi.fn(),
}))

vi.mock('@/lib/auth/client', () => ({
  authClient: { signIn: { magicLink, social } },
}))

describe('SignInForm', () => {
  beforeEach(() => {
    magicLink.mockReset()
    social.mockReset()
  })

  it('emails a sign-in link and says where it went', async () => {
    magicLink.mockResolvedValue({ data: { status: true }, error: null })
    render(<SignInForm googleEnabled={false} />)

    await userEvent.type(screen.getByLabelText('Email'), ' ana@example.com ')
    await userEvent.click(
      screen.getByRole('button', { name: 'Email me a link' })
    )

    expect(magicLink).toHaveBeenCalledWith({
      email: 'ana@example.com',
      callbackURL: '/account',
      errorCallbackURL: '/account',
    })
    expect(screen.getByText('Check your inbox')).toBeInTheDocument()
    expect(screen.getByText('ana@example.com')).toBeInTheDocument()
  })

  it('goes back to the form to use a different email', async () => {
    magicLink.mockResolvedValue({ data: { status: true }, error: null })
    render(<SignInForm googleEnabled={false} />)

    await userEvent.type(screen.getByLabelText('Email'), 'ana@example.com')
    await userEvent.click(
      screen.getByRole('button', { name: 'Email me a link' })
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Use a different email' })
    )

    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('explains when too many links were requested', async () => {
    magicLink.mockResolvedValue({ data: null, error: { status: 429 } })
    render(<SignInForm googleEnabled={false} />)

    await userEvent.type(screen.getByLabelText('Email'), 'ana@example.com')
    await userEvent.click(
      screen.getByRole('button', { name: 'Email me a link' })
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Too many sign-in emails'
    )
  })

  it('shows a general error when the email cannot be sent', async () => {
    magicLink.mockResolvedValue({ data: null, error: { status: 500 } })
    render(<SignInForm googleEnabled={false} />)

    await userEvent.type(screen.getByLabelText('Email'), 'ana@example.com')
    await userEvent.click(
      screen.getByRole('button', { name: 'Email me a link' })
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      "We couldn't send the email"
    )
  })

  it('hides Google sign-in when it is not set up', () => {
    render(<SignInForm googleEnabled={false} />)

    expect(
      screen.queryByRole('button', { name: 'Continue with Google' })
    ).not.toBeInTheDocument()
  })

  it('starts Google sign-in when it is set up', async () => {
    social.mockResolvedValue({ data: {}, error: null })
    render(<SignInForm googleEnabled callbackURL="/create" />)

    await userEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' })
    )

    expect(social).toHaveBeenCalledWith({
      provider: 'google',
      callbackURL: '/create',
      errorCallbackURL: '/account',
    })
  })
})
