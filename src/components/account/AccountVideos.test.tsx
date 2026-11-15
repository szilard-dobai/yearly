import { SettingsProvider } from '@/lib/contexts/SettingsContext'
import { trackEvent } from '@/lib/tracking'
import type { OrderSummary } from '@/lib/videos/client'
import {
  jsonResponse,
  orderSummary,
  videoFile,
  YEAR_PACK_VIDEOS,
} from '@/test/video-orders'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type AccountCalendarStatus,
  AccountCalendarStatusProvider,
  useReportAccountCalendarStatus,
} from './AccountCalendarStatus'
import AccountVideos from './AccountVideos'

vi.mock('@/lib/tracking', () => ({ trackEvent: vi.fn() }))

const { readStoredDays } = vi.hoisted(() => ({ readStoredDays: vi.fn() }))
vi.mock('@/lib/calendar-sync/local', () => ({ readStoredDays }))

const fetchMock = vi.fn()

const MONTH_ORDER = orderSummary({
  id: 'month-1',
  pack: 'month',
  month: 2,
  videos: [videoFile('month', 'dark'), videoFile('month', 'light')],
})

function CalendarStatus({ status }: { status: AccountCalendarStatus }) {
  const report = useReportAccountCalendarStatus()
  useEffect(() => report?.(status), [report, status])
  return null
}

function renderVideos(calendar: AccountCalendarStatus = 'saved') {
  return render(
    <SettingsProvider>
      <AccountCalendarStatusProvider>
        <AccountVideos />
        <CalendarStatus status={calendar} />
      </AccountCalendarStatusProvider>
    </SettingsProvider>
  )
}

function serve({
  freeVideo = false,
  orders = [],
  update,
  order,
}: {
  freeVideo?: boolean
  orders?: OrderSummary[]
  update?: () => Response
  order?: () => Response
}) {
  fetchMock.mockImplementation((url: string) => {
    if (url === '/api/videos/orders') {
      return Promise.resolve(jsonResponse({ freeVideo, orders }))
    }
    if (url.endsWith('/updates')) {
      return Promise.resolve(update?.() ?? jsonResponse({}, 500))
    }
    return Promise.resolve(order?.() ?? jsonResponse({}, 404))
  })
}

async function cardFor(name: string) {
  const heading = await screen.findByRole('heading', { name })
  return heading.closest('article') as HTMLElement
}

describe('AccountVideos', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    vi.mocked(trackEvent).mockClear()
    readStoredDays.mockReturnValue({
      '2026-03-20': ['JP'],
      '2026-03-21': ['JP'],
      '2026-07-01': ['FR'],
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('points to the calendar when there are no videos yet', async () => {
    serve({})
    renderVideos()

    expect(await screen.findByText(/No videos yet/)).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'Open your calendar' })
    ).toHaveAttribute('href', '/create')
  })

  it('mentions a free video waiting to be claimed', async () => {
    serve({ freeVideo: true })
    renderVideos()

    expect(await screen.findByText(/Your first video is free/)).toBeVisible()
    expect(screen.queryByText(/No videos yet/)).not.toBeInTheDocument()
  })

  it('shows one card per pack, loading only metadata until played', async () => {
    serve({ orders: [MONTH_ORDER, orderSummary({ videos: YEAR_PACK_VIDEOS })] })
    renderVideos()

    const month = await cardFor('March 2026')
    const year = await cardFor('2026')
    expect(within(month).getByText('Month pack')).toBeVisible()
    expect(
      within(year).getByText('Year pack: your year and your stats')
    ).toBeVisible()
    expect(
      within(month).queryByRole('radio', { name: 'Your stats' })
    ).not.toBeInTheDocument()

    const videos = document.querySelectorAll('video')
    expect(videos).toHaveLength(2)
    videos.forEach((video) => {
      expect(video).toHaveAttribute('preload', 'metadata')
      expect(video).not.toHaveAttribute('autoplay')
    })

    await userEvent.click(
      within(year).getByRole('radio', { name: 'Your stats' })
    )
    await userEvent.click(within(year).getByRole('radio', { name: 'Dark' }))
    expect(
      within(year).getByLabelText('Your stats video, dark')
    ).toHaveAttribute('src', 'https://videos.test/stats-dark.mp4?token=t')
    expect(
      within(year).getByRole('button', { name: 'Save video' })
    ).toBeVisible()
  })

  it("updates a pack from this device's saved calendar after a confirmation", async () => {
    const updating = orderSummary({
      ...MONTH_ORDER,
      render: { version: 1, status: 'queued' },
      updatesLeft: 2,
    })
    serve({
      orders: [MONTH_ORDER],
      update: () => jsonResponse(updating, 202),
      order: () => jsonResponse(updating),
    })
    renderVideos()
    const card = await cardFor('March 2026')

    await userEvent.click(
      within(card).getByRole('button', {
        name: 'Update with my latest trips (3 left)',
      })
    )
    expect(
      within(card).getByText(/This uses 1 of the 3 updates you have left/)
    ).toBeVisible()
    await userEvent.click(
      within(card).getByRole('button', { name: 'Update video' })
    )

    expect(
      await within(card).findByText(
        'Updating your video with your latest trips. Usually under a minute.'
      )
    ).toBeVisible()
    const [url, init] = fetchMock.mock.calls.find(([path]) =>
      String(path).endsWith('/updates')
    )!
    expect(url).toBe('/api/videos/orders/month-1/updates')
    expect(JSON.parse(init.body)).toEqual({
      days: { '2026-03-20': ['JP'], '2026-03-21': ['JP'] },
      weekStartsOn: 1,
    })
    expect(
      within(card).getByRole('button', {
        name: 'Update with my latest trips (2 left)',
      })
    ).toBeDisabled()
    expect(within(card).getByLabelText('Your month video, light')).toBeVisible()
    expect(trackEvent).toHaveBeenCalledWith('animated_video_update_requested', {
      pack: 'month',
      result: 'started',
    })
  })

  it.each([
    ['busy', 409, 'Your videos are already being updated.'],
    ['no-updates-left', 409, "You've used all 3 updates for this pack."],
    [
      'too-different',
      422,
      'These trips are too different from your first video.',
    ],
    ['not-paid', 409, "We couldn't update your videos. Try again in a moment."],
  ])('explains a %s refusal', async (reason, status, message) => {
    serve({
      orders: [MONTH_ORDER],
      update: () => jsonResponse({ error: reason }, status),
    })
    renderVideos()
    const card = await cardFor('March 2026')

    await userEvent.click(
      within(card).getByRole('button', { name: /Update with my latest trips/ })
    )
    await userEvent.click(
      within(card).getByRole('button', { name: 'Update video' })
    )

    expect(await within(card).findByRole('alert')).toHaveTextContent(message)
    expect(trackEvent).toHaveBeenCalledWith('animated_video_update_requested', {
      pack: 'month',
      result: reason,
    })
  })

  it('waits for the saved calendar before offering an update', async () => {
    serve({ orders: [MONTH_ORDER] })
    renderVideos('loading')
    const card = await cardFor('March 2026')

    expect(
      within(card).getByRole('button', { name: /Update with my latest trips/ })
    ).toBeDisabled()
    expect(within(card).getByText('Checking your saved trips…')).toBeVisible()
  })

  it('says when a pack has no updates left', async () => {
    serve({ orders: [orderSummary({ ...MONTH_ORDER, updatesLeft: 0 })] })
    renderVideos()
    const card = await cardFor('March 2026')

    expect(
      within(card).queryByRole('button', {
        name: /Update with my latest trips/,
      })
    ).not.toBeInTheDocument()
    expect(
      within(card).getByText(/You've used all 3 updates for this pack/)
    ).toBeVisible()
  })

  it('shows a pack that is still being made', async () => {
    const making = orderSummary({
      id: 'year-1',
      render: { version: 0, status: 'rendering' },
    })
    serve({ orders: [making], order: () => jsonResponse(making) })
    renderVideos()
    const card = await cardFor('2026')

    expect(
      within(card).getByText('Making your videos. Usually under a minute.')
    ).toBeVisible()
    expect(
      within(card).queryByRole('button', { name: 'Save video' })
    ).toBeNull()
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/videos/orders/year-1', {
        cache: 'no-store',
      })
    )
  })

  it('says when the videos could not be loaded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock.mockResolvedValue(jsonResponse({}, 500))
    renderVideos()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "We couldn't load your videos. Try again in a moment."
    )
  })
})
