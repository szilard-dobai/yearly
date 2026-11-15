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
  | 'sentAt'
  | 'sendAttempts'
  | 'sendClaimedAt'
  | 'sendFirstClaimedAt'
  | 'sendMaybeSent'
  | 'sendFailedAt'
>

function cutoffs(now: Date) {
  const time = now.getTime()
  return {
    retryAfter: new Date(time - RETRY_DELAY_MS),
    claimExpired: new Date(time - CLAIM_TIMEOUT_MS),
    idempotencyStart: new Date(time - IDEMPOTENCY_WINDOW_MS),
  }
}

// Once an attempt may have gone out, a retry is only safe while Resend still
// remembers the key, counted from the key's first use
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
        $or: [
          { sendMaybeSent: { $ne: true } },
          { sendFirstClaimedAt: { $gte: idempotencyStart } },
        ],
      },
      {
        sendClaimedAt: { $lt: claimExpired },
        sendFirstClaimedAt: { $gte: idempotencyStart },
      },
    ],
  }
}

export function isClaimable(doc: SendState, now: Date): boolean {
  const { retryAfter, claimExpired, idempotencyStart } = cutoffs(now)
  if (doc.sentAt || (doc.sendAttempts ?? 0) >= MAX_SEND_ATTEMPTS) return false
  const keyRemembered =
    !!doc.sendFirstClaimedAt && doc.sendFirstClaimedAt >= idempotencyStart
  if (!doc.sendClaimedAt) {
    const waited = !doc.sendFailedAt || doc.sendFailedAt < retryAfter
    return waited && (doc.sendMaybeSent !== true || keyRemembered)
  }
  return doc.sendClaimedAt < claimExpired && keyRemembered
}

export function needsCheckFilter(
  year: number,
  now: Date
): Filter<ReminderDocument> {
  const { claimExpired, idempotencyStart } = cutoffs(now)
  return {
    year,
    sentAt: { $exists: false },
    $or: [
      { sendAttempts: { $gte: MAX_SEND_ATTEMPTS } },
      {
        sendMaybeSent: true,
        sendFirstClaimedAt: { $lt: idempotencyStart },
        sendClaimedAt: { $not: { $gte: claimExpired } },
      },
    ],
  }
}

export function needsCheck(doc: SendState, now: Date): boolean {
  const { claimExpired, idempotencyStart } = cutoffs(now)
  if (doc.sentAt) return false
  if ((doc.sendAttempts ?? 0) >= MAX_SEND_ATTEMPTS) return true
  return (
    doc.sendMaybeSent === true &&
    !!doc.sendFirstClaimedAt &&
    doc.sendFirstClaimedAt < idempotencyStart &&
    !(doc.sendClaimedAt && doc.sendClaimedAt >= claimExpired)
  )
}

export function failureUpdate(
  failure: SendFailure,
  now: Date,
  maybeSentBefore: boolean
): UpdateFilter<ReminderDocument> {
  const recorded = { sendFailedAt: now, sendError: failure.code }
  const released = {
    $set: { ...recorded, sendMaybeSent: maybeSentBefore },
    $unset: { sendClaimedAt: '' as const },
  }
  switch (failure.kind) {
    case 'unknown':
      return { $set: recorded }
    case 'rejected':
      return released
    case 'not_sent':
      return { ...released, $inc: { sendAttempts: -1 } }
    case 'give_up':
      return {
        $set: { ...recorded, sendMaybeSent: true },
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
      const before = await collection.findOneAndUpdate(
        claimableFilter(year, now),
        {
          $set: { sendClaimedAt: now, sendMaybeSent: true },
          $min: { sendFirstClaimedAt: now },
          $inc: { sendAttempts: 1 },
        },
        {
          sort: { createdAt: 1, _id: 1 },
          projection: { email: 1, sendMaybeSent: 1 },
          returnDocument: 'before',
        }
      )
      if (!before?._id) return null
      return {
        id: before._id.toHexString(),
        email: before.email,
        maybeSentBefore: before.sendMaybeSent === true,
      }
    },

    async markSent(reminder, emailId, now) {
      await collection.updateOne(
        { _id: new ObjectId(reminder.id) },
        {
          $set: { sentAt: now, ...(emailId && { sendEmailId: emailId }) },
          $unset: { sendClaimedAt: '' },
        }
      )
    },

    async markFailed(reminder, failure, now) {
      await collection.updateOne(
        { _id: new ObjectId(reminder.id) },
        failureUpdate(failure, now, reminder.maybeSentBefore)
      )
    },
  }
}
