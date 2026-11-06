import { MONTH_NAMES_SHORT } from '@/lib/constants'

export const REMINDER_DATE = { monthIndex: 11, day: 1 } as const

export const REMINDER_DATE_LABEL = `${REMINDER_DATE.day}\u00a0${MONTH_NAMES_SHORT[REMINDER_DATE.monthIndex]}`
