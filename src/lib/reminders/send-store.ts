import type { ReminderDocument } from '@/lib/mongodb'
import {
  type Collection,
  type Filter,
  ObjectId,
  type UpdateFilter,
} from 'mongodb'
import {
  CLAIM_TIMEOUT_MS,
  IDEMPOTENCY_WINDOW_MS,
  MAX_SEND_ATTEMPTS,
  RETRY_DELAY_MS,
  type ReminderSendStore,
  type SendFailure,
} from './send'

type SendState = Pick<
  ReminderDocument,
  'sentAt' | 'sendAttempts' | 'sendClaimedAt' | 'sendFailedAt' | 'sendError'
>

function cutoffs(now: Date) {
  const time = now.getTime()
  return {
    retryAfter: new Date(time - RETRY_DELAY_MS),
    claimExpired: new Date(time - CLAIM_TIMEOUT_MS),
    idempotencyStart: new Date(time - IDEMPOTENCY_WINDOW_MS),
  }
}

export function claimableFilter(
  year: number,
  now: Date
): Filter<ReminderDocument> {
  const { retryAfter, claimExpired, idempotencyStart } = cutoffs(now)
  return {
    year,
    sentAt: { $exists: false },
    sendAttempts: { $not: { $gte: MAX_SEND_ATTEMPTS } },
    $or: [
      {
        sendClaimedAt: { $exists: false },
        sendFailedAt: { $not: { $gte: retryAfter } },
      },
      { sendClaimedAt: { $lt: claimExpired, $gte: idempotencyStart } },
    ],
  }
}

export function isClaimable(doc: SendState, now: Date): boolean {
  const { retryAfter, claimExpired, idempotencyStart } = cutoffs(now)
  if (doc.sentAt || (doc.sendAttempts ?? 0) >= MAX_SEND_ATTEMPTS) return false
  if (!doc.sendClaimedAt) {
    return !doc.sendFailedAt || doc.sendFailedAt < retryAfter
  }
  return (
    doc.sendClaimedAt < claimExpired && doc.sendClaimedAt >= idempotencyStart
  )
}

export function needsCheckFilter(
  year: number,
  now: Date
): Filter<ReminderDocument> {
  return {
    year,
    sentAt: { $exists: false },
    $or: [
      { sendAttempts: { $gte: MAX_SEND_ATTEMPTS } },
      { sendClaimedAt: { $lt: cutoffs(now).idempotencyStart } },
    ],
  }
}

export function needsCheck(doc: SendState, now: Date): boolean {
  if (doc.sentAt) return false
  return (
    (doc.sendAttempts ?? 0) >= MAX_SEND_ATTEMPTS ||
    (!!doc.sendClaimedAt && doc.sendClaimedAt < cutoffs(now).idempotencyStart)
  )
}

export function failureUpdate(
  failure: SendFailure,
  now: Date
): UpdateFilter<ReminderDocument> {
  const recorded = { sendFailedAt: now, sendError: failure.code }
  switch (failure.kind) {
    case 'unknown':
      return { $set: recorded }
    case 'rejected':
      return { $set: recorded, $unset: { sendClaimedAt: '' } }
    case 'not_sent':
      return {
        $set: recorded,
        $unset: { sendClaimedAt: '' },
        $inc: { sendAttempts: -1 },
      }
    case 'give_up':
      return {
        $set: recorded,
        $unset: { sendClaimedAt: '' },
        $max: { sendAttempts: MAX_SEND_ATTEMPTS },
      }
  }
}

export function createReminderSendStore(
  collection: Collection<ReminderDocument>,
  year: number
): ReminderSendStore {
  return {
    async count(now) {
      const [total, sent, failed, ready, check] = await Promise.all([
        collection.countDocuments({ year }),
        collection.countDocuments({ year, sentAt: { $exists: true } }),
        collection.countDocuments({
          year,
          sentAt: { $exists: false },
          sendError: { $exists: true },
        }),
        collection.countDocuments(claimableFilter(year, now)),
        collection.countDocuments(needsCheckFilter(year, now)),
      ])
      return { total, sent, failed, ready, needsCheck: check }
    },

    async claimNext(now) {
      const doc = await collection.findOneAndUpdate(
        claimableFilter(year, now),
        { $set: { sendClaimedAt: now }, $inc: { sendAttempts: 1 } },
        {
          sort: { createdAt: 1, _id: 1 },
          projection: { email: 1 },
          returnDocument: 'after',
        }
      )
      return doc?._id ? { id: doc._id.toHexString(), email: doc.email } : null
    },

    async markSent(id, emailId, now) {
      await collection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: { sentAt: now, ...(emailId && { sendEmailId: emailId }) },
          $unset: { sendClaimedAt: '' },
        }
      )
    },

    async markFailed(id, failure, now) {
      await collection.updateOne(
        { _id: new ObjectId(id) },
        failureUpdate(failure, now)
      )
    },
  }
}
