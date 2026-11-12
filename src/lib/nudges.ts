import dayjs from 'dayjs'
import { MONTH_NAMES } from './constants'
import type { DayMap } from './trips'

export interface MonthDays {
  year: number
  month: number
  days: number
}

export interface MonthNudge {
  earlier: MonthDays
  later: MonthDays
  direction: 'down' | 'up' | 'flat'
  ratio: number | null
}

export function daysInMonth(dayMap: DayMap, year: number, month: number) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`
  let count = 0
  for (const key of dayMap.keys()) if (key.startsWith(prefix)) count++
  return count
}

export function getMonthNudge(dayMap: DayMap, todayKey: string): MonthNudge {
  const today = dayjs(todayKey)
  const later = today.subtract(1, 'month')
  const earlier = today.subtract(2, 'month')
  const laterDays = daysInMonth(dayMap, later.year(), later.month())
  const earlierDays = daysInMonth(dayMap, earlier.year(), earlier.month())
  const low = Math.min(laterDays, earlierDays)
  const high = Math.max(laterDays, earlierDays)
  return {
    earlier: {
      year: earlier.year(),
      month: earlier.month(),
      days: earlierDays,
    },
    later: { year: later.year(), month: later.month(), days: laterDays },
    direction:
      earlierDays > laterDays
        ? 'down'
        : laterDays > earlierDays
          ? 'up'
          : 'flat',
    ratio: low > 0 ? high / low : null,
  }
}

function days(count: number) {
  return `${count} ${count === 1 ? 'day' : 'days'}`
}

function times(ratio: number) {
  return ratio >= 3
    ? `${Math.round(ratio)}×`
    : `${Math.round(ratio * 10) / 10}×`
}

export function nudgeMessage(nudge: MonthNudge): string {
  const a = MONTH_NAMES[nudge.earlier.month]
  const b = MONTH_NAMES[nudge.later.month]
  if (nudge.direction === 'down') {
    return nudge.ratio === null
      ? `${days(nudge.earlier.days)} abroad in ${a}, none in ${b}.`
      : `In ${a} you travelled ${times(nudge.ratio)} more than in ${b}.`
  }
  if (nudge.direction === 'up') {
    return nudge.ratio === null
      ? `${b} got you moving again: ${days(nudge.later.days)} abroad after a quiet ${a}.`
      : `${b} beat ${a}: ${times(nudge.ratio)} the days abroad.`
  }
  if (nudge.later.days === 0) return `No trips in ${a} or ${b}.`
  return `${a} and ${b} were even: ${days(nudge.later.days)} abroad each.`
}
