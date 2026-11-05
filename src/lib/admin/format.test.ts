import { describe, expect, it } from 'vitest'
import { TRACKING_EVENT_TYPES } from '@/lib/tracking/types'
import {
  EVENT_LABELS,
  formatLocation,
  formatRelativeTime,
  getCountryName,
  getEventLabel,
  getEventTone,
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

describe('getEventTone', () => {
  it.each([
    ['create_page_view', 'view'],
    ['image_download_click', 'export'],
    ['monthly_export_click', 'export'],
    ['feedback_submitted', 'feedback'],
    ['visit_add_attempt', 'edit'],
    ['year_changed', 'other'],
  ])('classifies %s as %s', (type, tone) => {
    expect(getEventTone(type)).toBe(tone)
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
  it('shows the flag, country and region', () => {
    expect(formatLocation('DE', 'BY')).toBe('🇩🇪 DE / BY')
    expect(formatLocation('FR')).toBe('🇫🇷 FR')
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
