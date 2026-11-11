import { HOMEPAGE_EXAMPLES } from '@/lib/homepage-examples'
import { trackEvent } from '@/lib/tracking'
import { act, renderWithSettings, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import type { PropsWithChildren } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HomepageVideoTeaser } from './HomepageVideoTeaser'

vi.mock('@/components/AnimatedSection', () => ({
  AnimatedSection: ({
    children,
    className,
  }: PropsWithChildren<{ className?: string }>) => (
    <div className={className}>{children}</div>
  ),
}))

vi.mock('./HomepageVideoPlayer', () => ({
  default: ({ theme }: { theme: string }) => (
    <div data-testid="example-video" data-theme={theme} />
  ),
}))

vi.mock('@/lib/tracking', () => ({
  trackEvent: vi.fn(),
}))

let reportIntersection: (isIntersecting: boolean) => void

class MockIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    reportIntersection = (isIntersecting) =>
      callback(
        [{ isIntersecting } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver
      )
  }
  observe() {}
  disconnect() {}
}

describe('HomepageVideoTeaser', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(trackEvent).mockClear()
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('announces the animated video and when it launches', () => {
    renderWithSettings(<HomepageVideoTeaser />)

    expect(
      screen.getByRole('region', { name: 'Your year, animated' })
    ).toBeInTheDocument()
    expect(screen.getByText('Coming in early December')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Join the waitlist from your preview and your first video is free. Your images stay free.'
      )
    ).toBeInTheDocument()
  })

  it('shows the year example until the video is close to the screen', async () => {
    localStorage.setItem(
      'countries-in-year-settings',
      JSON.stringify({ colorScheme: 'dark' })
    )
    renderWithSettings(<HomepageVideoTeaser />)

    expect(screen.queryByTestId('example-video')).not.toBeInTheDocument()
    expect(screen.getAllByAltText(HOMEPAGE_EXAMPLES[0].alt)).toHaveLength(2)

    act(() => reportIntersection(true))

    expect(await screen.findByTestId('example-video')).toHaveAttribute(
      'data-theme',
      'dark'
    )
    expect(
      screen.queryByAltText(HOMEPAGE_EXAMPLES[0].alt)
    ).not.toBeInTheDocument()
  })

  it('sends people to the create page and records the click', async () => {
    const user = userEvent.setup()
    renderWithSettings(<HomepageVideoTeaser />)

    const link = screen.getByRole('link', {
      name: 'Add your trips to preview yours',
    })
    link.addEventListener('click', (event) => event.preventDefault())
    await user.click(link)

    expect(link).toHaveAttribute('href', '/create')
    expect(trackEvent).toHaveBeenCalledWith('homepage_cta_click', {
      linkType: 'video_teaser',
    })
  })
})
