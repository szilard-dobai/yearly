import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildFeedbackSlackMessage, notifyFeedbackToSlack } from './slack'

const feedback = {
  rating: 4,
  message: 'Love it! <!channel> & more',
  source: 'post_export' as const,
  context: { exportType: 'calendar' as const, year: 2026 },
  deviceType: 'mobile' as const,
  country: 'DE',
  region: 'BY',
}

describe('buildFeedbackSlackMessage', () => {
  it('shows the rating, message and where the feedback came from', () => {
    const message = buildFeedbackSlackMessage(
      feedback,
      'created',
      'https://yearly.example/'
    )

    expect(message.blocks).toEqual([
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '*New feedback*  ★★★★☆' },
      },
      {
        type: 'section',
        text: {
          type: 'plain_text',
          text: 'Love it! <!channel> & more',
          emoji: true,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '🇩🇪 Germany (BY) · mobile · After export (calendar 2026) · <https://yearly.example/admin/feedback|Open in admin>',
          },
        ],
      },
    ])
  })

  it('escapes the message in the notification text', () => {
    const { text } = buildFeedbackSlackMessage(feedback, 'created')

    expect(text).toBe(
      'New feedback: ★★★★☆ – “Love it! &lt;!channel&gt; &amp; more”'
    )
  })

  it('handles feedback without a rating, message or location', () => {
    const message = buildFeedbackSlackMessage(
      {
        rating: null,
        message: 'a'.repeat(200),
        source: 'feedback_button',
      },
      'message_added'
    )

    expect(message.text).toBe(
      `Details added to feedback: No rating – “${'a'.repeat(119)}…”`
    )
    expect(message.blocks[2]).toEqual({
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: 'Unknown location · Feedback button' },
      ],
    })
  })

  it('leaves out the message block when there is no message', () => {
    const message = buildFeedbackSlackMessage(
      { ...feedback, message: null },
      'created'
    )

    expect(message.blocks).toHaveLength(2)
    expect(message.text).toBe('New feedback: ★★★★☆')
  })

  it('lists quick-reply tags and previews them when there is no message', () => {
    const message = buildFeedbackSlackMessage(
      { ...feedback, message: null, tags: ['design', 'easy_to_use'] },
      'message_added'
    )

    expect(message.text).toBe(
      'Details added to feedback: ★★★★☆ – Looks great, Easy to use'
    )
    expect(message.blocks[1]).toEqual({
      type: 'section',
      text: { type: 'mrkdwn', text: '`Looks great`  `Easy to use`' },
    })
  })
})

describe('notifyFeedbackToSlack', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('does nothing when no webhook is configured', async () => {
    vi.stubEnv('SLACK_FEEDBACK_WEBHOOK_URL', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await notifyFeedbackToSlack(feedback, 'created')

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts the message to the webhook', async () => {
    vi.stubEnv('SLACK_FEEDBACK_WEBHOOK_URL', 'https://hooks.slack.test/abc')
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'))
    vi.stubGlobal('fetch', fetchMock)

    await notifyFeedbackToSlack(feedback, 'created')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://hooks.slack.test/abc',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    )
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.blocks[0].text.text).toBe('*New feedback*  ★★★★☆')
  })

  it('logs instead of throwing when Slack fails', async () => {
    vi.stubEnv('SLACK_FEEDBACK_WEBHOOK_URL', 'https://hooks.slack.test/abc')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('no_service', { status: 404 }))
    )

    await expect(
      notifyFeedbackToSlack(feedback, 'created')
    ).resolves.toBeUndefined()
    expect(consoleError).toHaveBeenCalledWith(
      'Slack feedback notification failed:',
      404,
      'no_service'
    )

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')))
    await expect(
      notifyFeedbackToSlack(feedback, 'created')
    ).resolves.toBeUndefined()
  })
})
