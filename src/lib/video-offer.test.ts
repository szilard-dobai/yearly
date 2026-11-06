import { describe, expect, it } from 'vitest'
import {
  ANIMATED_VIDEO_PRICES,
  formatPrice,
  getAnimatedVideoPrice,
} from './video-offer'

describe('getAnimatedVideoPrice', () => {
  it('gives the same device the same price every time', () => {
    const deviceId = '3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c'
    expect(getAnimatedVideoPrice(deviceId)).toBe(
      getAnimatedVideoPrice(deviceId)
    )
  })

  it('splits devices across every price', () => {
    const prices = new Set(
      Array.from({ length: 50 }, (_, i) => getAnimatedVideoPrice(`device-${i}`))
    )
    expect([...prices].sort()).toEqual([...ANIMATED_VIDEO_PRICES].sort())
  })
})

describe('formatPrice', () => {
  it('formats US dollars with cents', () => {
    expect(formatPrice(1.99)).toBe('$1.99')
    expect(formatPrice(3)).toBe('$3.00')
  })
})
