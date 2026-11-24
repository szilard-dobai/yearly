import Footer from '@/components/Footer'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PrivacyPage from './privacy/page'
import TermsPage from './terms/page'

vi.mock('@/components/Header', () => ({ default: () => null }))
vi.mock('@/components/ThemeToggle', () => ({ default: () => null }))

describe('privacy, terms and footer', () => {
  describe('privacy page', () => {
    it('covers the GDPR basics', () => {
      render(<PrivacyPage />)

      expect(
        screen.getByText(/run by Szilard Dobai, in Romania/)
      ).toBeInTheDocument()
      expect(screen.getByText('Why we use your data')).toBeInTheDocument()
      expect(screen.getAllByText(/in full for 26 months/)).toHaveLength(3)
      expect(
        screen.getByText(/Our servers and databases are in Frankfurt/)
      ).toBeInTheDocument()
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
        screen.getByText(/unless the law requires us to/)
      ).toBeInTheDocument()
      expect(screen.getByText('If you write to us')).toBeInTheDocument()
      expect(
        screen.getByText(/forwards emails sent to .* to our Yahoo Mail inbox/)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/2 years after the last message/)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/leave out anything that could identify you/)
      ).toBeInTheDocument()
    })

    it('credits the flag and emoji images on the privacy page', () => {
      render(<PrivacyPage />)

      expect(
        screen.getByRole('link', { name: 'Apache License 2.0' })
      ).toHaveAttribute('href', '/emoji/LICENSE')
      expect(screen.getByRole('link', { name: 'Noto Emoji' })).toHaveAttribute(
        'href',
        'https://github.com/googlefonts/noto-emoji'
      )
    })

    it('describes accounts, who handles the data and how to delete it', () => {
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
          /Resend sends sign-in codes, the year-end reminder email and the video launch email/
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
  })

  describe('terms', () => {
    it('shows the terms and links them from the footer', () => {
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
