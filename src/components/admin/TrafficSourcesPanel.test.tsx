import { buildTrafficSourceStats } from '@/lib/attribution/stats'
import {
  renderWithSettings as render,
  screen,
  waitFor,
  within,
} from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TrafficSourcesPanel from './TrafficSourcesPanel'

const fetchMock = vi.fn()

function respond(body: unknown, status = 200) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }))
}

const stats = buildTrafficSourceStats({
  trackedDevices: [{ devices: 40 }],
  attributedDevices: [{ devices: 30 }],
  referrers: [{ label: 'l.instagram.com', devices: 12 }],
  inAppBrowsers: [
    { label: 'Instagram', devices: 20 },
    { label: 'Threads', devices: 5 },
  ],
  utmSource: [{ label: 'ig', devices: 4 }],
  surveyFunnel: [
    { type: 'acquisition_survey_shown', devices: 10 },
    { type: 'acquisition_survey_answered', devices: 6 },
    { type: 'acquisition_survey_dismissed', devices: 2 },
  ],
  surveyAnswers: [
    { label: 'saw_image', devices: 4 },
    { label: 'friend_link', devices: 1 },
    { label: 'other', devices: 1 },
  ],
  surveyNotes: [
    { text: 'Lemon8 post', timestamp: '2026-10-28T03:06:00Z', country: 'SG' },
  ],
})

function rows(name: string) {
  return within(screen.getByRole('table', { name }))
    .getAllByRole('row')
    .slice(1)
    .map((row) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent)
    )
}

function lastUrl() {
  return new URL(fetchMock.mock.lastCall?.[0], 'http://localhost')
}

describe('TrafficSourcesPanel', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('shows each source by unique devices', async () => {
    respond(stats)
    render(<TrafficSourcesPanel refreshKey={0} />)

    expect(await screen.findByText('40')).toBeInTheDocument()
    expect(
      screen.getByText('75% had a referrer, UTM tags or an in-app browser')
    ).toBeInTheDocument()
    expect(screen.getByText('Of 10 shown, 2 dismissed')).toBeInTheDocument()
    expect(rows('Referrers')).toEqual([['l.instagram.com', '12']])
    expect(rows('In-app browsers')).toEqual([
      ['Instagram', '20'],
      ['Threads', '5'],
    ])
    expect(rows('How they heard about Yearly')).toEqual([
      ["Saw someone's Yearly image", '4'],
      ['A friend sent me the link', '1'],
      ['Other', '1'],
    ])
    expect(rows('UTM source')).toEqual([['ig', '4']])
    expect(screen.getByText('Lemon8 post')).toBeInTheDocument()
    expect(screen.getAllByText('None yet')).toHaveLength(2)
  })

  it('narrows to the country, region and days chosen', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 15, 12))
    const user = userEvent.setup()
    respond(stats)
    render(<TrafficSourcesPanel refreshKey={0} country="SG" region="all" />)
    const panel = screen.getByRole('region', { name: 'Traffic sources' })
    await screen.findByText('40')

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

    await user.click(screen.getByRole('button', { name: 'Clear date range' }))

    await waitFor(() => expect(panel).toHaveAttribute('aria-busy', 'false'))
    expect(lastUrl().searchParams.has('from')).toBe(false)
    expect(lastUrl().searchParams.has('to')).toBe(false)
    expect(
      screen.getByRole('button', { name: 'Date range: All time' })
    ).toBeInTheDocument()
  })

  it('shows an error when the stats fail to load', async () => {
    respond({ error: 'Unauthorized' }, 401)
    render(<TrafficSourcesPanel refreshKey={0} />)

    expect(
      await screen.findByText("Couldn't load the traffic sources.")
    ).toBeInTheDocument()
  })

  it('reloads when the dashboard is refreshed', async () => {
    respond(stats)
    const { rerender } = render(<TrafficSourcesPanel refreshKey={0} />)
    const panel = screen.getByRole('region', { name: 'Traffic sources' })
    await screen.findByText('40')
    expect(panel).toHaveAttribute('aria-busy', 'false')

    let finish: (response: Response) => void = () => {}
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        finish = resolve
      })
    )
    rerender(<TrafficSourcesPanel refreshKey={1} />)

    expect(panel).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('table', { name: 'Referrers' })).toBeInTheDocument()

    finish(new Response(JSON.stringify({ ...stats, trackedDevices: 41 })))

    expect(await screen.findByText('41')).toBeInTheDocument()
    expect(panel).toHaveAttribute('aria-busy', 'false')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
