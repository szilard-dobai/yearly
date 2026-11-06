import { SettingsProvider } from '@/lib/contexts/SettingsContext'
import { trackEvent } from '@/lib/tracking'
import type { CalendarData } from '@/lib/types'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AnimatedVideoDialog from './AnimatedVideoDialog'

vi.mock('@remotion/player', () => ({
  Player: ({
    durationInFrames,
    inputProps,
  }: {
    durationInFrames: number
    inputProps: { theme: string; data: { days: unknown[] } }
  }) => (
    <div
      data-testid="player"
      data-duration={durationInFrames}
      data-theme={inputProps.theme}
      data-days={inputProps.data.days.length}
    />
  ),
}))

vi.mock('@/lib/tracking', () => ({
  trackEvent: vi.fn(),
  getDeviceType: () => 'mobile',
}))

vi.mock('@/lib/tracking/device-id', () => ({
  getDeviceId: () => 'device-123',
}))

const fetchMock = vi.fn()

const calendarData: CalendarData = {
  visits: [
    { id: '1', countryCode: 'JP', date: new Date(2026, 2, 20) },
    { id: '2', countryCode: 'JP', date: new Date(2026, 2, 21) },
    { id: '3', countryCode: 'PT', date: new Date(2025, 0, 2) },
  ],
}

function renderDialog(exportType: 'calendar' | 'statistics' = 'calendar') {
  return render(
    <SettingsProvider>
      <AnimatedVideoDialog
        open
        onOpenChange={vi.fn()}
        calendarData={calendarData}
        year={2026}
        exportType={exportType}
        price={2.99}
      />
    </SettingsProvider>
  )
}

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }))
}

describe('AnimatedVideoDialog', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.mocked(trackEvent).mockClear()
    vi.stubGlobal('fetch', fetchMock)
    document.documentElement.classList.add('dark')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.documentElement.classList.remove('dark')
  })

  it("previews the selected year's trips in the current theme", () => {
    renderDialog()

    const player = screen.getByTestId('player')
    expect(player).toHaveAttribute('data-days', '2')
    expect(player).toHaveAttribute('data-theme', 'dark')
    expect(
      screen.getByRole('heading', { name: 'Your 2026, animated' })
    ).toBeInTheDocument()
  })

  it('switches between the year and stats videos and themes', async () => {
    const user = userEvent.setup()
    renderDialog('statistics')

    expect(screen.getByRole('radio', { name: 'Your stats' })).toBeChecked()
    const statsDuration = screen
      .getByTestId('player')
      .getAttribute('data-duration')

    await user.click(screen.getByRole('radio', { name: 'Your year' }))
    await user.click(screen.getByRole('radio', { name: 'Light' }))

    const player = screen.getByTestId('player')
    expect(player).toHaveAttribute('data-theme', 'light')
    expect(player.getAttribute('data-duration')).not.toBe(statsDuration)
  })

  it('records the buy click and offers the waitlist', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(
      screen.getByRole('button', { name: 'Get the videos · $2.99' })
    )

    expect(trackEvent).toHaveBeenCalledWith('animated_video_buy_click', {
      exportType: 'calendar',
      videoKind: 'year',
      year: 2026,
      price: 2.99,
      theme: 'dark',
    })
    expect(
      screen.getByLabelText(/Video downloads aren't live yet/)
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute(
      'href',
      '/privacy'
    )
  })

  it('joins the waitlist with the email and offer context', async () => {
    const user = userEvent.setup()
    fetchMock.mockReturnValue(jsonResponse({ success: true }, 201))
    renderDialog()

    await user.click(screen.getByRole('button', { name: /Get the videos/ }))
    await user.type(
      screen.getByLabelText(/Video downloads aren't live yet/),
      'me@example.com'
    )
    await user.click(screen.getByRole('button', { name: 'Notify me' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      "You're on the list."
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/waitlist',
      expect.objectContaining({ method: 'POST' })
    )
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      email: 'me@example.com',
      feature: 'animated_video',
      context: {
        exportType: 'calendar',
        videoKind: 'year',
        year: 2026,
        price: 2.99,
      },
      deviceId: 'device-123',
      deviceType: 'mobile',
    })
    expect(trackEvent).toHaveBeenCalledWith('animated_video_waitlist_join', {
      exportType: 'calendar',
      videoKind: 'year',
      year: 2026,
      price: 2.99,
    })
  })

  it('shows why a sign-up failed', async () => {
    const user = userEvent.setup()
    fetchMock.mockReturnValue(
      jsonResponse({ error: 'Please enter a valid email address' }, 400)
    )
    renderDialog()

    await user.click(screen.getByRole('button', { name: /Get the videos/ }))
    await user.type(
      screen.getByLabelText(/Video downloads aren't live yet/),
      'me@example.com'
    )
    await user.click(screen.getByRole('button', { name: 'Notify me' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Please enter a valid email address'
    )
    expect(trackEvent).not.toHaveBeenCalledWith(
      'animated_video_waitlist_join',
      expect.anything()
    )
  })
})
