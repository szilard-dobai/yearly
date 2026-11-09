import { describe, expect, it } from 'vitest'
import {
  buildFunnelPipeline,
  buildFunnelStats,
  findBiggestDrop,
  type FunnelStep,
} from './funnel'

const row = (_id: string | null, ...devices: number[]) => ({
  _id,
  arrived: devices[0],
  opened: devices[1],
  added: devices[2],
  exported: devices[3],
  downloaded: devices[4],
})

const counts = (steps: FunnelStep[]) => steps.map((step) => step.devices)

const steps = (...devices: number[]): FunnelStep[] =>
  buildFunnelStats([row('mobile', ...devices)]).all

describe('buildFunnelStats', () => {
  it('lists every step in journey order', () => {
    expect(
      buildFunnelStats([
        { _id: 'mobile', arrived: 100, opened: 60, downloaded: 5 },
      ]).mobile
    ).toEqual([
      { key: 'arrived', devices: 100 },
      { key: 'opened', devices: 60 },
      { key: 'added', devices: 0 },
      { key: 'exported', devices: 0 },
      { key: 'downloaded', devices: 5 },
    ])
  })

  it('splits mobile and desktop, and counts tablets and unknown devices in the total only', () => {
    const stats = buildFunnelStats([
      row('mobile', 700, 500, 300, 150, 90),
      row('desktop', 250, 220, 180, 120, 100),
      row('tablet', 30, 20, 10, 5, 2),
      row(null, 20, 10, 5, 0, 0),
    ])

    expect(counts(stats.all)).toEqual([1000, 750, 495, 275, 192])
    expect(counts(stats.mobile)).toEqual([700, 500, 300, 150, 90])
    expect(counts(stats.desktop)).toEqual([250, 220, 180, 120, 100])
    expect(stats).not.toHaveProperty('tablet')
  })

  it('treats a missing device type as an empty funnel', () => {
    const stats = buildFunnelStats([row('mobile', 10, 5, 2, 1, 1)])

    expect(counts(stats.desktop)).toEqual([0, 0, 0, 0, 0])
    expect(counts(buildFunnelStats().all)).toEqual([0, 0, 0, 0, 0])
  })
})

describe('buildFunnelPipeline', () => {
  it('only reads events that belong to a step, plus the filters', () => {
    const [{ $match }] = buildFunnelPipeline({ country: 'SG' })

    expect($match).toEqual({
      country: 'SG',
      $or: [
        {
          type: {
            $in: ['homepage_view', 'create_page_view', 'not_found_page_view'],
          },
        },
        { type: { $in: ['create_page_view'] } },
        { type: { $in: ['visit_add_attempt'] }, 'metadata.success': true },
        {
          type: {
            $in: [
              'image_export_click',
              'monthly_export_click',
              'statistics_export_click',
            ],
          },
        },
        { type: { $in: ['image_download_click'] } },
      ],
    })
  })

  it('gives each device one known device type', () => {
    const [, device] = buildFunnelPipeline()

    expect(device.$group.deviceType).toEqual({
      $max: {
        $cond: [
          { $in: ['$deviceType', ['mobile', 'tablet', 'desktop']] },
          '$deviceType',
          null,
        ],
      },
    })
  })

  it('counts a device at a step only if it reached every earlier step', () => {
    const [, , total] = buildFunnelPipeline()

    expect(total.$group._id).toBe('$deviceType')
    expect(total.$group.arrived).toEqual({ $sum: { $min: ['$arrived'] } })
    expect(total.$group.exported).toEqual({
      $sum: { $min: ['$arrived', '$opened', '$added', '$exported'] },
    })
  })
})

describe('findBiggestDrop', () => {
  it('picks the step that loses the largest share of the previous one', () => {
    expect(findBiggestDrop(steps(1000, 600, 150, 120, 60))).toBe('added')
  })

  it('compares rates, not raw counts', () => {
    expect(findBiggestDrop(steps(1000, 500, 450, 400, 40))).toBe('downloaded')
  })

  it('ignores steps after the funnel runs dry', () => {
    expect(findBiggestDrop(steps(10, 0, 0, 0, 0))).toBe('opened')
  })

  it('returns nothing when no one drops off', () => {
    expect(findBiggestDrop(steps(0, 0, 0, 0, 0))).toBeNull()
    expect(findBiggestDrop(steps(5, 5, 5, 5, 5))).toBeNull()
  })
})
