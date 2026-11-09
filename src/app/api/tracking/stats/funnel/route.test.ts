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

describe('GET /api/tracking/stats/funnel', () => {
  beforeEach(() => {
    requireAdmin.mockReset().mockResolvedValue(null)
    tracking.aggregate.mockReset()
    respondWith([
      {
        _id: null,
        arrived: 120,
        opened: 80,
        added: 50,
        exported: 30,
        downloaded: 18,
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

  it('returns the devices at each step', async () => {
    const response = await GET(request())

    expect(await response.json()).toEqual({
      steps: [
        { key: 'arrived', devices: 120 },
        { key: 'opened', devices: 80 },
        { key: 'added', devices: 50 },
        { key: 'exported', devices: 30 },
        { key: 'downloaded', devices: 18 },
      ],
    })
  })

  it('returns zeros when nothing matches', async () => {
    respondWith([])

    const response = await GET(request())
    const { steps } = await response.json()

    expect(steps.map((step: { devices: number }) => step.devices)).toEqual([
      0, 0, 0, 0, 0,
    ])
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
