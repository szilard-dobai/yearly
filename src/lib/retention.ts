import type { Database } from '@/lib/db'
import { rateLimits, session, verification } from '@/lib/db/schema'
import { lt } from 'drizzle-orm'
import type { Db } from 'mongodb'

export const FULL_RETENTION_MONTHS = 26
export const MAX_RETENTION_YEARS = 5

export const EVENT_FIELDS_REMOVED = [
  'deviceId',
  'region',
  'metadata.referrer',
  'metadata.utm',
  'metadata.inAppBrowser',
  'metadata.userAgent',
  'metadata.otherText',
]

export const FEEDBACK_FIELDS_REMOVED = ['deviceId', 'userAgent', 'region']

export const CALENDAR_ADD_FIELDS_REMOVED = ['deviceId', 'region']

export function retentionCutoffs(now: Date) {
  const anonymizeBefore = new Date(now)
  anonymizeBefore.setUTCMonth(
    anonymizeBefore.getUTCMonth() - FULL_RETENTION_MONTHS
  )
  const deleteBefore = new Date(now)
  deleteBefore.setUTCFullYear(
    deleteBefore.getUTCFullYear() - MAX_RETENTION_YEARS
  )
  return { anonymizeBefore, deleteBefore }
}

export async function applyMongoRetention(db: Db, now = new Date()) {
  const { anonymizeBefore, deleteBefore } = retentionCutoffs(now)
  const events = db.collection('tracking_events')
  const feedback = db.collection('feedback')
  const calendarAdds = db.collection('reminder_calendar_adds')
  const reminders = db.collection('reminders')
  const notYet = { $ne: true }

  const [
    eventsDeleted,
    eventsAnonymized,
    feedbackDeleted,
    feedbackAnonymized,
    calendarAddsDeleted,
    calendarAddsAnonymized,
    remindersDeleted,
  ] = await Promise.all([
    events.deleteMany({ timestamp: { $lt: deleteBefore } }),
    events.updateMany(
      { timestamp: { $lt: anonymizeBefore }, anonymized: notYet },
      [
        {
          $set: {
            timestamp: { $dateTrunc: { date: '$timestamp', unit: 'day' } },
            anonymized: true,
          },
        },
        { $unset: EVENT_FIELDS_REMOVED },
      ]
    ),
    feedback.deleteMany({ createdAt: { $lt: deleteBefore } }),
    feedback.updateMany(
      { createdAt: { $lt: anonymizeBefore }, anonymized: notYet },
      [{ $set: { anonymized: true } }, { $unset: FEEDBACK_FIELDS_REMOVED }]
    ),
    calendarAdds.deleteMany({ createdAt: { $lt: deleteBefore } }),
    calendarAdds.updateMany(
      { createdAt: { $lt: anonymizeBefore }, anonymized: notYet },
      [{ $set: { anonymized: true } }, { $unset: CALENDAR_ADD_FIELDS_REMOVED }]
    ),
    reminders.deleteMany({ year: { $lt: now.getUTCFullYear() } }),
  ])

  return {
    eventsDeleted: eventsDeleted.deletedCount,
    eventsAnonymized: eventsAnonymized.modifiedCount,
    feedbackDeleted: feedbackDeleted.deletedCount,
    feedbackAnonymized: feedbackAnonymized.modifiedCount,
    calendarAddsDeleted: calendarAddsDeleted.deletedCount,
    calendarAddsAnonymized: calendarAddsAnonymized.modifiedCount,
    remindersDeleted: remindersDeleted.deletedCount,
  }
}

export async function applyPostgresRetention(db: Database, now = new Date()) {
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const [sessions, codes, limits] = await Promise.all([
    db
      .delete(session)
      .where(lt(session.expiresAt, now))
      .returning({ id: session.id }),
    db
      .delete(verification)
      .where(lt(verification.expiresAt, now))
      .returning({ id: verification.id }),
    db
      .delete(rateLimits)
      .where(lt(rateLimits.windowStart, dayAgo))
      .returning({ key: rateLimits.key }),
  ])
  return {
    expiredSessionsDeleted: sessions.length,
    expiredCodesDeleted: codes.length,
    rateLimitsDeleted: limits.length,
  }
}
