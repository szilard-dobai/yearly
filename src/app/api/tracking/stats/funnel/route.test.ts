import { NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'

const requireAdmin = vi.fn()
const tracking = { aggregate: vi.fn() }

vi.mock('@/lib/tracking/api', () => ({
  requireAdmin: (...args: unknown[]) => requireAdmin(...args),
}))

vi.mock('@/lib/mongodb', () => ({
  getTrackingCollection: () => Promise.resolve(tracking),
}))

const request = (query = '') =>
  new Request(`http://localhost/api/tracking/stats/funnel${query}`)

function respondWith(rows: unknown[]) {
  tracking.aggregate.mockReturnValue({ toArray: () => Promise.resolve(rows) })
}

const devices = (steps: { devices: number }[]) =>
  steps.map((step) => step.devices)

describe('GET /api/tracking/stats/funnel', () => {
  beforeEach(() => {
    requireAdmin.mockReset().mockResolvedValue(null)
    tracking.aggregate.mockReset()
    respondWith([
      {
        _id: 'mobile',
        arrived: 90,
        opened: 60,
        added: 35,
        exported: 20,
        downloaded: 10,
      },
      {
        _id: 'desktop',
        arrived: 30,
        opened: 20,
        added: 15,
        exported: 10,
        downloaded: 8,
      },
    ])
  })

  it('requires an admin session', async () => {
    requireAdmin.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )

    const response = await GET(request())

    expect(response.status).toBe(401)
    expect(tracking.aggregate).not.toHaveBeenCalled()
  })

  it('returns the devices at each step, overall and by device type', async () => {
    const response = await GET(request())
    const stats = await response.json()

    expect(stats.all).toEqual([
      { key: 'arrived', devices: 120 },
      { key: 'opened', devices: 80 },
      { key: 'added', devices: 50 },
      { key: 'exported', devices: 30 },
      { key: 'downloaded', devices: 18 },
    ])
    expect(devices(stats.mobile)).toEqual([90, 60, 35, 20, 10])
    expect(devices(stats.desktop)).toEqual([30, 20, 15, 10, 8])
    expect(devices(stats.tablet)).toEqual([0, 0, 0, 0, 0])
  })

  it('returns zeros when nothing matches', async () => {
    respondWith([])

    const response = await GET(request())

    expect(devices((await response.json()).all)).toEqual([0, 0, 0, 0, 0])
  })

  it('applies the date range and location filters', async () => {
    await GET(
      request(
        '?from=2026-10-26T16:00:00.000Z&to=2026-10-30T16:00:00.000Z&country=SG&region=all'
      )
    )

    const match = tracking.aggregate.mock.calls[0][0][0].$match
    expect(match).toMatchObject({
      timestamp: {
        $gte: new Date('2026-10-26T16:00:00.000Z'),
        $lt: new Date('2026-10-30T16:00:00.000Z'),
      },
      country: 'SG',
    })
    expect(match).not.toHaveProperty('region')
  })

  it('rejects an invalid date range', async () => {
    const response = await GET(request('?from=yesterday'))

    expect(response.status).toBe(400)
    expect(tracking.aggregate).not.toHaveBeenCalled()
  })

  it('reports a database failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    tracking.aggregate.mockReturnValue({
      toArray: () => Promise.reject(new Error('down')),
    })

    const response = await GET(request())

    expect(response.status).toBe(500)
  })
})
