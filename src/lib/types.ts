/**
 * Core type definitions for the Countries in Year application
 */

/**
 * Represents a country with its metadata
 */
export interface Country {
  /** ISO 3166-1 alpha-2 country code (e.g., "US", "FR", "JP") */
  code: string
  /** Full country name (e.g., "United States", "France", "Japan") */
  name: string
}

/**
 * Represents a single country visit on a specific date
 */
export interface CountryVisit {
  /** Unique identifier for the visit */
  id: string
  /** ISO 3166-1 alpha-2 country code */
  countryCode: string
  /** Date of visit */
  date: Date
}

/**
 * Represents all calendar data
 */
export interface CalendarData {
  /** Array of all country visits */
  visits: CountryVisit[]
}

/**
 * Serialized version of CalendarData for storage/export
 * (Date objects converted to ISO strings)
 */
export interface SerializedCalendarData {
  visits: {
    id: string
    countryCode: string
    date: string // ISO 8601 date string
  }[]
}
