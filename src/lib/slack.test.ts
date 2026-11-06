import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  escapeSlackText,
  formatSlackLocation,
  postSlackMessage,
  slackAdminLink,
} from './slack'

describe('escapeSlackText', () => {
  it('escapes the characters Slack treats as markup', () => {
    expect(escapeSlackText('<!here> & <@U123>')).toBe(
      '&lt;!here&gt; &amp; &lt;@U123&gt;'
    )
  })
})

describe('formatSlackLocation', () => {
  it('shows the flag, country name and region', () => {
    expect(formatSlackLocation('DE', 'BY')).toBe('🇩🇪 Germany (BY)')
    expect(formatSlackLocation('DE')).toBe('🇩🇪 Germany')
    expect(formatSlackLocation()).toBe('Unknown location')
  })
})

describe('slackAdminLink', () => {
  it('links to the admin page when the site URL is known', () => {
    expect(slackAdminLink('/admin/analytics', 'https://yearly.world/')).toBe(
      ' · <https://yearly.world/admin/analytics|Open in admin>'
    )
    expect(slackAdminLink('/admin/analytics')).toBe('')
  })
})

describe('postSlackMessage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('logs instead of throwing when Slack fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')))

    await expect(
      postSlackMessage(
        'https://hooks.slack.test/abc',
        { text: 'hi', blocks: [] },
        'waitlist'
      )
    ).resolves.toBeUndefined()
    expect(consoleError).toHaveBeenCalledWith(
      'Slack waitlist notification failed:',
      expect.any(Error)
    )
  })
})
