import type { Database } from '@/lib/db'
import { rateLimits, session, verification } from '@/lib/db/schema'
import { count, lt } from 'drizzle-orm'
import type { Db, Document, Filter } from 'mongodb'

export const FULL_RETENTION_MONTHS = 26
export const MAX_RETENTION_YEARS = 5

const DAY_MS = 24 * 60 * 60 * 1000
const MIN_ANONYMIZE_AGE_MS = 700 * DAY_MS
const MIN_DELETE_AGE_MS = 4 * 365 * DAY_MS

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

interface RetentionOptions {
  dryRun?: boolean
}

export function retentionCutoffs(now: Date) {
  const anonymizeBefore = new Date(now)
  anonymizeBefore.setUTCMonth(
    anonymizeBefore.getUTCMonth() - FULL_RETENTION_MONTHS
  )
  const deleteBefore = new Date(now)
  deleteBefore.setUTCFullYear(
    deleteBefore.getUTCFullYear() - MAX_RETENTION_YEARS
  )

  const isSafe =
    anonymizeBefore.getTime() <= now.getTime() - MIN_ANONYMIZE_AGE_MS &&
    deleteBefore.getTime() <= now.getTime() - MIN_DELETE_AGE_MS
  if (!isSafe) {
    throw new Error('Retention cutoffs are too recent, so nothing was changed')
  }
  return { anonymizeBefore, deleteBefore }
}

interface AgedCollection {
  name: string
  dateField: string
  fieldsRemoved: string[]
  truncateDate: boolean
}

const AGED_COLLECTIONS: Record<string, AgedCollection> = {
  events: {
    name: 'tracking_events',
    dateField: 'timestamp',
    fieldsRemoved: EVENT_FIELDS_REMOVED,
    truncateDate: true,
  },
  feedback: {
    name: 'feedback',
    dateField: 'createdAt',
    fieldsRemoved: FEEDBACK_FIELDS_REMOVED,
    truncateDate: false,
  },
  calendarAdds: {
    name: 'reminder_calendar_adds',
    dateField: 'createdAt',
    fieldsRemoved: CALENDAR_ADD_FIELDS_REMOVED,
    truncateDate: false,
  },
}

async function applyToAgedCollection(
  db: Db,
  rules: AgedCollection,
  cutoffs: { anonymizeBefore: Date; deleteBefore: Date },
  dryRun: boolean
) {
  const collection = db.collection(rules.name)
  const deleteFilter: Filter<Document> = {
    [rules.dateField]: { $lt: cutoffs.deleteBefore },
  }
  const anonymizeFilter: Filter<Document> = {
    [rules.dateField]: {
      $lt: cutoffs.anonymizeBefore,
      $gte: cutoffs.deleteBefore,
    },
    anonymized: { $ne: true },
  }

  if (dryRun) {
    return {
      deleted: await collection.countDocuments(deleteFilter),
      anonymized: await collection.countDocuments(anonymizeFilter),
    }
  }

  const deleted = await collection.deleteMany(deleteFilter)
  const set: Document = { anonymized: true }
  if (rules.truncateDate) {
    set[rules.dateField] = {
      $dateTrunc: { date: `$${rules.dateField}`, unit: 'day' },
    }
  }
  const anonymized = await collection.updateMany(anonymizeFilter, [
    { $set: set },
    { $unset: rules.fieldsRemoved },
  ])
  return { deleted: deleted.deletedCount, anonymized: anonymized.modifiedCount }
}

export async function applyMongoRetention(
  db: Db,
  now = new Date(),
  { dryRun = false }: RetentionOptions = {}
) {
  const cutoffs = retentionCutoffs(now)
  const events = await applyToAgedCollection(
    db,
    AGED_COLLECTIONS.events,
    cutoffs,
    dryRun
  )
  const feedback = await applyToAgedCollection(
    db,
    AGED_COLLECTIONS.feedback,
    cutoffs,
    dryRun
  )
  const calendarAdds = await applyToAgedCollection(
    db,
    AGED_COLLECTIONS.calendarAdds,
    cutoffs,
    dryRun
  )

  const reminders = db.collection('reminders')
  const pastYears = { year: { $lt: now.getUTCFullYear() } }
  const remindersDeleted = dryRun
    ? await reminders.countDocuments(pastYears)
    : (await reminders.deleteMany(pastYears)).deletedCount

  return {
    eventsDeleted: events.deleted,
    eventsAnonymized: events.anonymized,
    feedbackDeleted: feedback.deleted,
    feedbackAnonymized: feedback.anonymized,
    calendarAddsDeleted: calendarAdds.deleted,
    calendarAddsAnonymized: calendarAdds.anonymized,
    remindersDeleted,
  }
}

export async function applyPostgresRetention(
  db: Database,
  now = new Date(),
  { dryRun = false }: RetentionOptions = {}
) {
  const dayAgo = new Date(now.getTime() - DAY_MS)
  const expiredSessions = lt(session.expiresAt, now)
  const expiredCodes = lt(verification.expiresAt, now)
  const oldLimits = lt(rateLimits.windowStart, dayAgo)

  if (dryRun) {
    const [[sessions], [codes], [limits]] = await Promise.all([
      db.select({ n: count() }).from(session).where(expiredSessions),
      db.select({ n: count() }).from(verification).where(expiredCodes),
      db.select({ n: count() }).from(rateLimits).where(oldLimits),
    ])
    return {
      expiredSessionsDeleted: sessions.n,
      expiredCodesDeleted: codes.n,
      rateLimitsDeleted: limits.n,
    }
  }

  const [sessions, codes, limits] = await Promise.all([
    db.delete(session).where(expiredSessions).returning({ id: session.id }),
    db
      .delete(verification)
      .where(expiredCodes)
      .returning({ id: verification.id }),
    db.delete(rateLimits).where(oldLimits).returning({ key: rateLimits.key }),
  ])
  return {
    expiredSessionsDeleted: sessions.length,
    expiredCodesDeleted: codes.length,
    rateLimitsDeleted: limits.length,
  }
}
