import { describe, expect, it } from 'vitest'
import { buildVideoOfferFunnel, formatRate } from './stats'

describe('buildVideoOfferFunnel', () => {
  it('lines up each step by price, cheapest first', () => {
    expect(
      buildVideoOfferFunnel([
        { type: 'animated_video_preview_open', price: 2.99, devices: 38 },
        { type: 'animated_video_preview_open', price: 1.99, devices: 40 },
        { type: 'animated_video_buy_click', price: 1.99, devices: 10 },
        { type: 'animated_video_waitlist_join', price: 1.99, devices: 6 },
        { type: 'animated_video_buy_click', price: 2.99, devices: 7 },
      ])
    ).toEqual([
      { price: 1.99, previews: 40, buyClicks: 10, signups: 6 },
      { price: 2.99, previews: 38, buyClicks: 7, signups: 0 },
    ])
  })

  it('ignores rows without a price or from other events', () => {
    expect(
      buildVideoOfferFunnel([
        { type: 'animated_video_preview_open', price: null, devices: 3 },
        { type: 'image_export_click', price: 1.99, devices: 50 },
      ])
    ).toEqual([])
  })
})

describe('formatRate', () => {
  it('rounds to a whole percentage', () => {
    expect(formatRate(7, 38)).toBe('18%')
    expect(formatRate(0, 0)).toBe('–')
  })
})
