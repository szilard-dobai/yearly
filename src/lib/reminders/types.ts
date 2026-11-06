import { z } from 'zod'

export const CALENDAR_PROVIDERS = ['ics', 'google'] as const

export type CalendarProvider = (typeof CALENDAR_PROVIDERS)[number]

export type ReminderMethod = CalendarProvider | 'email'

export type ReminderTotals = { emails: number; calendarAdds: number }

const reminderRequestFields = {
  deviceId: z.string().trim().min(1).max(100),
  year: z.int().min(2000).max(2200),
  deviceType: z.enum(['mobile', 'tablet', 'desktop']).optional(),
}

export const createReminderSchema = z.object({
  ...reminderRequestFields,
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
})

export type CreateReminderInput = z.infer<typeof createReminderSchema>

export const addCalendarReminderSchema = z.object({
  ...reminderRequestFields,
  provider: z.enum(CALENDAR_PROVIDERS),
})

export type AddCalendarReminderInput = z.infer<typeof addCalendarReminderSchema>
