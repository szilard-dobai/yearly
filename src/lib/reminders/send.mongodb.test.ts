// @vitest-environment node
import type { ReminderDocument } from '@/lib/mongodb'
import { type Collection, type Db, MongoClient, ObjectId } from 'mongodb'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  type ClaimedReminder,
  CLAIM_TIMEOUT_MS,
  IDEMPOTENCY_WINDOW_MS,
  MAX_SEND_ATTEMPTS,
  RETRY_DELAY_MS,
  sendYearEndReminders,
} from './send'
import {
  claimableFilter,
  createReminderSendStore,
  isClaimable,
  needsCheck,
  needsCheckFilter,
} from './send-store'

const MONGO_TEST_URL = process.env.MONGO_TEST_URL
const NOW = new Date('2026-12-01T08:05:00Z')
const ago = (ms: number) => new Date(NOW.getTime() - ms)

function reminder(index: number, year = 2026): ReminderDocument {
  return {
    _id: new ObjectId(),
    email: `person${index}-${year}@example.com`,
    year,
    deviceId: `device-${index}`,
    createdAt: new Date(Date.UTC(2026, 10, 1, 0, index)),
    updatedAt: new Date(Date.UTC(2026, 10, 1, 0, index)),
  }
}

const jitter = () =>
  new Promise((resolve) => setTimeout(resolve, Math.random() * 3))

describe.skipIf(!MONGO_TEST_URL)(
  'year-end reminder sending against a real MongoDB',
  () => {
    let client: MongoClient
    let db: Db
    let reminders: Collection<ReminderDocument>

    beforeAll(async () => {
      client = new MongoClient(MONGO_TEST_URL!)
      await client.connect()
      db = client.db(`yearly_reminder_send_test_${Date.now()}`)
      reminders = db.collection<ReminderDocument>('reminders')
    })

    afterAll(async () => {
      await db?.dropDatabase()
      await client?.close()
    })

    beforeEach(async () => {
      await reminders.deleteMany({})
    })

    async function runs(
      count: number,
      send: (reminder: ClaimedReminder) => Promise<{ id: string | null }>,
      now = () => new Date(NOW)
    ) {
      return Promise.all(
        Array.from({ length: count }, () =>
          sendYearEndReminders({
            year: 2026,
            store: createReminderSendStore(reminders, 2026),
            send,
            budgetMs: 60_000,
            now,
            sleep: jitter,
          })
        )
      )
    }

    it('sends each address exactly once when several runs start together', async () => {
      await reminders.insertMany([
        ...Array.from({ length: 60 }, (_, index) => reminder(index)),
        ...Array.from({ length: 5 }, (_, index) => reminder(index, 2027)),
      ])
      const sends = new Map<string, number>()
      const send = async ({ email }: ClaimedReminder) => {
        sends.set(email, (sends.get(email) ?? 0) + 1)
        await jitter()
        return { id: `resend-${email.length}` }
      }

      const results = await runs(4, send)

      expect(sends.size).toBe(60)
      expect([...sends.values()].every((times) => times === 1)).toBe(true)
      expect(
        [...sends.keys()].every((email) => email.endsWith('-2026@example.com'))
      ).toBe(true)
      expect(results.reduce((sum, result) => sum + result.sentNow, 0)).toBe(60)
      expect(
        results.filter((result) => result.sentNow > 0).length
      ).toBeGreaterThan(1)
      expect(
        await reminders.countDocuments({
          year: 2026,
          sentAt: { $exists: true },
        })
      ).toBe(60)
      expect(
        await reminders.countDocuments({
          year: 2027,
          sendAttempts: { $exists: true },
        })
      ).toBe(0)

      sends.clear()
      const again = await runs(2, send)
      expect(sends.size).toBe(0)
      expect(again.every((result) => result.left === 0)).toBe(true)
    })

    it('records failures without the address and retries them on a later run', async () => {
      const docs = Array.from({ length: 3 }, (_, index) => reminder(index))
      await reminders.insertMany(docs)
      let time = NOW.getTime()
      const now = () => new Date(time)
      const failing = docs[1].email
      const send = async ({ email }: ClaimedReminder) => {
        if (email === failing) {
          const { EmailSendError } = await import('@/lib/email/send')
          throw new EmailSendError('rejected', 'validation_error', 422)
        }
        return { id: 'resend-id' }
      }

      const [first] = await runs(1, send, now)
      expect(first).toMatchObject({ sentNow: 2, failed: 1, left: 1 })

      const failed = await reminders.findOne({ _id: docs[1]._id })
      expect(failed).toMatchObject({
        sendAttempts: 1,
        sendError: 'validation_error',
        sendFailedAt: expect.any(Date),
      })
      expect(failed?.sendClaimedAt).toBeUndefined()
      expect(JSON.stringify({ ...failed, email: undefined })).not.toContain('@')

      const [tooSoon] = await runs(1, send, now)
      expect(tooSoon.failed).toBe(0)

      time += RETRY_DELAY_MS + 1000
      const recovered = async () => ({ id: 'resend-retry' })
      const [retry] = await runs(1, recovered, now)
      expect(retry).toMatchObject({ sentNow: 1, left: 0 })
      expect(await reminders.findOne({ _id: docs[1]._id })).toMatchObject({
        sendAttempts: 2,
        sendEmailId: 'resend-retry',
      })
    })

    it('takes over an abandoned claim only inside the idempotency window', async () => {
      const [recent, stale] = [reminder(0), reminder(1)]
      await reminders.insertMany([
        {
          ...recent,
          sendClaimedAt: ago(CLAIM_TIMEOUT_MS + 1000),
          sendAttempts: 1,
        },
        {
          ...stale,
          sendClaimedAt: ago(IDEMPOTENCY_WINDOW_MS + 1000),
          sendAttempts: 1,
        },
      ])
      const sent: string[] = []

      const [result] = await runs(1, async ({ email }) => {
        sent.push(email)
        return { id: 'resend-id' }
      })

      expect(sent).toEqual([recent.email])
      expect(result).toMatchObject({ sentNow: 1, left: 1, needsCheck: 1 })
    })

    it('stores each kind of failure the way the next run expects', async () => {
      const store = createReminderSendStore(reminders, 2026)
      const docs = Array.from({ length: 4 }, (_, index) => reminder(index))
      await reminders.insertMany(docs)
      for (let index = 0; index < docs.length; index++) {
        await store.claimNext(NOW)
      }
      const kinds = ['rejected', 'unknown', 'not_sent', 'give_up'] as const
      for (const [index, kind] of kinds.entries()) {
        await store.markFailed(
          docs[index]._id!.toHexString(),
          { kind, code: `${kind}_code` },
          NOW
        )
      }

      const stored = await reminders
        .find({}, { sort: { createdAt: 1 } })
        .toArray()
      expect(stored.map((doc) => doc.sendAttempts)).toEqual([
        1,
        1,
        0,
        MAX_SEND_ATTEMPTS,
      ])
      expect(stored.map((doc) => !!doc.sendClaimedAt)).toEqual([
        false,
        true,
        false,
        false,
      ])
      expect(stored.every((doc) => doc.sendError?.endsWith('_code'))).toBe(true)
    })

    it('agrees with the in-memory rules the unit tests use', async () => {
      const states: Partial<ReminderDocument>[] = [
        {},
        { sentAt: ago(1000), sendAttempts: 1 },
        {
          sendAttempts: MAX_SEND_ATTEMPTS,
          sendFailedAt: ago(RETRY_DELAY_MS * 2),
        },
        { sendAttempts: 1, sendFailedAt: ago(1000), sendError: 'x' },
        {
          sendAttempts: 1,
          sendFailedAt: ago(RETRY_DELAY_MS + 1000),
          sendError: 'x',
        },
        { sendAttempts: 1, sendClaimedAt: ago(1000) },
        { sendAttempts: 1, sendClaimedAt: ago(CLAIM_TIMEOUT_MS + 1000) },
        { sendAttempts: 2, sendClaimedAt: ago(IDEMPOTENCY_WINDOW_MS + 1000) },
        {
          sendAttempts: 0,
          sendFailedAt: ago(RETRY_DELAY_MS + 1000),
          sendError: 'daily_quota_exceeded',
        },
      ]
      const docs = states.map((state, index) => ({
        ...reminder(index),
        ...state,
      }))
      await reminders.insertMany(docs)

      const claimable = await reminders
        .find(claimableFilter(2026, NOW), { projection: { _id: 1 } })
        .toArray()
      const check = await reminders
        .find(needsCheckFilter(2026, NOW), { projection: { _id: 1 } })
        .toArray()

      const ids = (list: { _id?: ObjectId }[]) =>
        list.map((doc) => doc._id!.toHexString()).sort()
      expect(ids(claimable)).toEqual(
        ids(docs.filter((doc) => isClaimable(doc, NOW)))
      )
      expect(ids(check)).toEqual(
        ids(docs.filter((doc) => needsCheck(doc, NOW)))
      )
      expect(ids(claimable)).toHaveLength(4)
      expect(ids(check)).toHaveLength(2)
    })
  }
)
