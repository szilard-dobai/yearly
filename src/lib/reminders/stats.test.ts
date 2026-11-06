import { describe, expect, it } from 'vitest'
import { summarizeReminderEvents } from './stats'

describe('summarizeReminderEvents', () => {
  it('counts card opens and calendar adds by provider', () => {
    expect(
      summarizeReminderEvents([
        { type: 'year_end_reminder_open', devices: 40 },
        { type: 'year_end_reminder_calendar_add', provider: 'ics', devices: 9 },
        {
          type: 'year_end_reminder_calendar_add',
          provider: 'google',
          devices: 4,
        },
      ])
    ).toEqual({ opens: 40, calendarAdds: { ics: 9, google: 4 } })
  })

  it('ignores unknown providers and other events', () => {
    expect(
      summarizeReminderEvents([
        {
          type: 'year_end_reminder_calendar_add',
          provider: 'outlook',
          devices: 3,
        },
        { type: 'image_export_click', devices: 50 },
      ])
    ).toEqual({ opens: 0, calendarAdds: { ics: 0, google: 0 } })
  })
})
