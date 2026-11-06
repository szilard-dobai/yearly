import {
  getCalendarRemindersCollection,
  getRemindersCollection,
} from '@/lib/mongodb'
import type { ReminderTotals } from './types'

export function isOpenReminderYear(year: number, now = new Date()): boolean {
  const currentYear = now.getUTCFullYear()
  return year === currentYear || year === currentYear + 1
}

export async function getReminderTotals(year: number): Promise<ReminderTotals> {
  const [reminders, calendarAdds] = await Promise.all([
    getRemindersCollection(),
    getCalendarRemindersCollection(),
  ])
  const [emails, adds] = await Promise.all([
    reminders.countDocuments({ year }),
    calendarAdds.countDocuments({ year }),
  ])
  return { emails, calendarAdds: adds }
}
