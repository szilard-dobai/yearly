import { trackEvent } from '@/lib/tracking'
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
const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:reminder')
const revokeObjectURL = vi.fn()
const STORAGE_KEY = 'yearly_year_end_reminder'

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }))
}

function setToday(date: Date) {
  vi.useFakeTimers({ toFake: ['Date'], now: date })
}

const cardButton = () =>
  screen.getByRole('button', { name: /Your 2026 isn't over yet/ })

describe('YearEndReminderCard', () => {
  beforeEach(() => {
    setToday(new Date(2026, 10, 7, 12))
    localStorage.clear()
    fetchMock.mockReset()
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

  it('offers a reminder for the current year', () => {
    render(<YearEndReminderCard year={2026} />)

    expect(cardButton()).toHaveAttribute('aria-expanded', 'false')
    expect(
      screen.getByText(/Get a reminder on 28 Dec to make your full-year Yearly/)
    ).toBeInTheDocument()
  })

  it('stays hidden for other years', () => {
    const { container } = render(<YearEndReminderCard year={2025} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('stays hidden from 28 Dec', () => {
    setToday(new Date(2026, 11, 28))
    const { container } = render(<YearEndReminderCard year={2026} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('shows on 27 Dec', () => {
    setToday(new Date(2026, 11, 27, 23, 59))
    render(<YearEndReminderCard year={2026} />)

    expect(cardButton()).toBeInTheDocument()
  })

  it('expands into calendar and email options', async () => {
    const user = userEvent.setup()
    render(<YearEndReminderCard year={2026} />)

    await user.click(cardButton())

    expect(cardButton()).toHaveAttribute('aria-expanded', 'true')
    expect(trackEvent).toHaveBeenCalledWith('year_end_reminder_open', {
      year: 2026,
    })
    const calendars = within(
      screen.getByRole('group', { name: 'Add to your calendar' })
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
    expect(screen.getByLabelText('Or email me')).toHaveAttribute(
      'type',
      'email'
    )
    expect(
      screen.getByText(/We'll email you once, on 28 Dec. Nothing else./)
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

    await user.click(cardButton())
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
    expect(screen.getByRole('status')).toHaveTextContent(
      'Reminder set for 28 Dec in your calendar.'
    )

    unmount()
    render(<YearEndReminderCard year={2026} />)

    expect(screen.getByRole('status')).toHaveTextContent('Reminder set')
    expect(
      screen.queryByRole('button', { name: /Your 2026 isn't over yet/ })
    ).not.toBeInTheDocument()
  })

  it('opens Google Calendar and shows the reminder as set', async () => {
    const user = userEvent.setup()
    const stopNavigation = (event: Event) => event.preventDefault()
    document.addEventListener('click', stopNavigation)
    render(<YearEndReminderCard year={2026} />)

    await user.click(cardButton())
    await user.click(screen.getByRole('link', { name: 'Google' }))
    document.removeEventListener('click', stopNavigation)

    expect(trackEvent).toHaveBeenCalledWith('year_end_reminder_calendar_add', {
      provider: 'google',
      year: 2026,
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Reminder set')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({
      2026: 'google',
    })
  })

  it('emails a reminder without tracking the address', async () => {
    const user = userEvent.setup()
    fetchMock.mockReturnValue(jsonResponse({ success: true }, 201))
    render(<YearEndReminderCard year={2026} />)

    await user.click(cardButton())
    await user.type(
      screen.getByLabelText('Or email me'),
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
      "Reminder set We'll email you on 28 Dec."
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

    await user.click(cardButton())
    await user.type(screen.getByLabelText('Or email me'), 'a@example.com')
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
      "Reminder set We'll email you on 28 Dec."
    )
  })

  it('lets people try another way if the calendar add did not work', async () => {
    const user = userEvent.setup()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ 2026: 'ics' }))
    render(<YearEndReminderCard year={2026} />)

    await user.click(screen.getByRole('button', { name: "Didn't work?" }))

    expect(cardButton()).toHaveAttribute('aria-expanded', 'true')
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

    await user.click(cardButton())
    await user.click(screen.getByRole('button', { name: 'Apple / Outlook' }))

    expect(screen.getByRole('status')).toHaveTextContent('Reminder set')
  })
})
