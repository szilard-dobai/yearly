import { loadCalendarData, saveCalendarData } from '@/lib/storage'
import { type CalendarDays, fromCalendarDays, toCalendarDays } from './days'

export function readStoredDays(): CalendarDays {
  return toCalendarDays(loadCalendarData()?.visits ?? [])
}

export function writeStoredDays(days: CalendarDays) {
  saveCalendarData({
    visits: fromCalendarDays(days, loadCalendarData()?.visits ?? []),
  })
}
