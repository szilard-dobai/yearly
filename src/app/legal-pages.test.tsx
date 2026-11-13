import Footer from '@/components/Footer'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PrivacyPage from './privacy/page'
import TermsPage from './terms/page'

vi.mock('@/components/Header', () => ({ default: () => null }))
vi.mock('@/components/ThemeToggle', () => ({ default: () => null }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND')
  },
}))

describe('privacy, terms and footer', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('while accounts are switched off', () => {
    it('keeps the privacy page saying there are no accounts', () => {
      render(<PrivacyPage />)

      expect(
        screen.getByText(/There are no accounts and no ads/)
      ).toBeInTheDocument()
      expect(screen.queryByText('Your account')).not.toBeInTheDocument()
      expect(screen.queryByText(/Neon stores/)).not.toBeInTheDocument()
    })

    it('hides the terms page and its footer link', () => {
      expect(() => TermsPage()).toThrow('NOT_FOUND')

      render(<Footer />)
      expect(screen.queryByRole('link', { name: 'Terms' })).toBeNull()
    })
  })

  describe('once accounts are on', () => {
    it('describes accounts, who handles the data and how to delete it', () => {
      vi.stubEnv('ACCOUNTS_ENABLED', 'true')
      render(<PrivacyPage />)

      expect(screen.getByText(/Accounts are optional/)).toBeInTheDocument()
      expect(screen.getByText('Your account')).toBeInTheDocument()
      expect(
        screen.getByText(/We don't store your IP address/)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/Neon stores accounts and saved trips/)
      ).toBeInTheDocument()
      expect(screen.getByText(/Resend sends sign-in codes/)).toBeInTheDocument()
      expect(
        screen.getByRole('link', { name: 'hello@yearly.world' })
      ).toBeInTheDocument()
    })

    it('shows the terms and links them from the footer', () => {
      vi.stubEnv('ACCOUNTS_ENABLED', 'true')
      render(TermsPage())

      expect(screen.getByRole('heading', { name: 'Terms' })).toBeInTheDocument()
      expect(screen.getByText(/run by Szilard Dobai/)).toBeInTheDocument()

      render(<Footer />)
      expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute(
        'href',
        '/terms'
      )
    })
  })
})
