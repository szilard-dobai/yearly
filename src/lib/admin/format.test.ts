import { describe, expect, it } from 'vitest'
import { formatRelativeTime, getEventTone, summarizeMetadata } from './format'

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
