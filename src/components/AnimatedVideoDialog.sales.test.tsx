import { VideoSalesProvider } from '@/components/video/VideoSalesProvider'
import {
  type CalendarAccount,
  CalendarAccountContext,
} from '@/lib/calendar-sync/CalendarAccountContext'
import { SettingsProvider } from '@/lib/contexts/SettingsContext'
import type { ExportType } from '@/lib/feedback/types'
import { trackEvent } from '@/lib/tracking'
import type { CalendarData } from '@/lib/types'
import { goToCheckout, type OrderSummary } from '@/lib/videos/client'
import {
  jsonResponse,
  orderSummary,
  YEAR_PACK_VIDEOS,
} from '@/test/video-orders'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AnimatedVideoDialog from './AnimatedVideoDialog'

vi.mock('@remotion/player', () => ({
  Player: () => <div data-testid="player" />,
}))

vi.mock('@/lib/tracking', () => ({
  trackEvent: vi.fn(),
  getDeviceType: () => 'mobile',
}))

vi.mock('@/lib/videos/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/videos/client')>()),
  goToCheckout: vi.fn(),
}))

const { sendVerificationOtp, signInEmailOtp } = vi.hoisted(() => ({
  sendVerificationOtp: vi.fn(),
  signInEmailOtp: vi.fn(),
}))

vi.mock('@/lib/auth/client', () => ({
  authClient: {
    emailOtp: { sendVerificationOtp },
    signIn: { emailOtp: signInEmailOtp, social: vi.fn() },
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}))

const fetchMock = vi.fn()

const calendarData: CalendarData = {
  visits: [
    { id: '1', countryCode: 'JP', date: new Date(2026, 2, 20) },
    { id: '2', countryCode: 'JP', date: new Date(2026, 2, 21) },
    { id: '3', countryCode: 'FR', date: new Date(2026, 6, 1) },
    { id: '4', countryCode: 'PT', date: new Date(2025, 0, 2) },
  ],
}

const SIGNED_IN: CalendarAccount = {
  account: { id: 'user-1', email: 'ana@example.com' },
  sessionChecked: true,
  status: 'saved',
  ready: true,
  checkSession: vi.fn(),
}

const SIGNED_OUT: CalendarAccount = {
  account: null,
  sessionChecked: true,
  status: 'saving',
  ready: false,
  checkSession: vi.fn(),
}

interface Server {
  freeVideo?: boolean
  orders?: OrderSummary[]
  create?: () => Response
  order?: () => Response
  update?: () => Response
}

function routeFetch(server: Server) {
  fetchMock.mockImplementation((url: string, init?: RequestInit) => {
    if (url === '/api/videos/orders' && init?.method === 'POST') {
      return Promise.resolve(
        server.create?.() ?? new Response('{}', { status: 500 })
      )
    }
    if (url === '/api/videos/orders') {
      return Promise.resolve(
        jsonResponse({
          freeVideo: server.freeVideo ?? false,
          orders: server.orders ?? [],
        })
      )
    }
    if (url.endsWith('/updates')) {
      return Promise.resolve(
        server.update?.() ?? new Response('{}', { status: 500 })
      )
    }
    if (url.startsWith('/api/videos/orders/')) {
      return Promise.resolve(
        server.order?.() ?? new Response('{}', { status: 404 })
      )
    }
    return Promise.resolve(jsonResponse({}))
  })
}

function salesDialog(
  account: CalendarAccount,
  {
    exportType = 'calendar',
    month,
    initialOrderId,
  }: { exportType?: ExportType; month?: number; initialOrderId?: string } = {}
) {
  return (
    <SettingsProvider>
      <VideoSalesProvider value={{ enabled: true, googleSignIn: false }}>
        <CalendarAccountContext value={account}>
          <AnimatedVideoDialog
            open
            onOpenChange={vi.fn()}
            calendarData={calendarData}
            year={2026}
            month={month}
            exportType={exportType}
            price={2.99}
            initialOrderId={initialOrderId}
          />
        </CalendarAccountContext>
      </VideoSalesProvider>
    </SettingsProvider>
  )
}

async function enabledButton(name: RegExp | string) {
  const button = await screen.findByRole('button', { name })
  await waitFor(() => expect(button).toBeEnabled())
  return button
}

describe('AnimatedVideoDialog with video sales on', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.mocked(trackEvent).mockClear()
    vi.mocked(goToCheckout).mockClear()
    vi.stubGlobal('fetch', fetchMock)
    document.documentElement.classList.add('dark')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.documentElement.classList.remove('dark')
  })

  it('shows the year pack and its real price', () => {
    render(salesDialog(SIGNED_OUT))

    expect(
      screen.getByRole('button', { name: 'Get my videos · $2.99' })
    ).toBeEnabled()
    expect(
      screen.getByText('Year pack: both videos, in dark and light')
    ).toBeVisible()
    expect(
      screen.getByText(
        "You'll sign in with your email next. Your images stay free."
      )
    ).toBeVisible()
    expect(screen.queryByText(/Launching in/)).not.toBeInTheDocument()
  })

  it('sells the month pack from a month preview', () => {
    render(salesDialog(SIGNED_OUT, { exportType: 'monthly', month: 2 }))

    expect(
      screen.getByRole('button', { name: 'Get my video · $2.99' })
    ).toBeVisible()
    expect(
      screen.getByText('Month pack: dark and light versions')
    ).toBeVisible()
  })

  it('signs people in inside the dialog, then waits for their calendar', async () => {
    const user = userEvent.setup()
    const checkSession = vi.fn()
    sendVerificationOtp.mockResolvedValue({ data: {}, error: null })
    signInEmailOtp.mockResolvedValue({ data: {}, error: null })
    routeFetch({})
    const { rerender } = render(salesDialog({ ...SIGNED_OUT, checkSession }))

    await user.click(
      screen.getByRole('button', { name: 'Get my videos · $2.99' })
    )

    expect(
      screen.getByRole('heading', { name: 'Sign in to get your videos' })
    ).toBeVisible()
    expect(trackEvent).toHaveBeenCalledWith(
      'animated_video_buy_click',
      expect.objectContaining({ videoKind: 'year', signedIn: false })
    )
    expect(trackEvent).toHaveBeenCalledWith('animated_video_sign_in_shown', {
      pack: 'year',
      year: 2026,
    })

    await user.type(screen.getByLabelText('Email'), 'ana@example.com')
    await user.click(screen.getByRole('button', { name: 'Email me a code' }))
    await user.type(await screen.findByLabelText('Code'), '123456')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(checkSession).toHaveBeenCalled()
    expect(
      await screen.findByRole('button', { name: 'Saving your calendar…' })
    ).toBeDisabled()

    rerender(salesDialog({ ...SIGNED_IN, ready: false, status: 'saving' }))
    expect(
      screen.getByRole('button', { name: 'Saving your calendar…' })
    ).toBeDisabled()
    expect(fetchMock).not.toHaveBeenCalled()

    rerender(salesDialog(SIGNED_IN))
    await enabledButton('Get my videos · $2.99')
    expect(
      screen.getByText(
        "You'll pay on Polar's secure checkout. Signed in as ana@example.com."
      )
    ).toBeVisible()
  })

  it("opens checkout with the period's trips and the site's theme", async () => {
    const user = userEvent.setup()
    routeFetch({
      create: () =>
        jsonResponse(
          {
            orderId: 'order-1',
            free: false,
            checkoutUrl: 'https://sandbox.polar.sh/checkout/c1',
          },
          201
        ),
    })
    render(salesDialog(SIGNED_IN, { exportType: 'monthly', month: 2 }))

    await user.click(await enabledButton('Get my video · $2.99'))

    await waitFor(() =>
      expect(goToCheckout).toHaveBeenCalledWith(
        'https://sandbox.polar.sh/checkout/c1?theme=light'
      )
    )
    const post = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'POST'
    )
    expect(JSON.parse(post?.[1].body)).toEqual({
      pack: 'month',
      year: 2026,
      month: 2,
      days: { '2026-03-20': ['JP'], '2026-03-21': ['JP'] },
      weekStartsOn: 1,
    })
    expect(
      screen.getByRole('button', { name: 'Opening checkout…' })
    ).toBeDisabled()
    expect(trackEvent).toHaveBeenCalledWith('animated_video_checkout_opened', {
      pack: 'month',
      year: 2026,
      month: 2,
      price: 2.99,
    })
  })

  it('explains when checkout is down', async () => {
    const user = userEvent.setup()
    routeFetch({
      create: () =>
        jsonResponse({ error: "Checkout isn't available right now" }, 502),
    })
    render(salesDialog(SIGNED_IN))

    await user.click(await enabledButton('Get my videos · $2.99'))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Checkout isn't available right now. Try again in a few minutes."
    )
    expect(goToCheckout).not.toHaveBeenCalled()
    expect(trackEvent).toHaveBeenCalledWith('animated_video_failed', {
      pack: 'year',
      year: 2026,
      stage: 'order',
      reason: 'checkout-unavailable',
    })
  })

  it('gives waitlist members their first video free, then plays it', async () => {
    const user = userEvent.setup()
    routeFetch({
      freeVideo: true,
      create: () => jsonResponse({ orderId: 'order-1', free: true }, 201),
      order: () => jsonResponse(orderSummary({ videos: YEAR_PACK_VIDEOS })),
    })
    render(salesDialog(SIGNED_IN))

    expect(await screen.findByText('Your first video is free')).toBeVisible()
    await user.click(await enabledButton('Get my videos free'))

    expect(
      await screen.findByRole('heading', { name: 'Your videos are ready' })
    ).toBeVisible()
    expect(goToCheckout).not.toHaveBeenCalled()
    expect(trackEvent).toHaveBeenCalledWith('animated_video_free_claimed', {
      pack: 'year',
      year: 2026,
    })
    expect(trackEvent).toHaveBeenCalledWith('animated_video_ready', {
      pack: 'year',
    })
    expect(screen.queryByTestId('player')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Your year video, dark')).toHaveAttribute(
      'src',
      'https://videos.test/year-dark.mp4?token=t'
    )

    await user.click(screen.getByRole('radio', { name: 'Your stats' }))
    await user.click(screen.getByRole('radio', { name: 'Light' }))
    expect(screen.getByLabelText('Your stats video, light')).toHaveAttribute(
      'src',
      'https://videos.test/stats-light.mp4?token=t'
    )
    expect(screen.getByRole('button', { name: 'Save video' })).toBeVisible()
  })

  describe('with a pack for the previewed period', () => {
    const owned = orderSummary({ videos: YEAR_PACK_VIDEOS })

    it('shows the pack instead of the offer, with posters', async () => {
      routeFetch({ orders: [owned] })
      render(salesDialog(SIGNED_IN))

      expect(
        await screen.findByRole('heading', { name: 'Your 2026 videos' })
      ).toBeVisible()
      expect(
        screen.getByText(
          'You have the year pack for 2026. Pick a video and dark or light, then save it.'
        )
      ).toBeVisible()
      expect(
        screen.queryByRole('button', { name: /Get my videos/ })
      ).not.toBeInTheDocument()
      expect(screen.queryByTestId('player')).not.toBeInTheDocument()
      const video = screen.getByLabelText('Your year video, dark')
      expect(video).toHaveAttribute(
        'src',
        'https://videos.test/year-dark.mp4?token=t'
      )
      expect(video).toHaveAttribute(
        'poster',
        'https://videos.test/year-dark.jpg?token=t'
      )
      expect(screen.getByRole('button', { name: 'Save video' })).toBeVisible()
      expect(
        screen.getByRole('button', {
          name: 'Update with my latest trips (3 left)',
        })
      ).toBeEnabled()
    })

    it('plays without a poster for older renders', async () => {
      routeFetch({
        orders: [
          orderSummary({
            videos: YEAR_PACK_VIDEOS.map((video) => ({
              ...video,
              posterUrl: null,
            })),
          }),
        ],
      })
      render(salesDialog(SIGNED_IN))

      const video = await screen.findByLabelText('Your year video, dark')
      expect(video).not.toHaveAttribute('poster')
    })

    it('updates the pack with the calendar for that period', async () => {
      const user = userEvent.setup()
      const updating = orderSummary({
        videos: YEAR_PACK_VIDEOS,
        render: { version: 1, status: 'rendering' },
        updatesLeft: 2,
      })
      routeFetch({
        orders: [owned],
        update: () => jsonResponse(updating, 202),
        order: () => jsonResponse(updating),
      })
      render(salesDialog(SIGNED_IN))

      await user.click(
        await screen.findByRole('button', {
          name: 'Update with my latest trips (3 left)',
        })
      )
      expect(
        screen.getByText(/This uses 1 of the 3 updates you have left/)
      ).toBeVisible()
      await user.click(screen.getByRole('button', { name: 'Update videos' }))

      expect(
        await screen.findByText(
          'Updating your videos with your latest trips. Usually under a minute.'
        )
      ).toBeVisible()
      const [url, init] = fetchMock.mock.calls.find(([path]) =>
        String(path).endsWith('/updates')
      )!
      expect(url).toBe('/api/videos/orders/order-1/updates')
      expect(JSON.parse(init.body)).toEqual({
        days: {
          '2026-03-20': ['JP'],
          '2026-03-21': ['JP'],
          '2026-07-01': ['FR'],
        },
        weekStartsOn: 1,
      })
      expect(
        screen.getByRole('button', {
          name: 'Update with my latest trips (2 left)',
        })
      ).toBeDisabled()
      expect(screen.getByLabelText('Your year video, dark')).toBeVisible()
      expect(trackEvent).toHaveBeenCalledWith(
        'animated_video_update_requested',
        { pack: 'year', result: 'started', source: 'dialog' }
      )
    })

    it.each([
      [
        'unchanged',
        409,
        'Your videos already include all your trips. Add a trip to your calendar, then update them.',
      ],
      ['busy', 409, 'Your videos are already being updated.'],
      [
        'too-different',
        422,
        'These trips are too different from your first videos.',
      ],
    ])('explains a %s refusal', async (reason, status, message) => {
      const user = userEvent.setup()
      routeFetch({
        orders: [owned],
        update: () => jsonResponse({ error: reason }, status),
      })
      render(salesDialog(SIGNED_IN))

      await user.click(
        await screen.findByRole('button', {
          name: 'Update with my latest trips (3 left)',
        })
      )
      await user.click(screen.getByRole('button', { name: 'Update videos' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(message)
      expect(
        screen.queryByRole('button', { name: 'Get a new pack' }) !== null
      ).toBe(reason === 'too-different')
    })

    it('offers a new pack once the updates are used up', async () => {
      const user = userEvent.setup()
      routeFetch({ orders: [orderSummary({ ...owned, updatesLeft: 0 })] })
      render(salesDialog(SIGNED_IN))

      expect(
        await screen.findByText(
          "You've used all 3 updates for this pack. To add more trips, get a new pack."
        )
      ).toBeVisible()
      await user.click(screen.getByRole('button', { name: 'Get a new pack' }))

      expect(
        await screen.findByRole('button', { name: 'Get my videos · $2.99' })
      ).toBeEnabled()
      expect(screen.getByText(/You already have videos for 2026/)).toBeVisible()

      await user.click(
        screen.getByRole('button', { name: 'Back to your videos' })
      )
      expect(
        screen.getByRole('heading', { name: 'Your 2026 videos' })
      ).toBeVisible()
    })

    it('shows the offer to signed-out visitors, then the pack once signed in', async () => {
      routeFetch({ orders: [owned] })
      const { rerender } = render(salesDialog(SIGNED_OUT))

      expect(
        screen.getByRole('button', { name: 'Get my videos · $2.99' })
      ).toBeVisible()

      rerender(salesDialog(SIGNED_IN))

      expect(
        await screen.findByRole('heading', { name: 'Your 2026 videos' })
      ).toBeVisible()
    })

    it("matches a month preview to that month's pack only", async () => {
      routeFetch({
        orders: [
          owned,
          orderSummary({
            id: 'month-1',
            pack: 'month',
            month: 6,
            videos: YEAR_PACK_VIDEOS,
          }),
        ],
      })
      render(salesDialog(SIGNED_IN, { exportType: 'monthly', month: 2 }))

      expect(await enabledButton('Get my video · $2.99')).toBeVisible()
      expect(
        screen.queryByText(/You already have videos/)
      ).not.toBeInTheDocument()
    })

    it("shows a month's pack for that month", async () => {
      routeFetch({
        orders: [
          orderSummary({
            id: 'month-1',
            pack: 'month',
            month: 2,
            videos: [
              { ...YEAR_PACK_VIDEOS[0], kind: 'month' },
              { ...YEAR_PACK_VIDEOS[1], kind: 'month' },
            ],
          }),
        ],
      })
      render(salesDialog(SIGNED_IN, { exportType: 'monthly', month: 2 }))

      expect(
        await screen.findByRole('heading', { name: 'Your March video' })
      ).toBeVisible()
      expect(
        screen.getByText(
          'You have the month pack for March 2026. Pick dark or light, then save it.'
        )
      ).toBeVisible()
    })
  })

  it.each([
    [
      orderSummary({
        status: 'draft',
        render: { version: 0, status: 'queued' },
      }),
      'Confirming your payment',
      'This usually takes a few seconds.',
    ],
    [
      orderSummary({ render: { version: 0, status: 'rendering' } }),
      'Making your videos',
      "Usually under a minute. We'll email you when they're ready, so you can close this.",
    ],
    [
      orderSummary({ render: { version: 0, status: 'failed' } }),
      "We're on it",
      "Something went wrong making your videos. We'll fix it and email you when they're ready.",
    ],
  ])(
    'shows where the order is after checkout (%#)',
    async (order, title, description) => {
      routeFetch({ order: () => jsonResponse(order) })
      render(salesDialog(SIGNED_IN, { initialOrderId: 'order-1' }))

      expect(await screen.findByRole('heading', { name: title })).toBeVisible()
      expect(screen.getByText(description)).toBeVisible()
      expect(screen.getByTestId('player')).toBeInTheDocument()
      expect(fetchMock).toHaveBeenCalledWith('/api/videos/orders/order-1', {
        cache: 'no-store',
      })
    }
  )

  it('asks signed-out visitors to sign in to see the order', async () => {
    routeFetch({ order: () => jsonResponse({}, 401) })
    render(salesDialog(SIGNED_OUT, { initialOrderId: 'order-1' }))

    expect(
      await screen.findByRole('heading', {
        name: 'Sign in to see your videos',
      })
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/sign-in?next=/account'
    )
  })
})
