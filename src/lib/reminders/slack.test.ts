import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReminderSendResult } from './send'
import {
  buildReminderSendSlackMessage,
  buildReminderSlackMessage,
  notifyReminderToSlack,
} from './slack'

const reminder = {
  method: 'email' as const,
  deviceType: 'mobile' as const,
  country: 'SG',
}
const totals = { emails: 12, calendarAdds: 30 }

function contextText(message: ReturnType<typeof buildReminderSlackMessage>) {
  const context = message.blocks[1] as { elements: { text: string }[] }
  return context.elements[0].text
}

describe('buildReminderSlackMessage', () => {
  it('names the country, method, device and running totals', () => {
    const message = buildReminderSlackMessage(
      reminder,
      totals,
      'https://yearly.world'
    )

    expect(message.text).toBe(
      'Someone from 🇸🇬 Singapore set a reminder by email'
    )
    expect(message.blocks[0]).toEqual({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Someone from 🇸🇬 Singapore set a reminder by email*',
      },
    })
    expect(contextText(message)).toBe(
      'mobile · 12 email reminders, 30 calendar adds so far · <https://yearly.world/admin/analytics|Open in admin>'
    )
  })

  it.each([
    ['ics', 'in their Apple or Outlook calendar'],
    ['google', 'in Google Calendar'],
  ] as const)('describes a %s calendar add', (method, label) => {
    const message = buildReminderSlackMessage({ ...reminder, method }, totals)

    expect(message.text).toBe(
      `Someone from 🇸🇬 Singapore set a reminder ${label}`
    )
  })

  it('uses the singular and skips details it does not have', () => {
    const message = buildReminderSlackMessage(
      { method: 'google' },
      { emails: 1, calendarAdds: 1 }
    )

    expect(message.text).toBe('Someone set a reminder in Google Calendar')
    expect(contextText(message)).toBe('1 email reminder, 1 calendar add so far')
  })

  it('escapes Slack markup from request headers', () => {
    const message = buildReminderSlackMessage(
      { ...reminder, country: '<!here>' },
      totals
    )

    expect(message.text).toContain('&lt;!here&gt;')
  })
})

describe('notifyReminderToSlack', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('does nothing when no webhook is configured', async () => {
    vi.stubEnv('SLACK_FEEDBACK_WEBHOOK_URL', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await notifyReminderToSlack(reminder, totals)

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts to the same webhook as feedback', async () => {
    vi.stubEnv('SLACK_FEEDBACK_WEBHOOK_URL', 'https://hooks.slack.test/feed')
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'))
    vi.stubGlobal('fetch', fetchMock)

    await notifyReminderToSlack(reminder, totals)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://hooks.slack.test/feed',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('does not throw when Slack is down', async () => {
    vi.stubEnv('SLACK_FEEDBACK_WEBHOOK_URL', 'https://hooks.slack.test/feed')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')))

    await expect(
      notifyReminderToSlack(reminder, totals)
    ).resolves.toBeUndefined()
  })
})

describe('buildReminderSendSlackMessage', () => {
  const result: ReminderSendResult = {
    year: 2026,
    total: 120,
    alreadySent: 0,
    sentNow: 80,
    failed: 2,
    left: 40,
    needsCheck: 1,
    stopped: 'time',
    lastError: 'validation_error',
  }

  it('reports the counts, why it stopped and what started it', () => {
    const message = buildReminderSendSlackMessage(
      result,
      'cron',
      'https://yearly.world'
    )

    expect(message.text).toBe('Sent 80 year-end reminder emails, 2 failed')
    expect(contextText(message)).toBe(
      '2026 · 80 of 120 sent, 40 left · 1 to check by hand · Stopped at its time limit; the next run carries on · last error validation_error · by the cron · <https://yearly.world/admin/analytics|Open in admin>'
    )
  })

  it('keeps a clean run short', () => {
    const message = buildReminderSendSlackMessage(
      {
        ...result,
        sentNow: 1,
        failed: 0,
        left: 0,
        needsCheck: 0,
        stopped: 'done',
        lastError: undefined,
      },
      'admin'
    )

    expect(message.text).toBe('Sent 1 year-end reminder email')
    expect(contextText(message)).toBe(
      '2026 · 120 of 120 sent, 0 left · from admin'
    )
  })
})
