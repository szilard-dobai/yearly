import type { CalendarData } from '@/lib/types'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CalendarDays } from './days'
import { clearSyncState, loadSyncState } from './sync'
import { useCalendarSync } from './useCalendarSync'

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }))

vi.mock('@/lib/auth/client', () => ({ authClient: { getSession } }))

const { trackEvent } = vi.hoisted(() => ({ trackEvent: vi.fn() }))
vi.mock('@/lib/tracking', () => ({ trackEvent }))

const D1 = '2026-03-10'
const D2 = '2026-03-11'

let server: { days: CalendarDays; version: number }
let failRequests = false
const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
  if (failRequests) return new Response('{}', { status: 500 })
  if (init?.method === 'PUT') {
    const body = JSON.parse(init.body as string)
    if (body.baseVersion !== server.version) {
      return new Response(JSON.stringify(server), { status: 409 })
    }
    server = { days: body.days, version: server.version + 1 }
    return new Response(JSON.stringify({ version: server.version }))
  }
  return new Response(JSON.stringify(server))
})

function calendar(...days: [string, string][]): CalendarData {
  return {
    visits: days.map(([day, countryCode], index) => {
      const [y, m, d] = day.split('-').map(Number)
      return { id: `v${index}`, countryCode, date: new Date(y, m - 1, d) }
    }),
  }
}

function renderSync(initial: CalendarData, enabled = true) {
  const onRemoteChange = vi.fn()
  const hook = renderHook(
    ({ data }) =>
      useCalendarSync({ enabled, calendarData: data, onRemoteChange }),
    { initialProps: { data: initial } }
  )
  return { ...hook, onRemoteChange }
}

describe('useCalendarSync', () => {
  beforeEach(() => {
    clearSyncState()
    server = { days: {}, version: 0 }
    failRequests = false
    vi.stubGlobal('fetch', fetchMock)
    getSession.mockResolvedValue({
      data: { user: { id: 'ana', email: 'ana@example.com' } },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('does nothing while accounts are switched off', async () => {
    const { result } = renderSync(calendar([D1, 'FR']), false)

    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(getSession).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.current.account).toBeNull()
  })

  it('does nothing for signed-out visitors', async () => {
    getSession.mockResolvedValue({ data: null })
    const { result } = renderSync(calendar([D1, 'FR']))

    await waitFor(() => expect(result.current.sessionChecked).toBe(true))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.current.account).toBeNull()
  })

  it('saves this device’s trips once signed in', async () => {
    const { result } = renderSync(calendar([D1, 'FR']))

    await waitFor(() => expect(result.current.status).toBe('saved'))
    expect(result.current.account).toEqual({
      id: 'ana',
      email: 'ana@example.com',
    })
    expect(server).toEqual({ days: { [D1]: ['FR'] }, version: 1 })
    expect(trackEvent).toHaveBeenCalledWith('account_calendar_linked', {
      choice: 'auto',
      source: 'create',
    })
  })

  it('brings the account’s trips onto an empty device', async () => {
    server = { days: { [D1]: ['FR'], [D2]: ['DE'] }, version: 3 }
    const { result, onRemoteChange } = renderSync({ visits: [] })

    await waitFor(() => expect(result.current.status).toBe('saved'))
    const applied: CalendarData = onRemoteChange.mock.calls[0][0]
    expect(
      applied.visits.map((v) => [v.date.getDate(), v.countryCode])
    ).toEqual([
      [10, 'FR'],
      [11, 'DE'],
    ])
  })

  it('asks before adding this device’s trips to an account that has its own', async () => {
    server = { days: { [D2]: ['DE'] }, version: 3 }
    const { result, onRemoteChange } = renderSync(calendar([D1, 'FR']))

    await waitFor(() => expect(result.current.firstSyncRequest).not.toBeNull())
    expect(result.current.firstSyncRequest?.summary).toEqual({
      newDays: 1,
      accountDays: 1,
      crowdedDays: 0,
    })

    act(() => result.current.firstSyncRequest?.resolve('account'))

    await waitFor(() => expect(result.current.status).toBe('saved'))
    expect(result.current.firstSyncRequest).toBeNull()
    const applied: CalendarData = onRemoteChange.mock.calls[0][0]
    expect(applied.visits.map((v) => v.countryCode)).toEqual(['DE'])
    expect(server).toEqual({ days: { [D2]: ['DE'] }, version: 3 })
  })

  it('saves later changes after a short pause', async () => {
    const { result, rerender } = renderSync(calendar([D1, 'FR']))
    await waitFor(() => expect(result.current.status).toBe('saved'))

    rerender({ data: calendar([D1, 'FR'], [D2, 'IT']) })

    await waitFor(
      () => expect(server.days).toEqual({ [D1]: ['FR'], [D2]: ['IT'] }),
      { timeout: 3000 }
    )
    expect(loadSyncState()?.version).toBe(2)
  })

  it('shows an error and keeps the trips on the device when saving fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    failRequests = true
    const { result, onRemoteChange } = renderSync(calendar([D1, 'FR']))

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(onRemoteChange).not.toHaveBeenCalled()
  })

  it('stops syncing when the session has ended', async () => {
    fetchMock.mockImplementationOnce(
      async () => new Response('{}', { status: 401 })
    )
    const { result } = renderSync(calendar([D1, 'FR']))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(result.current.account).toBeNull())
    expect(result.current.status).not.toBe('error')
    expect(server.version).toBe(0)
  })
})
