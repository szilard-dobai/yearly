import { REMINDER_DATE } from './date'

const START_HOUR = 10
const DURATION_MINUTES = 15
const MAX_LINE_OCTETS = 75

const utf8 = new TextEncoder()

export function shouldOfferYearEndReminder(
  year: number,
  now = new Date()
): boolean {
  return (
    year === now.getFullYear() &&
    now < new Date(year, REMINDER_DATE.monthIndex, REMINDER_DATE.day)
  )
}

export function getReminderLink(year: number, siteUrl: string): string {
  const params = new URLSearchParams({
    utm_source: 'reminder',
    utm_medium: 'calendar',
    utm_campaign: `year_end_${year}`,
  })
  return `${siteUrl.replace(/\/+$/, '')}/create?${params}`
}

const pad = (value: number) => String(value).padStart(2, '0')

function formatFloating(year: number, minutesAfterStart: number): string {
  const minutes = START_HOUR * 60 + minutesAfterStart
  return `${year}${pad(REMINDER_DATE.monthIndex + 1)}${pad(REMINDER_DATE.day)}T${pad(Math.floor(minutes / 60))}${pad(minutes % 60)}00`
}

function formatUtc(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
}

function reminderEvent(year: number, siteUrl: string) {
  const url = getReminderLink(year, siteUrl)
  return {
    title: `Time for your ${year} Yearly`,
    description: `Year-in-review season is here. Add your latest trips, then share your ${year} Yearly: ${url}`,
    url,
    start: formatFloating(year, 0),
    end: formatFloating(year, DURATION_MINUTES),
  }
}

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

export function foldIcsLine(line: string): string {
  const parts: string[] = []
  let current = ''
  let octets = 0
  for (const char of line) {
    const size = utf8.encode(char).length
    const limit = parts.length === 0 ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1
    if (octets + size > limit) {
      parts.push(current)
      current = ''
      octets = 0
    }
    current += char
    octets += size
  }
  parts.push(current)
  return parts.join('\r\n ')
}

export function buildReminderIcs(
  year: number,
  siteUrl: string,
  now = new Date()
): string {
  const event = reminderEvent(year, siteUrl)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Yearly//Year-end reminder//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:year-end-${year}@${new URL(siteUrl).hostname}`,
    `DTSTAMP:${formatUtc(now)}`,
    `DTSTART:${event.start}`,
    `DTEND:${event.end}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    `URL:${event.url}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText(event.title)}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`
}

export function buildGoogleCalendarUrl(year: number, siteUrl: string): string {
  const event = reminderEvent(year, siteUrl)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${event.start}/${event.end}`,
    details: event.description,
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

export function downloadReminderIcs(year: number, siteUrl: string): void {
  const blob = new Blob([buildReminderIcs(year, siteUrl)], {
    type: 'text/calendar;charset=utf-8',
  })
  const href = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = href
  link.download = `yearly-reminder-${year}.ics`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}
