import { describe, expect, it } from 'vitest'
import { yearEndReminderEmail } from './year-end-reminder'

const LINK =
  'https://www.yearly.world/create?utm_source=reminder&utm_medium=email&utm_campaign=year_end_2026'

const email = () => yearEndReminderEmail('ana@example.com', 2026)

function visibleText(html: string) {
  return html
    .replace(/<head>[\s\S]*<\/head>/, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
}

describe('yearEndReminderEmail', () => {
  it('goes to the person with replies to hello@yearly.world', () => {
    const message = email()

    expect(message.to).toBe('ana@example.com')
    expect(message.replyTo).toBe('hello@yearly.world')
  })

  it('names the reminder and the year in the subject', () => {
    expect(email().subject).toBe(
      'Your 1 Dec reminder to share your 2026 Yearly'
    )
    expect(yearEndReminderEmail('ana@example.com', 2027).subject).toBe(
      'Your 1 Dec reminder to share your 2027 Yearly'
    )
  })

  it('links to the create page with the email campaign in both parts', () => {
    const message = email()

    expect(message.text).toContain(LINK)
    expect(message.html).toContain(`href="${LINK.replace(/&/g, '&amp;')}"`)
    expect(message.html.match(/href="https:/g)).toHaveLength(1)
  })

  it('says why it was sent, where the trips are and that it is the only one', () => {
    const message = email()

    for (const body of [message.text, visibleText(message.html)]) {
      expect(body).toContain('You asked us on yearly.world to remind you')
      expect(body).toContain('saved in the browser where you added them')
      expect(body).toContain('This is the only reminder email')
      expect(body).toContain('at the end of 2026')
      expect(body).toContain('hello@yearly.world')
    }
  })

  it('says signing in shows the trips on other devices', () => {
    expect(email().text).toContain('If you sign in there')
    expect(email().html).toContain('If you sign in there')
  })

  it('never puts the address in the body', () => {
    const message = email()

    expect(message.text).not.toContain('ana@example.com')
    expect(message.html).not.toContain('ana@example.com')
  })

  it('keeps the plain-text part free of markup', () => {
    const { text } = email()

    expect(text).not.toMatch(/[<>]|&amp;|&#39;|&nbsp;|undefined|\$\{/)
  })

  it('keeps the HTML small, with no leftover placeholders', () => {
    const { html } = email()

    expect(html).not.toMatch(/undefined|\$\{|false|true/)
    expect(new TextEncoder().encode(html).length).toBeLessThan(6 * 1024)
  })
})
