const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['week', 7 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
]

const relativeTimeFormat = new Intl.RelativeTimeFormat('en', {
  numeric: 'auto',
})

export function formatRelativeTime(value: string | Date, now: number): string {
  const diff = new Date(value).getTime() - now
  for (const [unit, ms] of RELATIVE_UNITS) {
    if (Math.abs(diff) >= ms) {
      return relativeTimeFormat.format(Math.round(diff / ms), unit)
    }
  }
  return 'just now'
}

export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function shortDeviceId(deviceId: string): string {
  return deviceId.slice(0, 8)
}

function summarizeValue(key: string, value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (key === 'calendarData' && typeof value === 'object') {
    const visits = (value as { visits?: unknown[] }).visits
    return Array.isArray(visits) ? `${visits.length} visits` : null
  }
  if (typeof value === 'object') {
    const json = JSON.stringify(value)
    return json.length > 40 ? `${json.slice(0, 40)}…` : json
  }
  return String(value)
}

export function summarizeMetadata(
  metadata: Record<string, unknown> | undefined | null
): string {
  if (!metadata) return ''
  return Object.entries(metadata)
    .map(([key, value]) => {
      const summary = summarizeValue(key, value)
      return summary === null ? null : `${key}: ${summary}`
    })
    .filter(Boolean)
    .join(' · ')
}

export type EventTone = 'view' | 'export' | 'feedback' | 'edit' | 'other'

export function getEventTone(type: string): EventTone {
  if (type.startsWith('feedback_')) return 'feedback'
  if (type.endsWith('_view')) return 'view'
  if (type.includes('export') || type.includes('download')) return 'export'
  if (
    type.startsWith('visit_') ||
    type === 'calendar_reset' ||
    type === 'json_import'
  ) {
    return 'edit'
  }
  return 'other'
}
