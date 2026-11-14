import { describe, expect, it } from 'vitest'
import { formatPrice, VIDEO_PACK_PRICE } from './video-offer'

describe('formatPrice', () => {
  it('formats US dollars with cents', () => {
    expect(formatPrice(1.99)).toBe('$1.99')
    expect(formatPrice(3)).toBe('$3.00')
  })

  it('shows the pack price', () => {
    expect(formatPrice(VIDEO_PACK_PRICE)).toBe('$2.99')
  })
})
