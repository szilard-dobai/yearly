import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  getReminderDateUtc,
  getReminderSendWindowLabel,
  getReminderSendYear,
  getReminderSignupClose,
  REMINDER_DATE,
  REMINDER_SEND_DAYS,
} from './date'
import { IDEMPOTENCY_WINDOW_MS } from './send'
import { isOpenReminderYear } from './server'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

describe('getReminderSendYear', () => {
  it('sends for the reminder date and the two days after it, in UTC', () => {
    expect(getReminderSendYear(new Date('2026-12-01T00:00:00Z'))).toBe(2026)
    expect(getReminderSendYear(new Date('2026-12-03T23:59:59Z'))).toBe(2026)
  })

  it('does nothing on any other day', () => {
    expect(getReminderSendYear(new Date('2026-11-30T23:59:59Z'))).toBeNull()
    expect(getReminderSendYear(new Date('2026-12-04T00:00:00Z'))).toBeNull()
    expect(getReminderSendYear(new Date('2027-06-01T08:00:00Z'))).toBeNull()
  })

  it('names the window', () => {
    expect(getReminderSendWindowLabel()).toBe('1 Dec to 3 Dec (UTC)')
  })
})

describe('isOpenReminderYear', () => {
  it('accepts this year until 1 Dec has begun in every time zone', () => {
    expect(isOpenReminderYear(2026, new Date('2026-11-07T12:00:00Z'))).toBe(
      true
    )
    expect(isOpenReminderYear(2026, new Date('2026-12-01T11:59:59Z'))).toBe(
      true
    )
    expect(isOpenReminderYear(2026, new Date('2026-12-01T12:00:00Z'))).toBe(
      false
    )
    expect(isOpenReminderYear(2026, new Date('2026-12-31T23:00:00Z'))).toBe(
      false
    )
  })

  it('accepts next year and nothing else', () => {
    const now = new Date('2026-12-15T12:00:00Z')
    expect(isOpenReminderYear(2027, now)).toBe(true)
    expect(isOpenReminderYear(2025, now)).toBe(false)
    expect(isOpenReminderYear(2028, now)).toBe(false)
  })
})

type Cron = { path: string; schedule: string }

function reminderRuns(year: number) {
  const config = JSON.parse(
    readFileSync(path.resolve(__dirname, '../../../vercel.json'), 'utf8')
  ) as { crons: Cron[] }
  return config.crons
    .filter((cron) => cron.path === '/api/cron/year-end-reminders')
    .map((cron) => {
      const [minute, hour, day, month, weekday] = cron.schedule.split(' ')
      expect(weekday).toBe('*')
      return new Date(
        Date.UTC(
          year,
          Number(month) - 1,
          Number(day),
          Number(hour),
          Number(minute)
        )
      )
    })
    .sort((a, b) => a.getTime() - b.getTime())
}

describe('the year-end reminder crons in vercel.json', () => {
  const year = 2026
  const runs = reminderRuns(year)
  // Hobby crons can start up to 59 minutes late, and a run lasts up to 5 minutes
  const LATENESS_MS = HOUR_MS
  const RUN_MS = 5 * 60 * 1000

  it('all fall inside the send window', () => {
    expect(runs.length).toBeGreaterThan(0)
    for (const run of runs) {
      expect(getReminderSendYear(run)).toBe(year)
      expect(getReminderSendYear(new Date(run.getTime() + LATENESS_MS))).toBe(
        year
      )
    }
  })

  it('start on the reminder date', () => {
    expect(runs[0].getUTCMonth()).toBe(REMINDER_DATE.monthIndex)
    expect(runs[0].getUTCDate()).toBe(REMINDER_DATE.day)
    expect(runs[0].getTime() - getReminderDateUtc(year).getTime()).toBeLessThan(
      12 * HOUR_MS
    )
  })

  it('run again on the reminder date after the last sign-ups are in', () => {
    const lateRun = runs.find(
      (run) =>
        run >= getReminderSignupClose(year) &&
        run.getTime() < getReminderDateUtc(year).getTime() + DAY_MS
    )
    expect(lateRun).toBeDefined()
  })

  it('cover each day of the window', () => {
    const days = new Set(runs.map((run) => run.getUTCDate()))
    expect(days.size).toBe(REMINDER_SEND_DAYS)
  })

  it("follow each other inside Resend's idempotency window", () => {
    for (let index = 1; index < runs.length; index++) {
      const longestGap =
        runs[index].getTime() + LATENESS_MS - runs[index - 1].getTime() + RUN_MS
      expect(longestGap).toBeLessThan(IDEMPOTENCY_WINDOW_MS)
    }
  })
})
