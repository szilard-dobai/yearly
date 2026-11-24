import { afterEach, describe, expect, it } from 'vitest'
import {
  decodeVideoResume,
  encodeVideoResume,
  readVideoReturn,
  removeVideoReturnParams,
  scrubPrivateParams,
  stripCheckoutToken,
  videoResumePath,
} from './checkout-return'

describe('checkout return', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it("strips Polar's session token from the address bar and keeps the rest", () => {
    window.history.replaceState(
      { kept: true },
      '',
      '/create?video_order=abc-123&customer_session_token=secret&utm_source=x#top'
    )

    stripCheckoutToken()

    expect(window.location.pathname).toBe('/create')
    expect(window.location.search).toBe('?video_order=abc-123&utm_source=x')
    expect(window.location.hash).toBe('#top')
    expect(window.location.href).not.toContain('secret')
    expect(window.history.state).toEqual({ kept: true })
  })

  it('leaves the address bar alone without a token', () => {
    window.history.replaceState(null, '', '/create?utm_source=x')
    const before = window.history.length

    stripCheckoutToken()

    expect(window.location.search).toBe('?utm_source=x')
    expect(window.history.length).toBe(before)
  })

  it('removes the order, offer and resume parameters once they are read', () => {
    window.history.replaceState(
      null,
      '',
      '/create?video_order=abc&video_offer=abc&video=year-dark-2026&utm_source=x'
    )

    removeVideoReturnParams()

    expect(window.location.search).toBe('?utm_source=x')
  })

  it('scrubs the token and order from analytics URLs', () => {
    expect(
      scrubPrivateParams(
        'https://www.yearly.world/create?video_order=abc&customer_session_token=secret&utm_source=x'
      )
    ).toBe('https://www.yearly.world/create?utm_source=x')
    expect(
      scrubPrivateParams('https://www.yearly.world/create?video_offer=abc')
    ).toBe('https://www.yearly.world/create')
    expect(scrubPrivateParams('https://www.yearly.world/create')).toBe(
      'https://www.yearly.world/create'
    )
    expect(scrubPrivateParams('not a url')).toBe('not a url')
  })

  it('reads an order return before a sign-in return', () => {
    expect(readVideoReturn('?video_order=4d4eee76-785c-408e')).toEqual({
      type: 'order',
      orderId: '4d4eee76-785c-408e',
    })
    expect(readVideoReturn('?video=stats-light-2025')).toEqual({
      type: 'resume',
      resume: { kind: 'stats', theme: 'light', year: 2025 },
    })
    expect(readVideoReturn('?video_offer=4d4eee76-785c-408e')).toEqual({
      type: 'offer',
      orderId: '4d4eee76-785c-408e',
    })
    expect(readVideoReturn('?video_offer=a/b')).toBeNull()
    expect(readVideoReturn('?video_order=../../etc')).toBeNull()
    expect(readVideoReturn('?video=nonsense')).toBeNull()
    expect(readVideoReturn('')).toBeNull()
  })

  it('round-trips the dialog state through the sign-in return path', () => {
    const month = {
      kind: 'month',
      theme: 'dark',
      year: 2026,
      month: 2,
    } as const
    expect(encodeVideoResume(month)).toBe('month-dark-2026-03')
    expect(decodeVideoResume('month-dark-2026-03')).toEqual(month)
    expect(videoResumePath({ kind: 'year', theme: 'light', year: 2026 })).toBe(
      '/create?video=year-light-2026'
    )
    expect(decodeVideoResume('month-dark-2026-13')).toBeNull()
  })
})
