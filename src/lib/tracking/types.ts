/**
 * Tracking event types for analytics
 */

import type { ExportType } from '@/lib/feedback/types'
import type { SelectionMethod } from '@/lib/selection'
import type { TripSummary } from './trip-summary'

export const TRACKING_EVENT_TYPES = [
  'homepage_view',
  'create_page_view',
  'not_found_page_view',
  'homepage_cta_click',
  'not_found_home_click',
  'year_changed',
  'visit_add_attempt',
  'visit_deleted',
  'visit_reordered',
  'visit_undo',
  'calendar_reset',
  'image_export_click',
  'image_download_click',
  'statistics_export_click',
  'monthly_export_click',
  'developer_mode_toggle',
  'mobile_fab_click',
  'json_import',
  'json_export',
  'feedback_prompt_shown',
  'feedback_prompt_dismissed',
  'feedback_dialog_open',
  'feedback_submitted',
  'acquisition_survey_shown',
  'acquisition_survey_answered',
  'acquisition_survey_dismissed',
  'animated_video_preview_open',
  'animated_video_buy_click',
  'animated_video_waitlist_join',
  'year_end_reminder_open',
  'year_end_reminder_shown',
  'year_end_reminder_calendar_add',
  'year_end_reminder_email_submit',
  'trip_countdown_shown',
  'travel_nudge_shown',
  'travel_nudge_plan_click',
  'travel_nudge_dismissed',
  'badges_open',
  'badge_unlocked',
  'year_compare_open',
  'map_export_click',
  'wrapped_open',
  'wrapped_complete',
  'wrapped_share',
  'schengen_counter_shown',
  'schengen_passport_set',
] as const

export type TrackingEventType = (typeof TRACKING_EVENT_TYPES)[number]

export const DEVICE_TYPES = ['mobile', 'tablet', 'desktop'] as const

export type DeviceType = (typeof DEVICE_TYPES)[number]

export interface TrackingEvent {
  type: TrackingEventType
  timestamp: string
  deviceId: string
  deviceType?: DeviceType
  country?: string
  region?: string
  metadata?: Record<string, unknown>
}

export interface HomepageCtaClickMetadata {
  linkType: 'header' | 'hero' | 'cta_section' | 'video_teaser'
}

export interface YearChangedMetadata {
  fromYear: number
  toYear: number
}

export type VisitSource = 'form' | 'calendar'

export interface VisitAddAttemptMetadata {
  success: boolean
  countryCode?: string
  dateCount?: number
  errorReason?: string
  source?: VisitSource
  selectionMethod?: SelectionMethod
  suggested?: boolean
  emptyOnly?: boolean
  skippedFull?: number
  skippedExisting?: number
}

export interface VisitDeletedMetadata {
  countryCode?: string
  source?: VisitSource
  dateCount?: number
}

export type ImageExportClickMetadata = TripSummary

export type ImageDownloadClickMetadata = TripSummary & {
  exportType: ExportType
}

export interface DeveloperModeToggleMetadata {
  opened: boolean
}

export interface JsonImportMetadata {
  strategy: 'merge' | 'replace'
  importedVisitCount: number
  success: boolean
}

export type JsonExportMetadata = TripSummary & {
  success: boolean
}

export interface MonthlyExportClickMetadata {
  year: number
  month: number
  source: 'sidebar' | 'header' | 'mobile_fab'
}

export interface StoredTrackingEvent extends TrackingEvent {
  _id: string
}

export interface DeviceSummary {
  totalEvents: number
  firstSeen: string | null
  lastSeen: string | null
  countries: string[]
  deviceTypes: DeviceType[]
  eventCounts: Record<string, number>
}
