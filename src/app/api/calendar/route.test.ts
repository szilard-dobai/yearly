import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, PUT } from './route'

const { getSession, getCalendar, saveCalendar } = vi.hoisted(() => ({
  getSession: vi.fn(),
  getCalendar: vi.fn(),
  saveCalendar: vi.fn(),
}))

vi.mock('@/lib/auth/server', () => ({ auth: { api: { getSession } } }))
vi.mock('@/lib/db', () => ({ db: {} }))
vi.mock('@/lib/calendar-sync/store', () => ({ getCalendar, saveCalendar }))

const DAYS = { '2026-03-10': ['FR'] }

function get() {
  return GET(new Request('http://localhost:3000/api/calendar'))
}

function put(body: unknown, site = 'same-origin') {
  return PUT(
    new Request('http://localhost:3000/api/calendar', {
      method: 'PUT',
      headers: { 'sec-fetch-site': site, 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
  )
}

describe('/api/calendar', () => {
  beforeEach(() => {
    vi.stubEnv('ACCOUNTS_ENABLED', 'true')
    getSession.mockResolvedValue({ user: { id: 'ana' } })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('returns 404 while accounts are switched off', async () => {
    vi.stubEnv('ACCOUNTS_ENABLED', '')

    expect((await get()).status).toBe(404)
    expect((await put({ days: DAYS, baseVersion: 0 })).status).toBe(404)
    expect(getSession).not.toHaveBeenCalled()
  })

  it('requires a signed-in person', async () => {
    getSession.mockResolvedValue(null)

    expect((await get()).status).toBe(401)
    expect((await put({ days: DAYS, baseVersion: 0 })).status).toBe(401)
    expect(saveCalendar).not.toHaveBeenCalled()
  })

  it('returns the signed-in person’s calendar without caching', async () => {
    getCalendar.mockResolvedValue({ days: DAYS, version: 3 })

    const response = await get()

    expect(getCalendar).toHaveBeenCalledWith({}, 'ana')
    expect(await response.json()).toEqual({ days: DAYS, version: 3 })
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('saves a calendar and returns its new version', async () => {
    saveCalendar.mockResolvedValue({ ok: true, version: 4 })

    const response = await put({ days: DAYS, baseVersion: 3 })

    expect(saveCalendar).toHaveBeenCalledWith({}, 'ana', DAYS, 3)
    expect(await response.json()).toEqual({ version: 4 })
  })

  it('returns 409 with the latest calendar when the save is out of date', async () => {
    saveCalendar.mockResolvedValue({
      ok: false,
      remote: { days: { '2026-03-11': ['IT'] }, version: 5 },
    })

    const response = await put({ days: DAYS, baseVersion: 3 })

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      days: { '2026-03-11': ['IT'] },
      version: 5,
    })
  })

  it('refuses saves from other sites', async () => {
    expect(
      (await put({ days: DAYS, baseVersion: 0 }, 'cross-site')).status
    ).toBe(403)
    expect(saveCalendar).not.toHaveBeenCalled()
  })

  it.each([
    ['broken JSON', '{'],
    ['a missing version', { days: DAYS }],
    ['a bad day', { days: { tomorrow: ['FR'] }, baseVersion: 0 }],
    [
      'three countries on a day',
      { days: { '2026-03-10': ['FR', 'DE', 'IT'] }, baseVersion: 0 },
    ],
  ])('rejects %s', async (_label, body) => {
    expect((await put(body)).status).toBe(400)
    expect(saveCalendar).not.toHaveBeenCalled()
  })

  it('rejects a calendar that is too large', async () => {
    const response = await put({
      days: DAYS,
      baseVersion: 0,
      pad: 'x'.repeat(600_000),
    })

    expect(response.status).toBe(413)
  })
})
