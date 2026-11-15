import { NextResponse } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'

const requireAdmin = vi.fn()
const reminders = { find: vi.fn(), countDocuments: vi.fn() }
const tracking = { aggregate: vi.fn() }

vi.mock('@/lib/tracking/api', () => ({
  requireAdmin: (...args: unknown[]) => requireAdmin(...args),
}))

vi.mock('@/lib/mongodb', () => ({
  getRemindersCollection: () => Promise.resolve(reminders),
  getTrackingCollection: () => Promise.resolve(tracking),
}))

const request = () => new Request('http://localhost/api/reminders/stats')

describe('GET /api/reminders/stats', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['Date'],
      now: new Date('2026-11-07T12:00:00Z'),
    })
    requireAdmin.mockReset().mockResolvedValue(null)
    reminders.countDocuments.mockReset().mockImplementation(async (filter) => {
      if (filter.$or) return 0
      if (filter.sendError) return 0
      if (filter.sentAt?.$exists === true) return 0
      return 2
    })
    reminders.find.mockReset().mockReturnValue({
      toArray: () =>
        Promise.resolve([
          { email: 'early@example.com', createdAt: new Date('2026-10-20') },
          { email: 'recent@example.com', createdAt: new Date('2026-11-05') },
        ]),
    })
    tracking.aggregate.mockReset().mockReturnValue({
      toArray: () =>
        Promise.resolve([
          { type: 'year_end_reminder_shown', devices: 30 },
          {
            type: 'year_end_reminder_calendar_add',
            provider: 'ics',
            devices: 6,
          },
          {
            type: 'year_end_reminder_calendar_add',
            provider: 'google',
            devices: 2,
          },
        ]),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('shows how the send is going and allows a run on the day itself', async () => {
    vi.setSystemTime(new Date('2026-12-01T10:00:00Z'))
    vi.stubEnv('VERCEL_ENV', 'production')
    reminders.countDocuments.mockImplementation(async (filter) => {
      if (filter.$or && filter.sendAttempts) return 0
      if (filter.$or) return 1
      if (filter.sendError) return 1
      if (filter.sentAt?.$exists === true) return 40
      return 42
    })

    const response = await GET(request())

    expect((await response.json()).send).toEqual({
      sent: 40,
      failed: 1,
      left: 2,
      needsCheck: 1,
      blocked: null,
    })
  })

  it('says when sending opens', async () => {
    vi.stubEnv('VERCEL_ENV', 'production')

    const response = await GET(request())

    expect((await response.json()).send.blocked).toBe(
      'Reminders only send from 1\u00a0Dec to 3\u00a0Dec (UTC)'
    )
  })

  it('requires an admin session', async () => {
    requireAdmin.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )

    const response = await GET(request())

    expect(response.status).toBe(401)
    expect(reminders.find).not.toHaveBeenCalled()
  })

  it("returns this year's sign-ups, emails and calendar adds", async () => {
    const response = await GET(request())

    expect(await response.json()).toEqual({
      year: 2026,
      total: 2,
      lastSevenDays: 1,
      emails: ['early@example.com', 'recent@example.com'],
      shown: 30,
      calendarAdds: { ics: 6, google: 2 },
      send: {
        sent: 0,
        failed: 0,
        left: 2,
        needsCheck: 0,
        blocked: 'Reminders only send from production',
      },
    })
    expect(reminders.find).toHaveBeenCalledWith(
      { year: 2026 },
      expect.objectContaining({ sort: { createdAt: 1 } })
    )
    expect(tracking.aggregate.mock.calls[0][0][0]).toEqual({
      $match: {
        type: {
          $in: ['year_end_reminder_shown', 'year_end_reminder_calendar_add'],
        },
        'metadata.year': 2026,
      },
    })
  })
})
