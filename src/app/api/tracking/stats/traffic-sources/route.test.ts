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
  new Request(`http://localhost/api/tracking/stats/traffic-sources${query}`)

function firstMatch() {
  return tracking.aggregate.mock.calls[0][0][0].$match
}

describe('GET /api/tracking/stats/traffic-sources', () => {
  beforeEach(() => {
    requireAdmin.mockReset().mockResolvedValue(null)
    tracking.aggregate.mockReset().mockReturnValue({
      toArray: () =>
        Promise.resolve([
          {
            trackedDevices: [{ devices: 40 }],
            attributedDevices: [{ devices: 25 }],
            referrers: [
              { label: 'l.instagram.com', devices: 12 },
              { label: null, devices: 1 },
            ],
            inAppBrowsers: [{ label: 'Instagram', devices: 20 }],
            utmSource: [{ label: 'ig', devices: 4 }],
            utmMedium: [],
            utmCampaign: [],
            surveyFunnel: [
              { type: 'acquisition_survey_shown', devices: 10 },
              { type: 'acquisition_survey_answered', devices: 6 },
            ],
            surveyAnswers: [{ label: 'saw_image', devices: 4 }],
            surveyNotes: [
              {
                text: 'Lemon8',
                timestamp: new Date('2026-10-28T03:06:00Z'),
                country: 'SG',
              },
            ],
          },
        ]),
    })
  })

  it('requires an admin session', async () => {
    requireAdmin.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )

    const response = await GET(request())

    expect(response.status).toBe(401)
    expect(tracking.aggregate).not.toHaveBeenCalled()
  })

  it('returns unique devices for each source', async () => {
    const response = await GET(request())

    expect(await response.json()).toEqual({
      trackedDevices: 40,
      attributedDevices: 25,
      referrers: [{ label: 'l.instagram.com', devices: 12 }],
      inAppBrowsers: [{ label: 'Instagram', devices: 20 }],
      utm: { source: [{ label: 'ig', devices: 4 }], medium: [], campaign: [] },
      survey: {
        shown: 10,
        answered: 6,
        dismissed: 0,
        answers: [{ label: 'saw_image', devices: 4 }],
        notes: [
          {
            text: 'Lemon8',
            timestamp: '2026-10-28T03:06:00.000Z',
            country: 'SG',
          },
        ],
      },
    })
    expect(firstMatch()).toEqual({
      type: {
        $in: [
          'homepage_view',
          'create_page_view',
          'not_found_page_view',
          'acquisition_survey_shown',
          'acquisition_survey_answered',
          'acquisition_survey_dismissed',
        ],
      },
    })
  })

  it('applies the date range and location filters', async () => {
    await GET(
      request(
        '?from=2026-10-26T16:00:00.000Z&to=2026-10-30T16:00:00.000Z&country=SG&region=all'
      )
    )

    expect(firstMatch()).toMatchObject({
      timestamp: {
        $gte: new Date('2026-10-26T16:00:00.000Z'),
        $lt: new Date('2026-10-30T16:00:00.000Z'),
      },
      country: 'SG',
    })
    expect(firstMatch()).not.toHaveProperty('region')
  })

  it('rejects a malformed date', async () => {
    const response = await GET(request('?from=last-tuesday'))

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
