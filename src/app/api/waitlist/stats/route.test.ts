import { NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'

const requireAdmin = vi.fn()
const waitlist = { countDocuments: vi.fn() }
const tracking = { aggregate: vi.fn() }

vi.mock('@/lib/tracking/api', () => ({
  requireAdmin: (...args: unknown[]) => requireAdmin(...args),
}))

vi.mock('@/lib/mongodb', () => ({
  getWaitlistCollection: () => Promise.resolve(waitlist),
  getTrackingCollection: () => Promise.resolve(tracking),
}))

const request = () => new Request('http://localhost/api/waitlist/stats')

describe('GET /api/waitlist/stats', () => {
  beforeEach(() => {
    requireAdmin.mockReset().mockResolvedValue(null)
    waitlist.countDocuments
      .mockReset()
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(3)
    tracking.aggregate.mockReset().mockReturnValue({
      toArray: () =>
        Promise.resolve([
          { type: 'animated_video_preview_open', price: 1.99, devices: 40 },
          { type: 'animated_video_buy_click', price: 1.99, devices: 10 },
        ]),
    })
  })

  it('requires an admin session', async () => {
    requireAdmin.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )

    const response = await GET(request())

    expect(response.status).toBe(401)
    expect(waitlist.countDocuments).not.toHaveBeenCalled()
  })

  it('returns the waitlist size and the funnel by price', async () => {
    const response = await GET(request())

    expect(await response.json()).toEqual({
      total: 12,
      lastSevenDays: 3,
      funnel: [{ price: 1.99, previews: 40, buyClicks: 10, signups: 0 }],
    })
    expect(waitlist.countDocuments).toHaveBeenCalledWith({
      feature: 'animated_video',
    })
  })
})
