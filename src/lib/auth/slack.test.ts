import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildSignUpSlackMessage,
  getSignUpMethod,
  notifySignUpToSlack,
} from './slack'

describe('getSignUpMethod', () => {
  it('tells an email code from Google by the route and its provider', () => {
    expect(getSignUpMethod({ path: '/sign-in/email-otp' })).toBe('email')
    expect(
      getSignUpMethod({ path: '/callback/:id', params: { id: 'google' } })
    ).toBe('google')
    expect(
      getSignUpMethod({ path: '/callback/:id', params: { id: 'github' } })
    ).toBeNull()
    expect(getSignUpMethod({ path: '/sign-in/social' })).toBeNull()
    expect(getSignUpMethod(null)).toBeNull()
  })
})

describe('buildSignUpSlackMessage', () => {
  it('shows the running total, how they signed up and the country', () => {
    const message = buildSignUpSlackMessage(
      { method: 'google', country: 'RO' },
      12
    )

    expect(message.text).toBe('New account (12 total)')
    expect(JSON.stringify(message.blocks)).toContain(
      '"text":"Signed up with Google · 🇷🇴 Romania"'
    )
  })

  it('says what it does not know', () => {
    const message = buildSignUpSlackMessage({ method: null }, 1)

    expect(JSON.stringify(message.blocks)).toContain(
      '"text":"Sign-up method unknown · Unknown location"'
    )
  })

  it('escapes Slack markup from request headers', () => {
    const message = buildSignUpSlackMessage(
      { method: 'email', country: '<!here>' },
      1
    )

    expect(JSON.stringify(message.blocks)).toContain('&lt;!here&gt;')
    expect(JSON.stringify(message.blocks)).not.toContain('<!here>')
  })
})

describe('notifySignUpToSlack', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('does nothing, not even counting, when no webhook is configured', async () => {
    vi.stubEnv('SLACK_FEEDBACK_WEBHOOK_URL', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const countAccounts = vi.fn()

    await notifySignUpToSlack({ method: 'email' }, countAccounts)

    expect(countAccounts).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts to the same webhook as feedback', async () => {
    vi.stubEnv('SLACK_FEEDBACK_WEBHOOK_URL', 'https://hooks.slack.test/feed')
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'))
    vi.stubGlobal('fetch', fetchMock)

    await notifySignUpToSlack({ method: 'email' }, async () => 3)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://hooks.slack.test/feed',
      expect.objectContaining({ method: 'POST' })
    )
    const body = fetchMock.mock.calls[0][1].body as string
    expect(body).toContain('New account (3 total)')
    expect(body).toContain('Signed up with an email code')
  })
})
