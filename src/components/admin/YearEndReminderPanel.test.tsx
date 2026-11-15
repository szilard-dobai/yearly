import { render, screen, within } from '@testing-library/react'
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
  shown: 40,
  calendarAdds: { ics: 9, google: 4 },
  send: {
    sent: 0,
    failed: 0,
    left: 12,
    needsCheck: 0,
    blocked: 'Reminders only send from 1\u00a0Dec to 3\u00a0Dec (UTC)',
  },
}

const openStats = {
  ...stats,
  send: { sent: 9, failed: 1, left: 3, needsCheck: 1, blocked: null },
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

  it('shows sign-ups, calendar adds and how many saw the card', async () => {
    respond(stats)
    render(<YearEndReminderPanel refreshKey={0} />)

    expect(await screen.findByText('3 in the last 7 days')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/reminders/stats')
    expect(metric('Email sign-ups')).toHaveTextContent('12')
    expect(metric('Apple / Outlook')).toHaveTextContent('9')
    expect(metric('Google Calendar')).toHaveTextContent('4')
    expect(metric('Cards shown')).toHaveTextContent('40')
    expect(screen.getByText(/For 1 Dec 2026/)).toBeInTheDocument()
  })

  it('shows how the send is going', async () => {
    respond(openStats)
    render(<YearEndReminderPanel refreshKey={0} />)

    await screen.findByText('3 in the last 7 days')
    expect(metric('Sent')).toHaveTextContent('9')
    expect(metric('Failed')).toHaveTextContent('1')
    expect(metric('Left')).toHaveTextContent('3')
    expect(
      screen.getByText("1 won't be retried; check Resend's logs")
    ).toBeInTheDocument()
  })

  it('only offers Run now while sending is open, and says when it opens', async () => {
    respond(stats)
    render(<YearEndReminderPanel refreshKey={0} />)

    expect(
      await screen.findByText(/^Reminders only send from 1\sDec to 3\sDec/)
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Run now' })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Send a test' })
    ).toBeInTheDocument()
  })

  it('runs the send after a confirmation and reloads the numbers', async () => {
    const user = userEvent.setup()
    respond(openStats)
    render(<YearEndReminderPanel refreshKey={0} />)
    await user.click(await screen.findByRole('button', { name: 'Run now' }))

    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            year: 2026,
            total: 13,
            alreadySent: 9,
            sentNow: 3,
            failed: 0,
            left: 1,
            needsCheck: 1,
            stopped: 'done',
          })
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ...openStats,
            send: { ...openStats.send, sent: 12, left: 1 },
          })
        )
      )
    await user.click(screen.getByRole('button', { name: 'Send now' }))

    expect(
      await screen.findByText('Sent 3, 0 failed, 1 left.')
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/reminders/send',
      expect.objectContaining({ method: 'POST' })
    )
    await vi.waitFor(() => expect(metric('Sent')).toHaveTextContent('12'))
  })

  it('sends a test to the address typed in', async () => {
    const user = userEvent.setup()
    respond(stats)
    render(<YearEndReminderPanel refreshKey={0} />)
    await user.click(await screen.findByRole('button', { name: 'Send a test' }))
    const dialog = screen.getByRole('dialog')

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }))
    )
    await user.type(
      within(dialog).getByLabelText('Email address'),
      'me@example.com'
    )
    await user.click(within(dialog).getByRole('button', { name: 'Send test' }))

    expect(
      await within(dialog).findByText('Sent. Check that inbox.')
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenLastCalledWith('/api/reminders/test-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'me@example.com' }),
    })
  })

  it('shows why a test could not be sent', async () => {
    const user = userEvent.setup()
    respond(stats)
    render(<YearEndReminderPanel refreshKey={0} />)
    await user.click(await screen.findByRole('button', { name: 'Send a test' }))
    const dialog = screen.getByRole('dialog')

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: "Couldn't send the test (invalid_from_address)",
        }),
        { status: 502 }
      )
    )
    await user.type(
      within(dialog).getByLabelText('Email address'),
      'me@example.com'
    )
    await user.click(within(dialog).getByRole('button', { name: 'Send test' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      "Couldn't send the test (invalid_from_address)"
    )
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
    respond({
      ...stats,
      total: 0,
      lastSevenDays: 0,
      emails: [],
      send: { ...stats.send, left: 0 },
    })
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
