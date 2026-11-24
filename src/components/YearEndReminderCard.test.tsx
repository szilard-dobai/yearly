import { trackEvent } from '@/lib/tracking'
import { textAcrossElements } from '@/test/test-utils'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import YearEndReminderCard from './YearEndReminderCard'

vi.mock('@/lib/tracking', () => ({
  trackEvent: vi.fn(),
  getDeviceType: () => 'mobile',
}))

vi.mock('@/lib/tracking/device-id', () => ({
  getDeviceId: () => 'device-123',
}))

const fetchMock = vi.fn()

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }))

vi.mock('@/lib/auth/client', () => ({ authClient: { getSession } }))
const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:reminder')
const revokeObjectURL = vi.fn()
const STORAGE_KEY = 'yearly_year_end_reminder'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }))
}

function calendarRequests() {
  return fetchMock.mock.calls
    .filter(([url]) => url === '/api/reminders/calendar')
    .map(([, init]) => JSON.parse(init.body))
}

function setToday(date: Date) {
  vi.useFakeTimers({ toFake: ['Date'], now: date })
}

const TITLE = 'More trips before New Year?'

describe('YearEndReminderCard', () => {
  beforeEach(() => {
    setToday(new Date(2026, 10, 7, 12))
    localStorage.clear()
    fetchMock.mockReset().mockImplementation(() => jsonResponse({}, 201))
    getSession.mockReset().mockResolvedValue({ data: null })
    createObjectURL.mockClear()
    vi.mocked(trackEvent).mockClear()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://yearly.world')
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = revokeObjectURL
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('offers a reminder for the current year and records that it was shown', () => {
    render(<YearEndReminderCard year={2026} />)

    expect(screen.getByText(TITLE)).toBeVisible()
    expect(screen.getByText(/We'll remind you on 1/)).toHaveTextContent(
      "We'll remind you on 1 Dec, when year-in-review season starts, to add them and share your 2026."
    )
    expect(trackEvent).toHaveBeenCalledWith('year_end_reminder_shown', {
      year: 2026,
    })
  })

  it('stays hidden for other years', () => {
    const { container } = render(<YearEndReminderCard year={2025} />)

    expect(container).toBeEmptyDOMElement()
    expect(trackEvent).not.toHaveBeenCalled()
  })

  it('stays hidden from 1 Dec', () => {
    setToday(new Date(2026, 11, 1))
    const { container } = render(<YearEndReminderCard year={2026} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('shows on 30 Nov', () => {
    setToday(new Date(2026, 10, 30, 23, 59))
    render(<YearEndReminderCard year={2026} />)

    expect(screen.getByText(TITLE)).toBeInTheDocument()
  })

  it('shows the email form and calendar options without a click', () => {
    render(<YearEndReminderCard year={2026} />)

    const calendars = within(
      screen.getByRole('group', { name: 'Or add it to your calendar' })
    )
    expect(
      calendars.getByRole('button', { name: 'Apple / Outlook' })
    ).toBeInTheDocument()
    const google = calendars.getByRole('link', { name: 'Google' })
    expect(google.getAttribute('href')).toMatch(
      /^https:\/\/calendar\.google\.com\/calendar\/render\?action=TEMPLATE/
    )
    expect(google.getAttribute('href')).toContain(
      encodeURIComponent('https://yearly.world/create?utm_source=reminder')
    )
    expect(screen.getByLabelText('Email for your reminder')).toHaveAttribute(
      'type',
      'email'
    )
    expect(
      screen.getByText(/We'll email you once, on 1 Dec. Nothing else./)
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute(
      'href',
      '/privacy'
    )
  })

  it('downloads an .ics file and remembers the reminder', async () => {
    const user = userEvent.setup()
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})
    const { unmount } = render(<YearEndReminderCard year={2026} />)

    await user.click(screen.getByRole('button', { name: 'Apple / Outlook' }))

    const blob = createObjectURL.mock.calls[0][0]
    expect(blob.type).toBe('text/calendar;charset=utf-8')
    const link = click.mock.contexts[0] as HTMLAnchorElement
    expect(link.download).toBe('yearly-reminder-2026.ics')
    expect(link.href).toBe('blob:reminder')
    expect(trackEvent).toHaveBeenCalledWith('year_end_reminder_calendar_add', {
      provider: 'ics',
      year: 2026,
    })
    expect(calendarRequests()).toEqual([
      {
        year: 2026,
        provider: 'ics',
        deviceId: 'device-123',
        deviceType: 'mobile',
      },
    ])
    expect(screen.getByRole('status')).toHaveTextContent(
      'Reminder set for 1 Dec in your calendar.'
    )

    unmount()
    render(<YearEndReminderCard year={2026} />)

    expect(screen.getByRole('status')).toHaveTextContent('Reminder set')
    expect(screen.queryByText(TITLE)).not.toBeInTheDocument()
  })

  it('opens Google Calendar and shows the reminder as set', async () => {
    const user = userEvent.setup()
    const stopNavigation = (event: Event) => event.preventDefault()
    document.addEventListener('click', stopNavigation)
    render(<YearEndReminderCard year={2026} />)

    await user.click(screen.getByRole('link', { name: 'Google' }))
    document.removeEventListener('click', stopNavigation)

    expect(trackEvent).toHaveBeenCalledWith('year_end_reminder_calendar_add', {
      provider: 'google',
      year: 2026,
    })
    expect(calendarRequests()).toEqual([
      expect.objectContaining({ year: 2026, provider: 'google' }),
    ])
    expect(await screen.findByRole('status')).toHaveTextContent('Reminder set')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({
      2026: 'google',
    })
  })

  it('still confirms a calendar add when recording it fails', async () => {
    const user = userEvent.setup()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    fetchMock.mockImplementation(() => Promise.reject(new Error('offline')))
    render(<YearEndReminderCard year={2026} />)

    await user.click(screen.getByRole('button', { name: 'Apple / Outlook' }))

    expect(calendarRequests()).toHaveLength(1)
    expect(screen.getByRole('status')).toHaveTextContent(
      'Reminder set for 1 Dec in your calendar.'
    )
  })

  it('emails a reminder without tracking the address', async () => {
    const user = userEvent.setup()
    fetchMock.mockReturnValue(jsonResponse({ success: true }, 201))
    render(<YearEndReminderCard year={2026} />)

    await user.type(
      screen.getByLabelText('Email for your reminder'),
      ' traveller@example.com '
    )
    await user.click(screen.getByRole('button', { name: 'Remind me' }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/reminders',
      expect.objectContaining({ method: 'POST' })
    )
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      email: 'traveller@example.com',
      year: 2026,
      deviceId: 'device-123',
      deviceType: 'mobile',
    })
    expect(await screen.findByRole('status')).toHaveTextContent(
      "Reminder set We'll email you on 1 Dec."
    )
    expect(trackEvent).toHaveBeenCalledWith('year_end_reminder_email_submit', {
      year: 2026,
    })
    expect(JSON.stringify(vi.mocked(trackEvent).mock.calls)).not.toContain(
      'traveller'
    )
    expect(
      screen.queryByRole('button', { name: "Didn't work?" })
    ).not.toBeInTheDocument()
  })

  it('shows why the email could not be saved', async () => {
    const user = userEvent.setup()
    fetchMock.mockReturnValue(
      jsonResponse({ error: 'Too many sign-ups, please try again later' }, 429)
    )
    render(<YearEndReminderCard year={2026} />)

    await user.type(
      screen.getByLabelText('Email for your reminder'),
      'a@example.com'
    )
    await user.click(screen.getByRole('button', { name: 'Remind me' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many sign-ups, please try again later'
    )
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(trackEvent).not.toHaveBeenCalledWith(
      'year_end_reminder_email_submit',
      expect.anything()
    )
  })

  it('shows the compact state when a reminder was set on an earlier export', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ 2026: 'email' }))
    render(<YearEndReminderCard year={2026} />)

    expect(screen.getByRole('status')).toHaveTextContent(
      "Reminder set We'll email you on 1 Dec."
    )
    expect(trackEvent).not.toHaveBeenCalled()
  })

  it('lets people try another way if the calendar add did not work', async () => {
    const user = userEvent.setup()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ 2026: 'ics' }))
    render(<YearEndReminderCard year={2026} />)

    await user.click(screen.getByRole('button', { name: "Didn't work?" }))

    expect(screen.getByText(TITLE)).toBeVisible()
    expect(screen.getByRole('link', { name: 'Google' })).toBeInTheDocument()
    expect(trackEvent).not.toHaveBeenCalled()
  })

  it('still confirms the reminder when storage is unavailable', async () => {
    const user = userEvent.setup()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    render(<YearEndReminderCard year={2026} />)

    await user.click(screen.getByRole('button', { name: 'Apple / Outlook' }))

    expect(screen.getByRole('status')).toHaveTextContent('Reminder set')
  })

  describe('when signed in', () => {
    function mockReminderApi({ set = false } = {}) {
      fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
        const method = init?.method ?? 'GET'
        if (method === 'GET') return jsonResponse({ set })
        return jsonResponse({ success: true }, method === 'POST' ? 201 : 200)
      })
    }

    function requestsWith(method: string) {
      return fetchMock.mock.calls.filter(([, init]) => init?.method === method)
    }

    function renderSignedIn() {
      getSession.mockResolvedValue({
        data: { user: { id: 'ana', email: 'ana@example.com' } },
      })
      return render(<YearEndReminderCard year={2026} />)
    }

    it('sets the reminder with one tap, without asking for an email', async () => {
      const user = userEvent.setup()
      mockReminderApi()
      renderSignedIn()

      expect(
        await screen.findByText(
          textAcrossElements(/We'll email ana@example\.com once, on 1 Dec\./)
        )
      ).toBeVisible()
      expect(
        screen.queryByLabelText('Email for your reminder')
      ).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Remind me' }))

      expect(await screen.findByRole('status')).toHaveTextContent(
        "Reminder set We'll email you on 1 Dec."
      )
      expect(JSON.parse(requestsWith('POST')[0][1].body)).toMatchObject({
        email: 'ana@example.com',
        year: 2026,
      })
      expect(screen.getByRole('button', { name: 'Turn off' })).toBeVisible()
    })

    it('shows a reminder saved to the account from another device', async () => {
      mockReminderApi({ set: true })
      renderSignedIn()

      expect(await screen.findByRole('status')).toHaveTextContent(
        "Reminder set We'll email you on 1 Dec."
      )
      expect(fetchMock).toHaveBeenCalledWith('/api/reminders?year=2026', {
        cache: 'no-store',
      })
    })

    it('turns the reminder off', async () => {
      const user = userEvent.setup()
      mockReminderApi({ set: true })
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ 2026: 'email' }))
      renderSignedIn()

      await user.click(await screen.findByRole('button', { name: 'Turn off' }))

      expect(
        await screen.findByRole('button', { name: 'Remind me' })
      ).toBeVisible()
      expect(requestsWith('DELETE')).toEqual([
        ['/api/reminders?year=2026', { method: 'DELETE' }],
      ])
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({})
      expect(trackEvent).toHaveBeenCalledWith(
        'year_end_reminder_email_turn_off',
        { year: 2026 }
      )
    })

    it('says when turning it off failed', async () => {
      const user = userEvent.setup()
      fetchMock.mockImplementation((_url: string, init?: RequestInit) =>
        init?.method === 'DELETE'
          ? jsonResponse({ error: 'Failed' }, 500)
          : jsonResponse({ set: true })
      )
      renderSignedIn()

      await user.click(await screen.findByRole('button', { name: 'Turn off' }))

      expect(await screen.findByRole('status')).toHaveTextContent(
        "We couldn't turn it off. Please try again."
      )
    })

    it('offers the reminder again when it was turned off elsewhere', async () => {
      mockReminderApi({ set: false })
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ 2026: 'email' }))
      renderSignedIn()

      expect(
        await screen.findByRole('button', { name: 'Remind me' })
      ).toBeVisible()
    })

    it("keeps this device's calendar reminder", async () => {
      mockReminderApi({ set: false })
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ 2026: 'ics' }))
      renderSignedIn()

      await vi.waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith('/api/reminders?year=2026', {
          cache: 'no-store',
        })
      )
      expect(screen.getByRole('status')).toHaveTextContent(
        'Reminder set for 1 Dec in your calendar.'
      )
    })

    it('does not check the account for other years', async () => {
      mockReminderApi()
      renderSignedIn().rerender(<YearEndReminderCard year={2025} />)

      await vi.waitFor(() => expect(getSession).toHaveBeenCalled())
      expect(fetchMock).not.toHaveBeenCalledWith(
        '/api/reminders?year=2025',
        expect.anything()
      )
    })
  })
})
