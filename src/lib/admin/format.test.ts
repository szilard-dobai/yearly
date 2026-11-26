import { describe, expect, it } from 'vitest'
import { TRACKING_EVENT_TYPES } from '@/lib/tracking/types'
import {
  EVENT_LABELS,
  EVENT_TYPES_BY_GROUP,
  formatLocation,
  formatMoney,
  formatRelativeTime,
  formatVideoPack,
  getCountryName,
  getEventLabel,
  getEventGroup,
  summarizeMetadata,
} from './format'

const NOW = new Date('2026-11-04T12:00:00Z').getTime()

describe('formatRelativeTime', () => {
  it.each([
    ['2026-11-04T11:59:30Z', 'just now'],
    ['2026-11-04T11:55:00Z', '5 minutes ago'],
    ['2026-11-04T09:00:00Z', '3 hours ago'],
    ['2026-11-03T12:00:00Z', 'yesterday'],
    ['2026-10-21T12:00:00Z', '2 weeks ago'],
    ['2025-11-04T12:00:00Z', 'last year'],
  ])('formats %s as "%s"', (date, expected) => {
    expect(formatRelativeTime(date, NOW)).toBe(expected)
  })
})

describe('summarizeMetadata', () => {
  it('returns an empty string without metadata', () => {
    expect(summarizeMetadata(undefined)).toBe('')
  })

  it('summarizes calendar data as a visit count', () => {
    expect(
      summarizeMetadata({
        year: 2026,
        calendarData: { visits: [{}, {}, {}] },
      })
    ).toBe('year: 2026 · calendarData: 3 visits')
  })

  it('truncates long nested values and skips empty ones', () => {
    const summary = summarizeMetadata({
      nested: { text: 'x'.repeat(100) },
      missing: null,
    })
    expect(summary.startsWith('nested: {"text":"')).toBe(true)
    expect(summary.endsWith('…')).toBe(true)
    expect(summary).not.toContain('missing')
  })
})

describe('getEventGroup', () => {
  it.each([
    ['create_page_view', 'pages'],
    ['visit_add_attempt', 'calendar'],
    ['monthly_export_click', 'exports'],
    ['animated_video_buy_click', 'videos'],
    ['acquisition_survey_answered', 'feedback'],
    ['year_end_reminder_email_submit', 'reminder'],
    ['sign_in_completed', 'accounts'],
    ['travel_nudge_plan_click', 'trips'],
    ['badge_unlocked', 'badges'],
    ['retired_event', 'other'],
  ])('puts %s in %s', (type, group) => {
    expect(getEventGroup(type)).toBe(group)
  })

  it('lists every tracked event under exactly one group', () => {
    const listed = EVENT_TYPES_BY_GROUP.flatMap(({ types }) => types)
    expect([...listed].sort()).toEqual([...TRACKING_EVENT_TYPES].sort())
    expect(EVENT_TYPES_BY_GROUP.every(({ types }) => types.length > 0)).toBe(
      true
    )
  })
})

describe('getEventLabel', () => {
  it('uses the readable label for known events', () => {
    expect(getEventLabel('visit_add_attempt')).toBe('Visit add attempted')
    expect(getEventLabel('image_export_click')).toBe('Calendar export clicked')
  })

  it('has a unique label for every tracked event type', () => {
    const labels = TRACKING_EVENT_TYPES.map((type) => EVENT_LABELS[type])
    expect(labels.every(Boolean)).toBe(true)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('humanizes event types it does not know', () => {
    expect(getEventLabel('legacy_share_click')).toBe('Legacy share click')
    expect(getEventLabel('toString')).toBe('ToString')
  })
})

describe('formatLocation', () => {
  it('shows the country and region', () => {
    expect(formatLocation('DE', 'BY')).toBe('DE / BY')
    expect(formatLocation('FR')).toBe('FR')
  })

  it('falls back when the country is unknown', () => {
    expect(formatLocation(undefined, 'BY')).toBe('Unknown')
    expect(formatLocation(undefined, undefined, '—')).toBe('—')
  })
})

describe('getCountryName', () => {
  it('returns the country name, or the code when it is not listed', () => {
    expect(getCountryName('DE')).toBe('Germany')
    expect(getCountryName('XX')).toBe('XX')
  })
})

describe('formatMoney', () => {
  it.each([
    [299, 'usd', '$2.99'],
    [598, 'USD', '$5.98'],
    [279, 'eur', '€2.79'],
    [0, 'usd', '$0.00'],
  ])('formats %i %s as "%s"', (cents, currency, expected) => {
    expect(formatMoney(cents, currency)).toBe(expected)
  })
})

describe('formatVideoPack', () => {
  it('names the year of a year pack', () => {
    expect(formatVideoPack({ pack: 'year', year: 2026, month: null })).toBe(
      'Year 2026'
    )
  })

  it('names the month of a month pack', () => {
    expect(formatVideoPack({ pack: 'month', year: 2026, month: 2 })).toBe(
      'March 2026'
    )
  })
})
