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

    it('covers the GDPR basics, which apply with or without accounts', () => {
      render(<PrivacyPage />)

      expect(
        screen.getByText(/run by Szilard Dobai, in Romania/)
      ).toBeInTheDocument()
      expect(screen.getByText('Why we use your data')).toBeInTheDocument()
      expect(screen.getAllByText(/in full for 26 months/)).toHaveLength(3)
      expect(screen.getByText(/Frankfurt, Germany/)).toBeInTheDocument()
      expect(screen.getByText(/ANSPDCP/)).toBeInTheDocument()
      expect(screen.getByText('Error reports')).toBeInTheDocument()
      expect(
        screen.getByText(/Sentry receives error reports and page timings/)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/don't include your IP address, your email/)
      ).toBeInTheDocument()
      expect(
        screen.getAllByRole('link', { name: 'hello@yearly.world' }).length
      ).toBeGreaterThan(0)
      expect(
        screen.getAllByText(/Share usage stats/, { selector: 'span' })
      ).toHaveLength(2)
      expect(
        screen.queryByText(/providing the account you asked for/)
      ).toBeNull()
      expect(
        screen.getByText(/Resend sends the year-end reminder email/)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/unless the law requires us to/)
      ).toBeInTheDocument()
      expect(screen.getByText('If you write to us')).toBeInTheDocument()
      expect(
        screen.getByText(/ImprovMX forwards emails sent to/)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/2 years after the last message/)
      ).toBeInTheDocument()
      expect(screen.queryByText(/scrambled copy of the address/)).toBeNull()
      expect(
        screen.getByText(/leave out anything that could identify you/)
      ).toBeInTheDocument()
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
        screen.getByText(/We don't store your IP address with your sessions/)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/scrambled copy of the address/)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/Neon stores accounts and saved trips/)
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          /Resend sends sign-in codes and the year-end reminder email/
        )
      ).toBeInTheDocument()
      expect(
        screen.getByText(/the name on your Google account/)
      ).toBeInTheDocument()
      expect(
        screen.getAllByRole('link', { name: 'hello@yearly.world' }).length
      ).toBeGreaterThan(0)
      expect(
        screen.getByText(/providing the account you asked for/)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/If you don't use your account for 5 years/)
      ).toBeInTheDocument()
    })

    it('shows the terms and links them from the footer', () => {
      vi.stubEnv('ACCOUNTS_ENABLED', 'true')
      render(TermsPage())

      expect(screen.getByRole('heading', { name: 'Terms' })).toBeInTheDocument()
      expect(screen.getByText(/run by Szilard Dobai/)).toBeInTheDocument()
      expect(
        screen.getByText(/governed by the law of Romania/)
      ).toBeInTheDocument()
      expect(screen.getByText(/through gross negligence/)).toBeInTheDocument()

      render(<Footer />)
      expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute(
        'href',
        '/terms'
      )
    })
  })
})
