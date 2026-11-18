// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createUnsubscribeToken,
  getUnsubscribeUrls,
  isUnsubscribeConfigured,
  readUnsubscribeToken,
} from './unsubscribe'

const ID = '6560f1a2b3c4d5e6f7a8b9c0'

describe('waitlist unsubscribe tokens', () => {
  beforeEach(() => {
    vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('reads back the waitlist ID it signed', () => {
    const token = createUnsubscribeToken(ID)

    expect(token.startsWith(`${ID}.`)).toBe(true)
    expect(readUnsubscribeToken(token)).toBe(ID)
  })

  it('rejects a token for another ID or with a changed signature', () => {
    const [, signature] = createUnsubscribeToken(ID).split('.')
    const otherId = 'aaaaaaaaaaaaaaaaaaaaaaaa'
    const flipped =
      signature[0] === 'A' ? `B${signature.slice(1)}` : `A${signature.slice(1)}`

    expect(readUnsubscribeToken(`${otherId}.${signature}`)).toBeNull()
    expect(readUnsubscribeToken(`${ID}.${flipped}`)).toBeNull()
  })

  it('rejects tokens signed with another secret', () => {
    const token = createUnsubscribeToken(ID)
    vi.stubEnv('BETTER_AUTH_SECRET', 'rotated-secret')

    expect(readUnsubscribeToken(token)).toBeNull()
  })

  it('rejects anything that is not a token', () => {
    expect(readUnsubscribeToken(null)).toBeNull()
    expect(readUnsubscribeToken('')).toBeNull()
    expect(readUnsubscribeToken(ID)).toBeNull()
    expect(readUnsubscribeToken(`${ID}.short`)).toBeNull()
  })

  it('works only when the secret is set', () => {
    const token = createUnsubscribeToken(ID)
    vi.stubEnv('BETTER_AUTH_SECRET', '')

    expect(isUnsubscribeConfigured()).toBe(false)
    expect(readUnsubscribeToken(token)).toBeNull()
    expect(() => createUnsubscribeToken(ID)).toThrow()
  })

  it('builds the page and one-click links without the email address', () => {
    const urls = getUnsubscribeUrls('abc.def', 'https://www.yearly.world/')

    expect(urls).toEqual({
      page: 'https://www.yearly.world/unsubscribe?token=abc.def',
      oneClick:
        'https://www.yearly.world/api/waitlist/unsubscribe?token=abc.def',
    })
  })
})
