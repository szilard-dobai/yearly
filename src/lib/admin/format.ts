import { getCountryByCode } from '@/lib/countries'
import type { TrackingEventType } from '@/lib/tracking/types'

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

export function formatDateTime(
  value: string | Date,
  precision: 'minutes' | 'seconds' = 'minutes'
): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: precision === 'seconds' ? 'medium' : 'short',
  })
}

export function shortDeviceId(deviceId: string): string {
  return deviceId.slice(0, 8)
}

export function getCountryName(code: string): string {
  return getCountryByCode(code)?.name ?? code
}

export function formatLocation(
  country?: string,
  region?: string,
  fallback = 'Unknown'
): string {
  if (!country) return fallback
  return region ? `${country} / ${region}` : country
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
  if (
    type.includes('export') ||
    type.includes('download') ||
    type.startsWith('animated_video_')
  ) {
    return 'export'
  }
  if (
    type.startsWith('visit_') ||
    type === 'calendar_reset' ||
    type === 'json_import'
  ) {
    return 'edit'
  }
  return 'other'
}

export const EVENT_LABELS: Record<TrackingEventType, string> = {
  homepage_view: 'Homepage viewed',
  create_page_view: 'Create page viewed',
  not_found_page_view: '404 page viewed',
  homepage_cta_click: 'Homepage CTA clicked',
  not_found_home_click: '404 home link clicked',
  year_changed: 'Year changed',
  visit_add_attempt: 'Visit add attempted',
  visit_deleted: 'Visit deleted',
  visit_reordered: 'Visits reordered',
  visit_undo: 'Change undone',
  calendar_reset: 'Calendar reset',
  image_export_click: 'Calendar export clicked',
  image_download_click: 'Image download clicked',
  statistics_export_click: 'Statistics export clicked',
  monthly_export_click: 'Month export clicked',
  developer_mode_toggle: 'Developer mode toggled',
  mobile_fab_click: 'Mobile menu opened',
  json_import: 'JSON imported',
  json_export: 'JSON exported',
  feedback_prompt_shown: 'Feedback prompt shown',
  feedback_prompt_dismissed: 'Feedback prompt dismissed',
  feedback_dialog_open: 'Feedback form opened',
  feedback_submitted: 'Feedback submitted',
  acquisition_survey_shown: 'Source survey shown',
  acquisition_survey_answered: 'Source survey answered',
  acquisition_survey_dismissed: 'Source survey dismissed',
  animated_video_preview_open: 'Video preview opened',
  animated_video_buy_click: 'Video buy clicked',
  animated_video_waitlist_join: 'Video waitlist joined',
  year_end_reminder_open: 'Year-end reminder opened',
  year_end_reminder_shown: 'Year-end reminder shown',
  year_end_reminder_calendar_add: 'Year-end reminder added to calendar',
  year_end_reminder_email_submit: 'Year-end reminder email added',
  account_prompt_shown: 'Account prompt shown',
  account_prompt_click: 'Account prompt clicked',
  account_prompt_dismissed: 'Account prompt dismissed',
  sign_in_code_sent: 'Sign-in code sent',
  sign_in_google_click: 'Google sign-in started',
  sign_in_completed: 'Signed in with a code',
  account_calendar_linked: 'Device linked to an account',
  sign_out: 'Signed out',
  account_deleted: 'Account deleted',
}

export function getEventLabel(type: string): string {
  if (Object.hasOwn(EVENT_LABELS, type)) {
    return EVENT_LABELS[type as TrackingEventType]
  }
  const words = type.split('_').filter(Boolean).join(' ')
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : type
}
