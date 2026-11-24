// @vitest-environment node
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { EMAIL_LOGO_URL } from './layout'
import { signInCodeEmail } from './sign-in-code'
import { videoLaunchEmail } from './video-launch'
import { yearEndReminderEmail } from './year-end-reminder'

const emails = {
  'sign-in code': signInCodeEmail('ana@example.com', '482913'),
  'year-end reminder': yearEndReminderEmail('ana@example.com', 2026),
  'video launch': videoLaunchEmail('ana@example.com', {
    freeUntil: '31 January 2027',
    unsubscribe: {
      page: 'https://www.yearly.world/unsubscribe?token=abc.def',
      oneClick:
        'https://www.yearly.world/api/waitlist/unsubscribe?token=abc.def',
    },
  }),
}

describe('email layout', () => {
  it.each(Object.entries(emails))(
    'shows the same logo to everyone in the %s email and no other image',
    (_, email) => {
      const images = [...email.html.matchAll(/<img[^>]*src="([^"]+)"/g)]

      expect(images.map((image) => image[1])).toEqual([EMAIL_LOGO_URL])
      expect(email.html.match(/<img/g)).toHaveLength(1)
    }
  )

  it('serves the logo from public, where sent emails keep loading it', () => {
    const { pathname } = new URL(EMAIL_LOGO_URL)

    expect(existsSync(join(process.cwd(), 'public', pathname))).toBe(true)
  })
})
