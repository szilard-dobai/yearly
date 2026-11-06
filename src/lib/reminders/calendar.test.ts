import { describe, expect, it } from 'vitest'
import {
  buildGoogleCalendarUrl,
  buildReminderIcs,
  escapeIcsText,
  foldIcsLine,
  getReminderLink,
  shouldOfferYearEndReminder,
} from './calendar'

const SITE_URL = 'https://yearly.world'
const LINK =
  'https://yearly.world/create?utm_source=reminder&utm_medium=calendar&utm_campaign=year_end_2026'

function unfold(ics: string) {
  return ics.replace(/\r\n /g, '').split('\r\n')
}

describe('shouldOfferYearEndReminder', () => {
  it('offers the reminder for the current year until the end of 30 Nov', () => {
    expect(shouldOfferYearEndReminder(2026, new Date(2026, 0, 1))).toBe(true)
    expect(shouldOfferYearEndReminder(2026, new Date(2026, 10, 7))).toBe(true)
    expect(
      shouldOfferYearEndReminder(2026, new Date(2026, 10, 30, 23, 59, 59, 999))
    ).toBe(true)
  })

  it('stops offering it from 1 Dec', () => {
    expect(shouldOfferYearEndReminder(2026, new Date(2026, 11, 1))).toBe(false)
    expect(shouldOfferYearEndReminder(2026, new Date(2026, 11, 31, 18))).toBe(
      false
    )
  })

  it('does not offer it for other years', () => {
    const now = new Date(2026, 10, 7)
    expect(shouldOfferYearEndReminder(2025, now)).toBe(false)
    expect(shouldOfferYearEndReminder(2027, now)).toBe(false)
  })
})

describe('getReminderLink', () => {
  it('links to the create page with the campaign for the year', () => {
    expect(getReminderLink(2026, SITE_URL)).toBe(LINK)
    expect(getReminderLink(2026, `${SITE_URL}/`)).toBe(LINK)
  })
})

describe('escapeIcsText', () => {
  it('escapes backslashes, semicolons, commas and newlines', () => {
    expect(escapeIcsText('a\\b; c, d\ne\r\nf')).toBe('a\\\\b\\; c\\, d\\ne\\nf')
  })
})

describe('foldIcsLine', () => {
  it('leaves short lines alone', () => {
    expect(foldIcsLine('SUMMARY:Short')).toBe('SUMMARY:Short')
  })

  it('folds at 75 octets without splitting a character', () => {
    const line = `${'x'.repeat(74)}é${'y'.repeat(80)}`
    const folded = foldIcsLine(line)
    const parts = folded.split('\r\n')

    expect(parts[0]).toBe('x'.repeat(74))
    expect(parts[1].startsWith(' é')).toBe(true)
    for (const part of parts) {
      expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75)
    }
    expect(folded.replace(/\r\n /g, '')).toBe(line)
  })
})

describe('buildReminderIcs', () => {
  const ics = buildReminderIcs(
    2026,
    SITE_URL,
    new Date(Date.UTC(2026, 10, 7, 9, 30, 15))
  )
  const lines = unfold(ics)

  it('uses CRLF line endings throughout', () => {
    expect(ics.endsWith('\r\n')).toBe(true)
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/)
  })

  it('keeps every physical line within 75 octets', () => {
    for (const line of ics.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    }
  })

  it('wraps a single event in a calendar', () => {
    expect(lines[0]).toBe('BEGIN:VCALENDAR')
    expect(lines).toContain('VERSION:2.0')
    expect(lines).toContain('BEGIN:VEVENT')
    expect(lines).toContain('UID:year-end-2026@yearly.world')
    expect(lines.at(-2)).toBe('END:VCALENDAR')
  })

  it('runs from 10:00 to 10:15 on 1 Dec in floating local time', () => {
    expect(lines).toContain('DTSTART:20261201T100000')
    expect(lines).toContain('DTEND:20261201T101500')
    expect(ics).not.toContain('TZID')
    expect(ics).not.toContain('VTIMEZONE')
  })

  it('stamps the file in UTC', () => {
    expect(lines).toContain('DTSTAMP:20261107T093015Z')
  })

  it('alarms when the event starts', () => {
    const alarm = lines.slice(
      lines.indexOf('BEGIN:VALARM'),
      lines.indexOf('END:VALARM') + 1
    )
    expect(alarm).toEqual([
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:Time for your 2026 Yearly',
      'TRIGGER:PT0M',
      'END:VALARM',
    ])
    expect(lines.indexOf('END:VALARM')).toBeLessThan(
      lines.indexOf('END:VEVENT')
    )
  })

  it('describes the event and links back to Yearly', () => {
    expect(lines).toContain('SUMMARY:Time for your 2026 Yearly')
    expect(lines).toContain(
      `DESCRIPTION:Year-in-review season is here. Add your latest trips\\, then share your 2026 Yearly: ${LINK}`
    )
    expect(lines).toContain(`URL:${LINK}`)
  })
})

describe('buildGoogleCalendarUrl', () => {
  it('prefills a Google Calendar event with the same details', () => {
    const url = new URL(buildGoogleCalendarUrl(2026, SITE_URL))

    expect(`${url.origin}${url.pathname}`).toBe(
      'https://calendar.google.com/calendar/render'
    )
    expect(Object.fromEntries(url.searchParams)).toEqual({
      action: 'TEMPLATE',
      text: 'Time for your 2026 Yearly',
      dates: '20261201T100000/20261201T101500',
      details: `Year-in-review season is here. Add your latest trips, then share your 2026 Yearly: ${LINK}`,
    })
  })
})
