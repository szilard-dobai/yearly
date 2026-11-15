import { EmailSendError } from '@/lib/email/send'
import { describe, expect, it, vi } from 'vitest'
import {
  type ClaimedReminder,
  classifySendError,
  IDEMPOTENCY_WINDOW_MS,
  MAX_CONSECUTIVE_FAILURES,
  MAX_SEND_ATTEMPTS,
  MIN_SEND_INTERVAL_MS,
  type ReminderSender,
  type ReminderSendStore,
  RETRY_DELAY_MS,
  reminderIdempotencyKey,
  sendYearEndReminders,
} from './send'
import { isClaimable, needsCheck } from './send-store'

type FakeDoc = {
  id: string
  email: string
  year: number
  sendClaimedAt?: Date
  sendAttempts?: number
  sentAt?: Date
  sendEmailId?: string
  sendFailedAt?: Date
  sendError?: string
}

function createFakeStore(docs: FakeDoc[], year = 2026) {
  const forYear = () => docs.filter((doc) => doc.year === year)
  const store: ReminderSendStore = {
    async count(now) {
      const all = forYear()
      return {
        total: all.length,
        sent: all.filter((doc) => doc.sentAt).length,
        failed: all.filter((doc) => !doc.sentAt && doc.sendError).length,
        ready: all.filter((doc) => isClaimable(doc, now)).length,
        needsCheck: all.filter((doc) => needsCheck(doc, now)).length,
      }
    },
    async claimNext(now) {
      const doc = forYear().find((candidate) => isClaimable(candidate, now))
      if (!doc) return null
      doc.sendClaimedAt = now
      doc.sendAttempts = (doc.sendAttempts ?? 0) + 1
      return { id: doc.id, email: doc.email }
    },
    async markSent(id, emailId, now) {
      const doc = docs.find((candidate) => candidate.id === id)!
      doc.sentAt = now
      if (emailId) doc.sendEmailId = emailId
      delete doc.sendClaimedAt
    },
    async markFailed(id, failure, now) {
      const doc = docs.find((candidate) => candidate.id === id)!
      doc.sendFailedAt = now
      doc.sendError = failure.code
      if (failure.kind === 'unknown') return
      delete doc.sendClaimedAt
      if (failure.kind === 'not_sent') doc.sendAttempts! -= 1
      if (failure.kind === 'give_up') {
        doc.sendAttempts = Math.max(doc.sendAttempts ?? 0, MAX_SEND_ATTEMPTS)
      }
    },
  }
  return store
}

function reminders(count: number, year = 2026): FakeDoc[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `id-${year}-${index}`,
    email: `person${index}@example.com`,
    year,
  }))
}

function createClock(start = '2026-12-01T08:00:00Z') {
  let time = new Date(start).getTime()
  return {
    now: () => new Date(time),
    sleep: vi.fn(async (ms: number) => {
      time += ms
    }),
    advance: (ms: number) => {
      time += ms
    },
  }
}

function resendError(code: string, statusCode: number | null) {
  return new EmailSendError(`Failed to send email: ${code}`, code, statusCode)
}

const BUDGET_MS = 240_000

async function run(
  store: ReminderSendStore,
  send: (reminder: ClaimedReminder) => Promise<{ id: string | null }>,
  clock = createClock(),
  budgetMs = BUDGET_MS
) {
  return sendYearEndReminders({
    year: 2026,
    store,
    send,
    budgetMs,
    now: clock.now,
    sleep: clock.sleep,
  })
}

describe('sendYearEndReminders', () => {
  it("emails every address for the year once and leaves next year's alone", async () => {
    const docs = [...reminders(3), ...reminders(2, 2027)]
    const send = vi.fn(async (reminder: ClaimedReminder) => ({
      id: `email-${reminder.id}`,
    }))

    const result = await run(createFakeStore(docs), send)

    expect(send.mock.calls.map(([reminder]) => reminder.email)).toEqual([
      'person0@example.com',
      'person1@example.com',
      'person2@example.com',
    ])
    expect(result).toEqual({
      year: 2026,
      total: 3,
      alreadySent: 0,
      sentNow: 3,
      failed: 0,
      left: 0,
      needsCheck: 0,
      stopped: 'done',
    })
    expect(docs[0]).toMatchObject({
      sentAt: expect.any(Date),
      sendEmailId: 'email-id-2026-0',
      sendAttempts: 1,
    })
    expect(docs.filter((doc) => doc.year === 2027 && doc.sentAt)).toHaveLength(
      0
    )
  })

  it('sends nothing on a second run', async () => {
    const store = createFakeStore(reminders(3))
    const send = vi.fn(async () => ({ id: 'email' }))
    await run(store, send)
    send.mockClear()

    const result = await run(store, send)

    expect(send).not.toHaveBeenCalled()
    expect(result).toMatchObject({ alreadySent: 3, sentNow: 0, left: 0 })
  })

  it('keeps under the rate limit by spacing sends out', async () => {
    const clock = createClock()
    const starts: number[] = []
    const send = vi.fn(async () => {
      starts.push(clock.now().getTime())
      return { id: 'email' }
    })

    await run(createFakeStore(reminders(4)), send, clock)

    const gaps = starts.slice(1).map((start, index) => start - starts[index])
    expect(gaps.every((gap) => gap >= MIN_SEND_INTERVAL_MS)).toBe(true)
  })

  it('records a rejected email without the address and retries it on a later run', async () => {
    const docs = reminders(2)
    const store = createFakeStore(docs)
    const clock = createClock()
    const send = vi.fn(async (reminder: ClaimedReminder) => {
      if (reminder.email === 'person0@example.com') {
        throw resendError('validation_error', 422)
      }
      return { id: 'email' }
    })

    const first = await run(store, send, clock)

    expect(first).toMatchObject({
      sentNow: 1,
      failed: 1,
      left: 1,
      lastError: 'validation_error',
    })
    expect(docs[0]).toMatchObject({
      sendAttempts: 1,
      sendError: 'validation_error',
      sendFailedAt: expect.any(Date),
    })
    expect(docs[0].sendClaimedAt).toBeUndefined()
    expect(JSON.stringify(first)).not.toContain('@')

    const tooSoon = await run(store, send, clock)
    expect(tooSoon.sentNow + tooSoon.failed).toBe(0)

    clock.advance(RETRY_DELAY_MS + 1000)
    send.mockImplementation(async () => ({ id: 'email' }))
    const later = await run(store, send, clock)

    expect(later).toMatchObject({ sentNow: 1, failed: 0, left: 0 })
    expect(docs[0].sendAttempts).toBe(2)
  })

  it(`gives up after ${MAX_SEND_ATTEMPTS} rejected attempts`, async () => {
    const docs = reminders(1)
    const store = createFakeStore(docs)
    const clock = createClock()
    const send = vi.fn<ReminderSender>(async () => {
      throw resendError('validation_error', 422)
    })

    for (let attempt = 0; attempt < MAX_SEND_ATTEMPTS + 2; attempt++) {
      await run(store, send, clock)
      clock.advance(RETRY_DELAY_MS + 1000)
    }

    expect(send).toHaveBeenCalledTimes(MAX_SEND_ATTEMPTS)
    expect(await store.count(clock.now())).toMatchObject({
      failed: 1,
      needsCheck: 1,
      ready: 0,
    })
  })

  it('retries an email whose outcome is unknown with the same idempotency key, only inside the window', async () => {
    const docs = reminders(1)
    const store = createFakeStore(docs)
    const clock = createClock()
    const send = vi.fn<ReminderSender>(async () => {
      throw resendError('internal_server_error', 500)
    })

    await run(store, send, clock)
    expect(docs[0]).toMatchObject({
      sendClaimedAt: expect.any(Date),
      sendError: 'internal_server_error',
    })

    clock.advance(RETRY_DELAY_MS + 1000)
    send.mockImplementation(async () => ({ id: 'original-email' }))
    const retry = await run(store, send, clock)

    expect(retry.sentNow).toBe(1)
    expect(send).toHaveBeenLastCalledWith({
      id: 'id-2026-0',
      email: 'person0@example.com',
    })
    expect(reminderIdempotencyKey(2026, 'id-2026-0')).toBe(
      'year-end-reminder/2026/id-2026-0'
    )
  })

  it('leaves an unconfirmed send alone once Resend may have forgotten its key', async () => {
    const docs = reminders(1)
    const store = createFakeStore(docs)
    const clock = createClock()
    const send = vi.fn<ReminderSender>(async () => {
      throw resendError('application_error', null)
    })
    await run(store, send, clock)

    clock.advance(IDEMPOTENCY_WINDOW_MS + 1000)
    send.mockClear()
    const result = await run(store, send, clock)

    expect(send).not.toHaveBeenCalled()
    expect(result).toMatchObject({ left: 1, needsCheck: 1 })
  })

  it('picks up a reminder abandoned by a run that crashed mid-send', async () => {
    const docs = reminders(1)
    const store = createFakeStore(docs)
    const clock = createClock()
    await store.claimNext(clock.now())

    const send = vi.fn(async () => ({ id: 'email' }))
    expect((await run(store, send, clock)).sentNow).toBe(0)

    clock.advance(RETRY_DELAY_MS + 1000)
    expect((await run(store, send, clock)).sentNow).toBe(1)
    expect(docs[0].sendAttempts).toBe(2)
  })

  it('stops at the daily quota without using up an attempt', async () => {
    const docs = reminders(3)
    const store = createFakeStore(docs)
    const send = vi.fn(async (reminder: ClaimedReminder) => {
      if (reminder.email === 'person1@example.com') {
        throw resendError('daily_quota_exceeded', 429)
      }
      return { id: 'email' }
    })

    const result = await run(store, send)

    expect(send).toHaveBeenCalledTimes(2)
    expect(result).toMatchObject({
      sentNow: 1,
      failed: 1,
      left: 2,
      stopped: 'quota',
    })
    expect(docs[1]).toMatchObject({
      sendAttempts: 0,
      sendError: 'daily_quota_exceeded',
    })
  })

  it('stops when Resend is misconfigured', async () => {
    const send = vi.fn<ReminderSender>(async () => {
      throw resendError('missing_api_key', null)
    })

    const result = await run(createFakeStore(reminders(3)), send)

    expect(send).toHaveBeenCalledTimes(1)
    expect(result.stopped).toBe('config')
  })

  it('waits and tries again when rate limited', async () => {
    const clock = createClock()
    const send = vi
      .fn()
      .mockRejectedValueOnce(
        new EmailSendError('slow down', 'rate_limit_exceeded', 429, 2000)
      )
      .mockResolvedValue({ id: 'email' })

    const result = await run(createFakeStore(reminders(1)), send, clock)

    expect(clock.sleep).toHaveBeenCalledWith(2000)
    expect(send).toHaveBeenCalledTimes(2)
    expect(result).toMatchObject({ sentNow: 1, failed: 0 })
  })

  it('stops after several failures in a row', async () => {
    const send = vi.fn<ReminderSender>(async () => {
      throw resendError('validation_error', 422)
    })

    const result = await run(createFakeStore(reminders(10)), send)

    expect(send).toHaveBeenCalledTimes(MAX_CONSECUTIVE_FAILURES)
    expect(result).toMatchObject({
      failed: MAX_CONSECUTIVE_FAILURES,
      stopped: 'failures',
    })
  })

  it('stops at its time budget and leaves the rest for the next run', async () => {
    const clock = createClock()
    const store = createFakeStore(reminders(10))
    const send = vi.fn(async () => {
      clock.advance(1000)
      return { id: 'email' }
    })

    const result = await run(store, send, clock, 3500)

    expect(result).toMatchObject({ sentNow: 4, left: 6, stopped: 'time' })

    const next = await run(store, send, clock)
    expect(next).toMatchObject({ alreadySent: 4, sentNow: 6, left: 0 })
  })
})

describe('classifySendError', () => {
  it.each([
    [resendError('validation_error', 422), 'rejected', undefined],
    [resendError('internal_server_error', 500), 'unknown', undefined],
    [resendError('application_error', null), 'unknown', undefined],
    [resendError('concurrent_idempotent_requests', 409), 'unknown', undefined],
    [resendError('invalid_idempotent_request', 409), 'give_up', undefined],
    [resendError('daily_quota_exceeded', 429), 'not_sent', 'quota'],
    [resendError('monthly_quota_exceeded', 429), 'not_sent', 'quota'],
    [resendError('invalid_from_address', 403), 'not_sent', 'config'],
    [resendError('rate_limit_exceeded', 429), 'not_sent', 'rate_limit'],
    [new Error('boom'), 'unknown', undefined],
  ])('sorts %s', (error, kind, stop) => {
    const failure = classifySendError(error)

    expect(failure.kind).toBe(kind)
    expect(failure.stop).toBe(stop)
  })

  it('never stores anything but a plain error code', () => {
    expect(
      classifySendError(resendError('ana@example.com is invalid', 422)).code
    ).toBe('unknown_error')
  })
})
