import { describe, expect, it } from 'vitest'
import { buildDateRangeParams, buildTrafficSourceStats } from './stats'

describe('buildTrafficSourceStats', () => {
  it('fills in zeros when nothing has been recorded', () => {
    expect(buildTrafficSourceStats()).toEqual({
      trackedDevices: 0,
      attributedDevices: 0,
      referrers: [],
      inAppBrowsers: [],
      utm: { source: [], medium: [], campaign: [] },
      survey: { shown: 0, answered: 0, dismissed: 0, answers: [], notes: [] },
    })
  })

  it('drops rows without a label', () => {
    expect(
      buildTrafficSourceStats({
        inAppBrowsers: [
          { label: 'TikTok', devices: 3 },
          { label: '', devices: 2 },
        ],
      }).inAppBrowsers
    ).toEqual([{ label: 'TikTok', devices: 3 }])
  })
})

describe('buildDateRangeParams', () => {
  it('covers whole local days, with the end day included', () => {
    const params = buildDateRangeParams({
      from: new Date(2026, 9, 27, 15, 30),
      to: new Date(2026, 9, 30),
    })

    expect(params.get('from')).toBe(new Date(2026, 9, 27).toISOString())
    expect(params.get('to')).toBe(new Date(2026, 9, 31).toISOString())
  })

  it('covers a single day', () => {
    const params = buildDateRangeParams({ from: new Date(2026, 9, 28) })

    expect(params.get('from')).toBe(new Date(2026, 9, 28).toISOString())
    expect(params.get('to')).toBe(new Date(2026, 9, 29).toISOString())
  })

  it('means all time without a start day', () => {
    expect(buildDateRangeParams().toString()).toBe('')
    expect(buildDateRangeParams({ to: new Date(2026, 9, 30) }).toString()).toBe(
      ''
    )
  })
})
