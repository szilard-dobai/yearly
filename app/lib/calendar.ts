/**
 * Calendar utility functions using Day.js
 */

import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'
import isLeapYear from 'dayjs/plugin/isLeapYear'
import type { CountryVisit } from './types'

// Enable plugins
dayjs.extend(isBetween)
dayjs.extend(isLeapYear)

/**
 * Get all days in a specific year
 * @param year - The year to get days for
 * @returns Array of Date objects for every day in the year
 */
export function getDaysInYear(year: number): Date[] {
  const startOfYear = dayjs(`${year}-01-01`)
  const daysInYear = startOfYear.isLeapYear() ? 366 : 365
  const days: Date[] = []

  for (let i = 0; i < daysInYear; i++) {
    days.push(startOfYear.add(i, 'day').toDate())
  }

  return days
}

/**
 * Expand a date range into individual dates
 * @param startDate - Start date of the range
 * @param endDate - End date of the range
 * @returns Array of Date objects for each day in the range (inclusive)
 */
export function expandDateRange(startDate: Date, endDate: Date): Date[] {
  const start = dayjs(startDate).startOf('day')
  const end = dayjs(endDate).startOf('day')
  const days: Date[] = []

  let current = start
  while (current.isBefore(end) || current.isSame(end, 'day')) {
    days.push(current.toDate())
    current = current.add(1, 'day')
  }

  return days
}

/**
 * Get all visits for a specific date
 * @param date - The date to check
 * @param visits - Array of all visits
 * @returns Array of visits on that date
 */
export function getVisitsForDate(
  date: Date,
  visits: CountryVisit[]
): CountryVisit[] {
  const targetDay = dayjs(date).startOf('day')

  return visits.filter((visit) => {
    const visitDay = dayjs(visit.date).startOf('day')
    return visitDay.isSame(targetDay, 'day')
  })
}

/**
 * Check if a new visit can be added to a specific date
 * Max 2 countries per day allowed
 * @param date - The date to check
 * @param visits - Array of all existing visits
 * @returns True if visit can be added, false if limit reached
 */
export function canAddVisitToDate(
  date: Date,
  visits: CountryVisit[]
): boolean {
  const visitsOnDate = getVisitsForDate(date, visits)
  return visitsOnDate.length < 2
}

/**
 * Get calendar data for a specific month
 * Returns a 2D array where each sub-array represents a week
 * @param year - The year
 * @param month - The month (0-11, where 0 = January)
 * @returns 2D array of dates, with null for days outside the month
 */
export function getMonthData(year: number, month: number): (Date | null)[][] {
  const firstDay = dayjs(`${year}-${String(month + 1).padStart(2, '0')}-01`)
  const daysInMonth = firstDay.daysInMonth()
  const startDayOfWeek = firstDay.day() // 0 = Sunday, 6 = Saturday

  const weeks: (Date | null)[][] = []
  let currentWeek: (Date | null)[] = []

  // Add empty cells for days before the month starts
  for (let i = 0; i < startDayOfWeek; i++) {
    currentWeek.push(null)
  }

  // Add all days in the month
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(firstDay.date(day).toDate())

    // If we've filled a week (7 days), start a new week
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }

  // Add empty cells to complete the last week
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null)
    }
    weeks.push(currentWeek)
  }

  return weeks
}

/**
 * Get the year from a date
 * @param date - The date
 * @returns The year
 */
export function getYear(date: Date): number {
  return dayjs(date).year()
}

/**
 * Check if a date is today
 * @param date - The date to check
 * @returns True if the date is today
 */
export function isToday(date: Date): boolean {
  return dayjs(date).isSame(dayjs(), 'day')
}

/**
 * Format a date for display
 * @param date - The date to format
 * @param format - Day.js format string (default: 'YYYY-MM-DD')
 * @returns Formatted date string
 */
export function formatDate(date: Date, format = 'YYYY-MM-DD'): string {
  return dayjs(date).format(format)
}
