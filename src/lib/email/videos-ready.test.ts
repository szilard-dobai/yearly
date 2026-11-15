import { describe, expect, it } from 'vitest'
import { videosReadyEmail } from './videos-ready'

const ACCOUNT = 'https://www.yearly.world/account'

describe('videosReadyEmail', () => {
  it('links to the account in both versions', () => {
    const email = videosReadyEmail('ana@example.com', {
      accountUrl: ACCOUNT,
      updated: false,
      confirmConsent: false,
    })

    expect(email.to).toBe('ana@example.com')
    expect(email.subject).toBe('Your Yearly videos are ready')
    expect(email.text).toContain(ACCOUNT)
    expect(email.html).toContain(`href="${ACCOUNT}"`)
  })

  it('confirms the consent to immediate delivery after a purchase', () => {
    const email = videosReadyEmail('ana@example.com', {
      accountUrl: ACCOUNT,
      updated: false,
      confirmConsent: true,
    })

    for (const body of [email.text, email.html]) {
      expect(body).toContain('make your videos right away')
      expect(body).toContain('14-day right to cancel has ended')
    }
  })

  it("doesn't mention the right to cancel otherwise", () => {
    const email = videosReadyEmail('ana@example.com', {
      accountUrl: ACCOUNT,
      updated: true,
      confirmConsent: false,
    })

    expect(email.subject).toBe('Your updated Yearly videos are ready')
    expect(email.text).not.toContain('right to cancel')
  })
})
