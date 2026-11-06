import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getExternalReferrer,
  getTrafficSource,
  getUtmParams,
} from './traffic-source'

const ORIGIN = 'https://yearly.world'

describe('getExternalReferrer', () => {
  it('keeps the origin and path of an external page', () => {
    expect(
      getExternalReferrer(
        'https://l.instagram.com/some/path?u=https%3A%2F%2Fyearly.world&e=AT0#top',
        ORIGIN
      )
    ).toBe('https://l.instagram.com/some/path')
  })

  it('keeps a non-default port', () => {
    expect(getExternalReferrer('http://localhost:4000/', ORIGIN)).toBe(
      'http://localhost:4000/'
    )
  })

  it('keeps the app behind an Android app referrer', () => {
    expect(
      getExternalReferrer(
        'android-app://com.google.android.googlequicksearchbox/',
        ORIGIN
      )
    ).toBe('android-app://com.google.android.googlequicksearchbox/')
  })

  it('leaves out same-origin, empty and malformed referrers', () => {
    expect(
      getExternalReferrer('https://yearly.world/create?year=2026', ORIGIN)
    ).toBeUndefined()
    expect(getExternalReferrer('', ORIGIN)).toBeUndefined()
    expect(getExternalReferrer('not a url', ORIGIN)).toBeUndefined()
  })

  it('treats another subdomain as external', () => {
    expect(getExternalReferrer('https://www.yearly.world/', ORIGIN)).toBe(
      'https://www.yearly.world/'
    )
  })
})

describe('getUtmParams', () => {
  it('collects whichever UTM parameters are present', () => {
    expect(
      getUtmParams(
        '?utm_source=instagram&utm_medium=social&utm_campaign=year_end&ref=abc'
      )
    ).toEqual({ source: 'instagram', medium: 'social', campaign: 'year_end' })
  })

  it('reads content and term too', () => {
    expect(getUtmParams('utm_content=story&utm_term=travel+calendar')).toEqual({
      content: 'story',
      term: 'travel calendar',
    })
  })

  it('skips blank values and caps long ones', () => {
    expect(
      getUtmParams(`?utm_source=%20%20&utm_campaign=${'x'.repeat(300)}`)
    ).toEqual({ campaign: 'x'.repeat(200) })
  })

  it('returns nothing without UTM parameters', () => {
    expect(getUtmParams('')).toBeUndefined()
    expect(getUtmParams('?year=2026')).toBeUndefined()
  })
})

describe('getTrafficSource', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    window.history.replaceState(null, '', '/')
  })

  it('combines the referrer, UTM tags and the user agent', () => {
    const userAgent =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 356.0.0.24.77 (iPhone15,3; iOS 18_5; en_SG)'
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent)
    vi.spyOn(document, 'referrer', 'get').mockReturnValue(
      'https://l.instagram.com/?u=https%3A%2F%2Fyearly.world%2Fcreate'
    )
    window.history.replaceState(null, '', '/create?utm_source=ig&fbclid=123')

    expect(getTrafficSource()).toEqual({
      referrer: 'https://l.instagram.com/',
      utm: { source: 'ig' },
      inAppBrowser: 'Instagram',
      userAgent,
    })
  })

  it('leaves out what it does not know', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('')
    vi.spyOn(document, 'referrer', 'get').mockReturnValue('')

    expect(JSON.parse(JSON.stringify(getTrafficSource()))).toEqual({})
  })
})
