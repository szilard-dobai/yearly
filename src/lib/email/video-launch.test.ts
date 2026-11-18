import { describe, expect, it } from 'vitest'
import { getVideoLaunchLink, videoLaunchEmail } from './video-launch'

const OPTIONS = {
  freeUntil: '31 January 2027',
  unsubscribe: {
    page: 'https://www.yearly.world/unsubscribe?token=abc.def',
    oneClick: 'https://www.yearly.world/api/waitlist/unsubscribe?token=abc.def',
  },
}

describe('videoLaunchEmail', () => {
  it('asks mail apps for a one-click unsubscribe', () => {
    const email = videoLaunchEmail('ana@example.com', OPTIONS)

    expect(email.headers).toEqual({
      'List-Unsubscribe':
        '<https://www.yearly.world/api/waitlist/unsubscribe?token=abc.def>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    })
  })

  it('has an unsubscribe link in both versions', () => {
    const email = videoLaunchEmail('ana@example.com', OPTIONS)

    expect(email.text).toContain(
      'Unsubscribe: https://www.yearly.world/unsubscribe?token=abc.def'
    )
    expect(email.html).toContain(
      'href="https://www.yearly.world/unsubscribe?token=abc.def"'
    )
  })

  it('only delivers the free video the waitlist was promised, with nothing to buy', () => {
    const email = videoLaunchEmail('ana@example.com', OPTIONS)

    expect(email.subject).toBe('Your free Yearly video is ready')
    expect(email.text).toMatch(
      /^Your free video is ready\n\nYou saved a free video/
    )
    expect(`${email.subject}\n${email.text}`).not.toMatch(
      /[$€£]|price|buy|sale|discount|offer/i
    )
  })

  it('says which email to sign in with and until when the pack is free', () => {
    const email = videoLaunchEmail('ana@example.com', OPTIONS)

    expect(email.to).toBe('ana@example.com')
    expect(email.replyTo).toBe('hello@yearly.world')
    expect(email.text).toContain('sign in with ana@example.com')
    expect(email.text).toContain('until 31 January 2027')
    expect(email.text).toContain(getVideoLaunchLink())
  })

  it('escapes the address in the HTML', () => {
    const email = videoLaunchEmail('a<b>@example.com', OPTIONS)

    expect(email.html).not.toContain('<b>')
    expect(email.html).toContain('a&lt;b&gt;@example.com')
  })

  it('links to the create page with campaign tags', () => {
    expect(getVideoLaunchLink('https://www.yearly.world/')).toBe(
      'https://www.yearly.world/create?utm_source=waitlist&utm_medium=email&utm_campaign=video_launch'
    )
  })
})
