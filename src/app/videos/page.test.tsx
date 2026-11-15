import { joinWaitlist } from '@/lib/waitlist/client'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import VideosPage, { metadata } from './page'

vi.mock('@/components/Header', () => ({ default: () => null }))

vi.mock('@/components/ExampleVideo', () => ({
  ExampleVideo: ({ label }: { label: string }) => <figure aria-label={label} />,
}))

vi.mock('@/lib/waitlist/client', () => ({
  joinWaitlist: vi.fn(),
}))

describe('videos page', () => {
  beforeEach(() => {
    vi.mocked(joinWaitlist).mockReset()
  })

  it('is indexed at its own address', () => {
    expect(metadata.alternates?.canonical).toBe('/videos')
    expect(metadata.title).toBe('Your year in travel, animated')
  })

  it('shows the packs, the price and the launch date', () => {
    render(<VideosPage />)

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Your year in travel, animated.',
      })
    ).toBeInTheDocument()
    expect(screen.getByText('Coming in early December')).toBeInTheDocument()
    expect(screen.getByText('$2.99 per pack, paid once.')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Year pack' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Month pack' })
    ).toBeInTheDocument()
    expect(screen.getAllByRole('figure')).toHaveLength(3)
  })

  it('says the images stay free', () => {
    render(<VideosPage />)

    expect(
      screen.getByText('Your calendar and stats images stay free.')
    ).toBeInTheDocument()
  })

  it('states the refund policy and who takes the payment', () => {
    render(<VideosPage />)

    expect(
      screen.getByRole('heading', { name: 'Price and refunds' })
    ).toBeInTheDocument()
    expect(screen.getByText(/we'll fix it or refund you/)).toBeInTheDocument()
    expect(
      screen.getByText(/the EU's 14-day right to cancel ends/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Payments are handled by Polar/)
    ).toBeInTheDocument()
  })

  it('adds people to the waitlist with the free first video', async () => {
    vi.mocked(joinWaitlist).mockResolvedValue()
    const user = userEvent.setup()
    render(<VideosPage />)

    await user.type(
      screen.getByLabelText(/Join the list to get your/),
      'traveler@example.com'
    )
    await user.click(screen.getByRole('button', { name: 'Save my free video' }))

    expect(joinWaitlist).toHaveBeenCalledWith({
      email: 'traveler@example.com',
      feature: 'animated_video',
      context: { launchOffer: 'first_video_free' },
    })
    expect(await screen.findByRole('status')).toHaveTextContent(
      "You're on the list."
    )
  })

  it('shows what went wrong when joining fails', async () => {
    vi.mocked(joinWaitlist).mockRejectedValue(
      new Error('Too many requests, please try again later')
    )
    const user = userEvent.setup()
    render(<VideosPage />)

    await user.type(
      screen.getByLabelText(/Join the list to get your/),
      'traveler@example.com'
    )
    await user.click(screen.getByRole('button', { name: 'Save my free video' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many requests, please try again later'
    )
  })
})
