import { describe, expect, it } from 'vitest'
import { buildShareText, buildShareUrl } from './share'

describe('buildShareUrl', () => {
  it('tags the homepage link as coming from a share', () => {
    expect(buildShareUrl('https://www.yearly.world')).toBe(
      'https://www.yearly.world/?utm_source=share'
    )
  })

  it('handles a site URL with a trailing slash', () => {
    expect(buildShareUrl('https://www.yearly.world/')).toBe(
      'https://www.yearly.world/?utm_source=share'
    )
  })
})

describe('buildShareText', () => {
  it('includes the tagged link', () => {
    expect(buildShareText('https://www.yearly.world')).toBe(
      'Made with Yearly: https://www.yearly.world/?utm_source=share'
    )
  })
})
