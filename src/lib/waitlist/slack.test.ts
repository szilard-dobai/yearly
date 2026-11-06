import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildWaitlistSlackMessage, notifyWaitlistToSlack } from './slack'

const signup = {
  context: {
    exportType: 'calendar' as const,
    videoKind: 'year' as const,
    year: 2026,
    price: 2.99,
  },
  deviceType: 'mobile' as const,
  country: 'RO',
  region: 'CJ',
}

describe('buildWaitlistSlackMessage', () => {
  it('shows the running total, price, video and location', () => {
    const message = buildWaitlistSlackMessage(
      signup,
      12,
      'https://yearly.world'
    )

    expect(message.text).toBe('New video waitlist sign-up (12 total)')
    expect(JSON.stringify(message.blocks)).toContain(
      'Saw $2.99 · on the year video · 🇷🇴 Romania (CJ) · mobile · <https://yearly.world/admin/analytics|Open in admin>'
    )
  })

  it('names the month video', () => {
    const message = buildWaitlistSlackMessage(
      {
        ...signup,
        context: {
          exportType: 'monthly',
          videoKind: 'month',
          year: 2026,
          month: 10,
          price: 1.99,
        },
      },
      3
    )

    expect(JSON.stringify(message.blocks)).toContain(
      'Saw $1.99 · on the month video'
    )
  })

  it('skips details it does not have', () => {
    const message = buildWaitlistSlackMessage({}, 1)

    expect(JSON.stringify(message.blocks)).toContain(
      '"text":"Unknown location"'
    )
  })
})

describe('notifyWaitlistToSlack', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('does nothing when no webhook is configured', async () => {
    vi.stubEnv('SLACK_FEEDBACK_WEBHOOK_URL', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await notifyWaitlistToSlack(signup, 1)

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts to the same webhook as feedback', async () => {
    vi.stubEnv('SLACK_FEEDBACK_WEBHOOK_URL', 'https://hooks.slack.test/feed')
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'))
    vi.stubGlobal('fetch', fetchMock)

    await notifyWaitlistToSlack(signup, 1)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://hooks.slack.test/feed',
      expect.objectContaining({ method: 'POST' })
    )
  })
})
