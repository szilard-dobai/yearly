import { MONTH_NAMES_SHORT } from '@/lib/constants'

export const REMINDER_DATE = { monthIndex: 11, day: 1 } as const

export const REMINDER_DATE_LABEL = `${REMINDER_DATE.day} ${MONTH_NAMES_SHORT[REMINDER_DATE.monthIndex]}`

export const REMINDER_SEND_DAYS = 3

const LATEST_TIME_ZONE_OFFSET_HOURS = 12
const DAY_MS = 24 * 60 * 60 * 1000

export function getReminderDateUtc(year: number): Date {
  return new Date(Date.UTC(year, REMINDER_DATE.monthIndex, REMINDER_DATE.day))
}

// The card hides at local midnight on the reminder date, which reaches UTC-12 at noon UTC
export function getReminderSignupClose(year: number): Date {
  return new Date(
    Date.UTC(
      year,
      REMINDER_DATE.monthIndex,
      REMINDER_DATE.day,
      LATEST_TIME_ZONE_OFFSET_HOURS
    )
  )
}

export function getReminderSendYear(now = new Date()): number | null {
  const year = now.getUTCFullYear()
  const start = getReminderDateUtc(year).getTime()
  const end = start + REMINDER_SEND_DAYS * DAY_MS
  return now.getTime() >= start && now.getTime() < end ? year : null
}

export function getReminderSendWindowLabel(): string {
  const lastDay = REMINDER_DATE.day + REMINDER_SEND_DAYS - 1
  return `${REMINDER_DATE_LABEL} to ${lastDay} ${MONTH_NAMES_SHORT[REMINDER_DATE.monthIndex]} (UTC)`
}
