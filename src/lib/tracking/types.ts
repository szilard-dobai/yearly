/**
 * Tracking event types for analytics
 */

export type TrackingEventType =
  // Page view events
  | 'homepage_view'
  | 'create_page_view'
  | 'not_found_page_view'
  // Homepage events
  | 'homepage_cta_click'
  // 404 page events
  | 'not_found_home_click'
  // Create page events
  | 'year_changed'
  | 'visit_add_attempt'
  | 'visit_deleted'
  | 'visit_undo'
  | 'calendar_reset'
  | 'image_export_click'
  | 'image_download_click'
  | 'developer_mode_toggle'
  | 'json_import'
  | 'json_export'

export interface TrackingEvent {
  type: TrackingEventType
  timestamp: string
  deviceId: string
  country?: string
  region?: string
  metadata?: Record<string, unknown>
}

export interface HomepageCtaClickMetadata {
  linkType: 'header' | 'hero' | 'cta_section'
}

export interface YearChangedMetadata {
  fromYear: number
  toYear: number
}

export interface VisitAddAttemptMetadata {
  success: boolean
  countryCode?: string
  dateCount?: number
  errorReason?: string
}

export interface VisitDeletedMetadata {
  countryCode: string
}

export interface ImageExportClickMetadata {
  year: number
  visitCount: number
}

export interface ImageDownloadClickMetadata {
  year: number
  isMobile: boolean
}

export interface DeveloperModeToggleMetadata {
  opened: boolean
}

export interface JsonImportMetadata {
  strategy: 'merge' | 'replace'
  importedVisitCount: number
  success: boolean
}

export interface JsonExportMetadata {
  visitCount: number
  success: boolean
}
