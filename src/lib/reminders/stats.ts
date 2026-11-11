import type { TrackingEventType } from '@/lib/tracking/types'
import { CALENDAR_PROVIDERS, type CalendarProvider } from './types'

export const REMINDER_STATS_EVENTS = [
  'year_end_reminder_shown',
  'year_end_reminder_open',
  'year_end_reminder_calendar_add',
] as const satisfies readonly TrackingEventType[]

export type ReminderStats = {
  year: number
  total: number
  lastSevenDays: number
  emails: string[]
  shown: number
  opens: number
  calendarAdds: Record<CalendarProvider, number>
}

export type ReminderEventAggregate = {
  type: string
  provider?: unknown
  devices: number
}

function isCalendarProvider(value: unknown): value is CalendarProvider {
  return CALENDAR_PROVIDERS.some((provider) => provider === value)
}

export function summarizeReminderEvents(
  rows: ReminderEventAggregate[]
): Pick<ReminderStats, 'shown' | 'opens' | 'calendarAdds'> {
  const summary = { shown: 0, opens: 0, calendarAdds: { ics: 0, google: 0 } }

  for (const row of rows) {
    if (row.type === 'year_end_reminder_shown') {
      summary.shown += row.devices
    } else if (row.type === 'year_end_reminder_open') {
      summary.opens += row.devices
    } else if (
      row.type === 'year_end_reminder_calendar_add' &&
      isCalendarProvider(row.provider)
    ) {
      summary.calendarAdds[row.provider] += row.devices
    }
  }

  return summary
}
