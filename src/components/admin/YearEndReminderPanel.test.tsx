import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import YearEndReminderPanel from './YearEndReminderPanel'

const fetchMock = vi.fn()

function respond(body: unknown, status = 200) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }))
}

const stats = {
  year: 2026,
  total: 12,
  lastSevenDays: 3,
  emails: ['a@example.com', 'b@example.com'],
  opens: 40,
  calendarAdds: { ics: 9, google: 4 },
}

function metric(label: string) {
  return screen.getByText(label).parentElement
}

describe('YearEndReminderPanel', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows sign-ups, calendar adds and card opens', async () => {
    respond(stats)
    render(<YearEndReminderPanel refreshKey={0} />)

    expect(await screen.findByText('3 in the last 7 days')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/reminders/stats')
    expect(metric('Email sign-ups')).toHaveTextContent('12')
    expect(metric('Apple / Outlook')).toHaveTextContent('9')
    expect(metric('Google Calendar')).toHaveTextContent('4')
    expect(metric('Card opens')).toHaveTextContent('40')
    expect(screen.getByText(/For 28 Dec 2026/)).toBeInTheDocument()
  })

  it('copies the emails one per line', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    respond(stats)
    render(<YearEndReminderPanel refreshKey={0} />)

    await user.click(await screen.findByRole('button', { name: 'Copy emails' }))

    expect(writeText).toHaveBeenCalledWith('a@example.com\nb@example.com')
  })

  it('hides the copy button when nobody has signed up', async () => {
    respond({ ...stats, total: 0, lastSevenDays: 0, emails: [] })
    render(<YearEndReminderPanel refreshKey={0} />)

    await screen.findByText('0 in the last 7 days')
    expect(
      screen.queryByRole('button', { name: 'Copy emails' })
    ).not.toBeInTheDocument()
  })

  it('shows an error when the stats fail to load', async () => {
    respond({ error: 'Unauthorized' }, 401)
    render(<YearEndReminderPanel refreshKey={0} />)

    expect(
      await screen.findByText("Couldn't load the reminder stats.")
    ).toBeInTheDocument()
  })

  it('reloads when the dashboard is refreshed', async () => {
    respond(stats)
    const { rerender } = render(<YearEndReminderPanel refreshKey={0} />)
    const panel = screen.getByRole('region', { name: 'Year-end reminders' })
    await screen.findByText('3 in the last 7 days')
    expect(panel).toHaveAttribute('aria-busy', 'false')

    respond({ ...stats, lastSevenDays: 5 })
    rerender(<YearEndReminderPanel refreshKey={1} />)
    expect(panel).toHaveAttribute('aria-busy', 'true')

    expect(await screen.findByText('5 in the last 7 days')).toBeInTheDocument()
    expect(panel).toHaveAttribute('aria-busy', 'false')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
