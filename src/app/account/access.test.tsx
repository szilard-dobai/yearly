import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SignInPage from '../sign-in/page'
import AccountPage from './page'

const { getSession, userAgent } = vi.hoisted(() => ({
  getSession: vi.fn(),
  userAgent: { value: 'Mozilla/5.0 (iPhone) Safari/604.1' },
}))

vi.mock('@/lib/auth/server', () => ({ getSession }))

vi.mock('@/lib/auth/client', () => ({ authClient: {} }))

vi.mock('@/components/Header', () => ({ default: () => null }))

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'user-agent': userAgent.value }),
}))

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND')
  },
  redirect: (path: string) => {
    throw new Error(`REDIRECT ${path}`)
  },
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}))

const SESSION = { user: { email: 'ana@example.com' } }

function signInPage(params: Record<string, string> = {}) {
  return SignInPage({ searchParams: Promise.resolve(params) })
}

describe('account pages', () => {
  beforeEach(() => {
    vi.stubEnv('ACCOUNTS_ENABLED', 'true')
    vi.stubEnv('GOOGLE_CLIENT_ID', 'id')
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'secret')
    getSession.mockResolvedValue(null)
    userAgent.value = 'Mozilla/5.0 (iPhone) Safari/604.1'
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('while accounts are switched off', () => {
    it('returns 404 for both pages', async () => {
      vi.stubEnv('ACCOUNTS_ENABLED', '')

      await expect(signInPage()).rejects.toThrow('NOT_FOUND')
      await expect(AccountPage()).rejects.toThrow('NOT_FOUND')
    })
  })

  describe('/account', () => {
    it('sends signed-out visitors to sign in and back', async () => {
      await expect(AccountPage()).rejects.toThrow(
        'REDIRECT /sign-in?next=/account'
      )
    })

    it('shows the signed-in email', async () => {
      getSession.mockResolvedValue(SESSION)

      render(await AccountPage())

      expect(screen.getByText('ana@example.com')).toBeInTheDocument()
    })
  })

  describe('/sign-in', () => {
    it('sends signed-in visitors on to the next page', async () => {
      getSession.mockResolvedValue(SESSION)

      await expect(signInPage({ next: '/create' })).rejects.toThrow(
        'REDIRECT /create'
      )
    })

    it('ignores a next address on another site', async () => {
      getSession.mockResolvedValue(SESSION)

      await expect(
        signInPage({ next: 'https://evil.example' })
      ).rejects.toThrow('REDIRECT /account')
    })

    it('offers email and Google to signed-out visitors', async () => {
      render(await signInPage())

      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Continue with Google' })
      ).toBeInTheDocument()
    })

    it('hides Google inside in-app browsers, where Google blocks it', async () => {
      userAgent.value =
        'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Mobile/15E148 Instagram 312.0.0'

      render(await signInPage())

      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Continue with Google' })
      ).not.toBeInTheDocument()
    })

    it('explains a failed Google sign-in', async () => {
      render(await signInPage({ error: 'access_denied' }))

      expect(screen.getByRole('alert')).toHaveTextContent(
        "Google sign-in didn't work"
      )
    })
  })
})
