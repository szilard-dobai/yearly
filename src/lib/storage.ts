/**
 * Local storage helper functions for persisting calendar data
 */

import type { CalendarData, SerializedCalendarData } from './types'

const STORAGE_KEY_PREFIX = 'countries-in-year'

/**
 * Get the storage key for all calendar data
 * @returns Storage key string
 */
function getAllDataStorageKey(): string {
  return STORAGE_KEY_PREFIX
}

/**
 * Serialize calendar data for storage
 * Converts Date objects to ISO strings
 * @param data - Calendar data to serialize
 * @returns Serialized calendar data
 */
function serializeCalendarData(data: CalendarData): SerializedCalendarData {
  return {
    visits: data.visits.map((visit) => ({
      ...visit,
      date: visit.date.toISOString(),
    })),
  }
}

/**
 * Deserialize calendar data from storage
 * Converts ISO strings back to Date objects
 * @param data - Serialized calendar data
 * @returns Calendar data with Date objects
 */
function deserializeCalendarData(data: SerializedCalendarData): CalendarData {
  return {
    visits: data.visits.map((visit) => ({
      ...visit,
      date: new Date(visit.date),
    })),
  }
}

/**
 * Save calendar data to local storage
 * @param data - Calendar data to save
 */
export function saveCalendarData(data: CalendarData): void {
  try {
    const serialized = serializeCalendarData(data)
    const json = JSON.stringify(serialized)
    localStorage.setItem(getAllDataStorageKey(), json)
  } catch (error) {
    console.error('Failed to save calendar data:', error)
    throw new Error('Failed to save calendar data to local storage')
  }
}

/**
 * Load calendar data from local storage
 * @returns Calendar data or null if not found
 */
export function loadCalendarData(): CalendarData | null {
  try {
    const json = localStorage.getItem(getAllDataStorageKey())
    if (!json) return null

    const serialized = JSON.parse(json) as SerializedCalendarData
    return deserializeCalendarData(serialized)
  } catch (error) {
    console.error('Failed to load calendar data:', error)
    return null
  }
}

/**
 * Clear calendar data from local storage
 */
export function clearCalendarData(): void {
  try {
    localStorage.removeItem(getAllDataStorageKey())
  } catch (error) {
    console.error('Failed to clear calendar data:', error)
  }
}

/**
 * Export calendar data as JSON string
 * @param data - Calendar data to export
 * @returns JSON string
 */
export function exportToJSON(data: CalendarData): string {
  const serialized = serializeCalendarData(data)
  return JSON.stringify(serialized, null, 2)
}

/**
 * Import calendar data from JSON string
 * @param json - JSON string to parse
 * @returns Calendar data or null if invalid
 */
export function importFromJSON(json: string): CalendarData | null {
  try {
    const serialized = JSON.parse(json) as SerializedCalendarData

    // Validate structure
    if (!serialized.visits || !Array.isArray(serialized.visits)) {
      throw new Error('Invalid calendar data structure')
    }

    // Validate each visit
    for (const visit of serialized.visits) {
      if (!visit.id || !visit.countryCode || !visit.date) {
        throw new Error('Invalid visit data structure')
      }
      // Check if date is valid
      const date = new Date(visit.date)
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date in visit data')
      }
    }

    return deserializeCalendarData(serialized)
  } catch (error) {
    console.error('Failed to import calendar data:', error)
    return null
  }
}

/**
 * Check if local storage is available
 * @returns True if local storage is available
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const test = '__storage_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}
