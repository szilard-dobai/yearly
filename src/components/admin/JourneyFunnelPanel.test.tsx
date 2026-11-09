import { buildFunnelStats } from '@/lib/tracking/funnel'
import {
  renderWithSettings as render,
  screen,
  waitFor,
  within,
} from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import JourneyFunnelPanel from './JourneyFunnelPanel'

const fetchMock = vi.fn()

function respond(body: unknown, status = 200) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }))
}

const funnel = (_id: string, ...devices: number[]) => ({
  _id,
  arrived: devices[0],
  opened: devices[1],
  added: devices[2],
  exported: devices[3],
  downloaded: devices[4],
})

const stats = buildFunnelStats([
  funnel('mobile', 700, 400, 80, 60, 30),
  funnel('desktop', 300, 200, 70, 60, 30),
])

function steps() {
  return within(screen.getByRole('list', { name: 'Journey funnel' }))
    .getAllByRole('listitem')
    .map((item) => item.textContent)
}

const SUMMARY = /devices that arrived downloaded an image/

function lastUrl() {
  return new URL(fetchMock.mock.lastCall?.[0], 'http://localhost')
}

describe('JourneyFunnelPanel', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('shows how many devices reach each step and where they drop off', async () => {
    respond(stats)
    render(<JourneyFunnelPanel refreshKey={0} />)

    expect(
      await screen.findByText(
        '60 of 1,000 devices that arrived downloaded an image'
      )
    ).toBeInTheDocument()
    expect(screen.getAllByText('6%')).toHaveLength(2)
    expect(steps()).toEqual([
      'ArrivedViewed any page1,000100%',
      '60% continued · 400 dropped offOpened the appLoaded the create page60060%',
      '25% continued · 450 dropped offBiggest dropAdded a tripSaved at least one country visit15015%',
      '80% continued · 30 dropped offMade an imageGenerated a calendar, monthly or statistics image12012%',
      '50% continued · 60 dropped offDownloadedDownloaded or shared the image606%',
    ])
    expect(screen.getAllByText('Biggest drop')).toHaveLength(1)
  })

  it('switches between device types without reloading', async () => {
    const user = userEvent.setup()
    respond(stats)
    render(<JourneyFunnelPanel refreshKey={0} />)
    await screen.findByText(SUMMARY)
    const devices = screen.getByRole('group', { name: 'Device type' })

    expect(
      within(devices).getByRole('button', { name: 'All' })
    ).toHaveAttribute('aria-pressed', 'true')

    await user.click(within(devices).getByRole('button', { name: 'Mobile' }))

    expect(
      within(devices).getByRole('button', { name: 'Mobile' })
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      within(devices).getByRole('button', { name: 'All' })
    ).toHaveAttribute('aria-pressed', 'false')
    expect(
      screen.getByText(
        '30 of 700 mobile devices that arrived downloaded an image'
      )
    ).toBeInTheDocument()
    expect(steps()).toEqual([
      'ArrivedViewed any page700100%',
      '57% continued · 300 dropped offOpened the appLoaded the create page40057%',
      '20% continued · 320 dropped offBiggest dropAdded a tripSaved at least one country visit8011%',
      '75% continued · 20 dropped offMade an imageGenerated a calendar, monthly or statistics image609%',
      '50% continued · 30 dropped offDownloadedDownloaded or shared the image304%',
    ])

    await user.click(within(devices).getByRole('button', { name: 'Desktop' }))

    expect(
      screen.getByText(
        '30 of 300 desktop devices that arrived downloaded an image'
      )
    ).toBeInTheDocument()

    await user.click(within(devices).getByRole('button', { name: 'Tablet' }))

    expect(
      screen.getByText('No visits from tablet devices in this range yet.')
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('says when nobody has arrived yet', async () => {
    respond(buildFunnelStats())
    render(<JourneyFunnelPanel refreshKey={0} />)

    expect(
      await screen.findByText('No visits in this range yet.')
    ).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('narrows to the country, region and days chosen', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 15, 12))
    const user = userEvent.setup()
    respond(stats)
    render(<JourneyFunnelPanel refreshKey={0} country="SG" region="all" />)
    const panel = screen.getByRole('region', { name: 'Journey funnel' })
    await screen.findByText(SUMMARY)

    expect(lastUrl().pathname).toBe('/api/tracking/stats/funnel')
    expect(lastUrl().searchParams.get('country')).toBe('SG')
    expect(lastUrl().searchParams.has('region')).toBe(false)
    expect(lastUrl().searchParams.has('from')).toBe(false)

    await user.click(
      screen.getByRole('button', { name: 'Date range: All time' })
    )
    await user.click(screen.getByRole('button', { name: /November 2nd, 2026/ }))
    await user.click(screen.getByRole('button', { name: /November 5th, 2026/ }))

    await waitFor(() => expect(panel).toHaveAttribute('aria-busy', 'false'))
    expect(lastUrl().searchParams.get('from')).toBe(
      new Date(2026, 10, 2).toISOString()
    )
    expect(lastUrl().searchParams.get('to')).toBe(
      new Date(2026, 10, 6).toISOString()
    )
    expect(lastUrl().searchParams.get('country')).toBe('SG')
  })

  it('shows an error when the funnel fails to load', async () => {
    respond({ error: 'Unauthorized' }, 401)
    render(<JourneyFunnelPanel refreshKey={0} />)

    expect(
      await screen.findByText("Couldn't load the journey funnel.")
    ).toBeInTheDocument()
  })

  it('keeps the last funnel visible while the dashboard refreshes', async () => {
    respond(stats)
    const { rerender } = render(<JourneyFunnelPanel refreshKey={0} />)
    const panel = screen.getByRole('region', { name: 'Journey funnel' })
    await screen.findByText(SUMMARY)

    let finish: (response: Response) => void = () => {}
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        finish = resolve
      })
    )
    rerender(<JourneyFunnelPanel refreshKey={1} />)

    expect(panel).toHaveAttribute('aria-busy', 'true')
    expect(
      screen.getByRole('list', { name: 'Journey funnel' })
    ).toBeInTheDocument()

    finish(
      new Response(
        JSON.stringify(
          buildFunnelStats([
            funnel('mobile', 700, 400, 80, 60, 60),
            funnel('desktop', 300, 200, 70, 60, 30),
          ])
        )
      )
    )

    expect(
      await screen.findByText(
        '90 of 1,000 devices that arrived downloaded an image'
      )
    ).toBeInTheDocument()
    expect(panel).toHaveAttribute('aria-busy', 'false')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
