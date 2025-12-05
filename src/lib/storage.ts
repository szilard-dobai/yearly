import { z } from 'zod'

import type { CalendarData } from './types'

const STORAGE_KEY = 'countries-in-year'
const MAX_VISITS = 365 * 2

/**
 * Zod schema for validating serialized calendar data
 */
const serializedVisitSchema = z.object({
  id: z.string().min(1),
  countryCode: z.string().length(2),
  date: z.iso.datetime(),
})

const serializedCalendarDataSchema = z.object({
  visits: z.array(serializedVisitSchema).max(MAX_VISITS),
})

type SerializedCalendarData = z.infer<typeof serializedCalendarDataSchema>

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
    localStorage.setItem(STORAGE_KEY, json)
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
    const json = localStorage.getItem(STORAGE_KEY)
    if (!json) return null

    const parsed: unknown = JSON.parse(json)
    const result = serializedCalendarDataSchema.safeParse(parsed)

    if (!result.success) {
      console.error('Invalid stored calendar data:', result.error.issues)
      return null
    }

    return deserializeCalendarData(result.data)
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
    localStorage.removeItem(STORAGE_KEY)
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
    const parsed: unknown = JSON.parse(json)
    const result = serializedCalendarDataSchema.safeParse(parsed)

    if (!result.success) {
      console.error('Invalid calendar data:', result.error.issues)
      return null
    }

    return deserializeCalendarData(result.data)
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
