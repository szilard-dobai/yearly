import { trackEvent } from '@/lib/tracking'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AccountReminder from './AccountReminder'

vi.mock('@/lib/tracking', () => ({
  trackEvent: vi.fn(),
  getDeviceType: () => 'desktop',
}))

vi.mock('@/lib/tracking/device-id', () => ({
  getDeviceId: () => 'device-123',
}))

const fetchMock = vi.fn()
const STORAGE_KEY = 'yearly_year_end_reminder'

function json(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }))
}

function mockReminderApi({ set = false, failWrites = false } = {}) {
  fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    if (method === 'GET') return json({ set })
    if (failWrites) return json({ error: 'Failed' }, 500)
    return json({ success: true }, method === 'POST' ? 201 : 200)
  })
}

function requestsWith(method: string) {
  return fetchMock.mock.calls.filter(([, init]) => init?.method === method)
}

function renderReminder() {
  return render(<AccountReminder year={2026} email="ana@example.com" />)
}

describe('AccountReminder', () => {
  beforeEach(() => {
    localStorage.clear()
    fetchMock.mockReset()
    vi.mocked(trackEvent).mockClear()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows a reminder that is on and turns it off', async () => {
    const user = userEvent.setup()
    mockReminderApi({ set: true })
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ 2026: 'email' }))
    renderReminder()

    expect(screen.getByText('Checking your reminder…')).toBeVisible()
    expect(await screen.findByRole('status')).toHaveTextContent(
      "We'll email you on 1 Dec, when year-in-review season starts, to add your last trips and share your 2026."
    )

    await user.click(screen.getByRole('button', { name: 'Turn off' }))

    expect(
      await screen.findByRole('button', { name: 'Remind me' })
    ).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Get one email on 1 Dec, when year-in-review season starts, to add your last trips and share your 2026.'
    )
    expect(requestsWith('DELETE')).toEqual([
      ['/api/reminders?year=2026', { method: 'DELETE' }],
    ])
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({})
  })

  it('turns a reminder on for the account email', async () => {
    const user = userEvent.setup()
    mockReminderApi()
    renderReminder()

    await user.click(await screen.findByRole('button', { name: 'Remind me' }))

    expect(
      await screen.findByRole('button', { name: 'Turn off' })
    ).toBeVisible()
    expect(JSON.parse(requestsWith('POST')[0][1].body)).toMatchObject({
      email: 'ana@example.com',
      year: 2026,
    })
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({
      2026: 'email',
    })
  })

  it('says when a change failed', async () => {
    const user = userEvent.setup()
    mockReminderApi({ set: true, failWrites: true })
    renderReminder()

    await user.click(await screen.findByRole('button', { name: 'Turn off' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Please try again.'
    )
    expect(screen.getByRole('button', { name: 'Turn off' })).toBeEnabled()
  })

  it('says when the reminder could not be loaded', async () => {
    fetchMock.mockImplementation(() => json({ error: 'Failed' }, 500))
    renderReminder()

    expect(
      await screen.findByText(
        "We couldn't load your reminder. Refresh the page to try again."
      )
    ).toBeVisible()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
