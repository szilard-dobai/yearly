import { describe, expect, it } from 'vitest'
import { SIGN_IN_LINK_MINUTES, signInLinkEmail } from './sign-in-link'

const LINK =
  'https://yearly.world/api/auth/magic-link/verify?token=abc&callbackURL=%2Faccount'

describe('signInLinkEmail', () => {
  it('addresses the email and puts the link in both versions', () => {
    const email = signInLinkEmail('ana@example.com', LINK)

    expect(email.to).toBe('ana@example.com')
    expect(email.subject).toBe('Your Yearly sign-in link')
    expect(email.text).toContain(LINK)
    expect(email.html).toContain(`href="${LINK.replace('&', '&amp;')}"`)
  })

  it('says how long the link lasts', () => {
    const email = signInLinkEmail('ana@example.com', LINK)

    expect(email.text).toContain(`${SIGN_IN_LINK_MINUTES} minutes`)
    expect(email.html).toContain(`${SIGN_IN_LINK_MINUTES} minutes`)
  })

  it('escapes the link in the HTML', () => {
    const email = signInLinkEmail(
      'ana@example.com',
      'https://yearly.world/?a=1&b="><script>'
    )

    expect(email.html).toContain('a=1&amp;b=&quot;&gt;&lt;script&gt;')
    expect(email.html).not.toContain('<script>')
  })
})
