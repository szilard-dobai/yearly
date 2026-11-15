import { EmailSendError } from '@/lib/email/send'
import { ObjectId } from 'mongodb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'

const { collection, getRemindersCollection, sendEmail, notifySend } =
  vi.hoisted(() => {
    const collection = {
      countDocuments: vi.fn(),
      findOneAndUpdate: vi.fn(),
      updateOne: vi.fn(),
    }
    return {
      collection,
      getRemindersCollection: vi.fn(async () => collection),
      sendEmail: vi.fn(),
      notifySend: vi.fn(),
    }
  })

vi.mock('@/lib/mongodb', () => ({ getRemindersCollection }))
vi.mock('@/lib/email/send', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/email/send')>()),
  sendEmail,
}))
vi.mock('@/lib/reminders/slack', () => ({
  notifyReminderSendToSlack: notifySend,
}))

const REMINDER_ID = new ObjectId('6650f0a0c0ffee0000000001')

function call(authorization?: string, query = '') {
  return GET(
    new Request(`http://localhost:3000/api/cron/year-end-reminders${query}`, {
      headers: authorization ? { authorization } : {},
    })
  )
}

function setCounts(counts: {
  total: number
  sent: number
  failed?: number
  ready: number
  needsCheck?: number
}) {
  collection.countDocuments.mockImplementation(async (filter) => {
    if (filter.$or && filter.sendAttempts) return counts.ready
    if (filter.$or) return counts.needsCheck ?? 0
    if (filter.sendError) return counts.failed ?? 0
    if (filter.sentAt?.$exists === true) return counts.sent
    return counts.total
  })
}

describe('/api/cron/year-end-reminders', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['Date'],
      now: new Date('2026-12-01T08:05:00Z'),
    })
    vi.stubEnv('CRON_SECRET', 'cron-secret')
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('ACCOUNTS_ENABLED', 'true')
    vi.spyOn(console, 'info').mockImplementation(() => {})
    setCounts({ total: 2, sent: 0, ready: 2 })
    collection.findOneAndUpdate
      .mockResolvedValueOnce({ _id: REMINDER_ID, email: 'ana@example.com' })
      .mockResolvedValue(null)
    collection.updateOne.mockResolvedValue({ modifiedCount: 1 })
    sendEmail.mockResolvedValue({ id: 'resend-email-1' })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetAllMocks()
  })

  it('refuses calls without the cron secret', async () => {
    expect((await call()).status).toBe(401)
    expect((await call('Bearer wrong')).status).toBe(401)
    expect((await call(undefined, '?dryRun=1')).status).toBe(401)
    expect(getRemindersCollection).not.toHaveBeenCalled()
  })

  it('refuses every call when no secret is configured', async () => {
    vi.stubEnv('CRON_SECRET', '')

    expect((await call('Bearer ')).status).toBe(401)
  })

  it('sends on the reminder date in production', async () => {
    setCounts({ total: 2, sent: 1, ready: 0 })

    const response = await call('Bearer cron-secret')

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      dryRun: false,
      year: 2026,
      sentNow: 1,
      failed: 0,
      stopped: 'done',
    })
    expect(collection.findOneAndUpdate.mock.calls[0][0]).toMatchObject({
      year: 2026,
      sentAt: { $exists: false },
    })
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ana@example.com',
        subject: 'Your 1 Dec reminder to share your 2026 Yearly',
        replyTo: 'hello@yearly.world',
      }),
      { idempotencyKey: `year-end-reminder/2026/${REMINDER_ID.toHexString()}` }
    )
    expect(collection.updateOne).toHaveBeenCalledWith(
      { _id: REMINDER_ID },
      {
        $set: { sentAt: expect.any(Date), sendEmailId: 'resend-email-1' },
        $unset: { sendClaimedAt: '' },
      }
    )
  })

  it('posts counts to Slack, never addresses', async () => {
    await call('Bearer cron-secret')

    expect(notifySend).toHaveBeenCalledWith(
      expect.objectContaining({ sentNow: 1 }),
      'cron'
    )
    expect(JSON.stringify(notifySend.mock.calls)).not.toContain('@')
  })

  it('stays quiet in Slack when there was nothing to send', async () => {
    collection.findOneAndUpdate.mockReset().mockResolvedValue(null)

    await call('Bearer cron-secret')

    expect(notifySend).not.toHaveBeenCalled()
  })

  it('does nothing on any other day and says so', async () => {
    vi.setSystemTime(new Date('2026-11-25T08:00:00Z'))

    const response = await call('Bearer cron-secret')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      dryRun: false,
      skipped: 'Reminders only send from 1 Dec to 3 Dec (UTC)',
    })
    expect(getRemindersCollection).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it.each(['preview', 'development', undefined])(
    'never sends outside production (%s)',
    async (vercelEnv) => {
      vi.stubEnv('VERCEL_ENV', vercelEnv)

      const response = await call('Bearer cron-secret')

      expect(await response.json()).toEqual({
        dryRun: false,
        skipped: 'Reminders only send from production',
      })
      expect(getRemindersCollection).not.toHaveBeenCalled()
      expect(sendEmail).not.toHaveBeenCalled()
    }
  )

  it('counts what it would send in a dry run without sending', async () => {
    setCounts({ total: 40, sent: 0, ready: 40 })

    const response = await call('Bearer cron-secret', '?dryRun=1')

    expect(await response.json()).toEqual({
      dryRun: true,
      sendsToday: true,
      year: 2026,
      total: 40,
      alreadySent: 0,
      failed: 0,
      left: 40,
      wouldSend: 40,
      needsCheck: 0,
    })
    expect(collection.findOneAndUpdate).not.toHaveBeenCalled()
    expect(collection.updateOne).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('says why a dry run before the date would not send', async () => {
    vi.setSystemTime(new Date('2026-11-25T10:00:00Z'))
    setCounts({ total: 40, sent: 0, ready: 40 })

    const body = await (await call('Bearer cron-secret', '?dryRun=1')).json()

    expect(body).toMatchObject({
      dryRun: true,
      sendsToday: false,
      reason: 'Reminders only send from 1 Dec to 3 Dec (UTC)',
      year: 2026,
      wouldSend: 40,
    })
  })

  it('reports a Resend configuration problem as a failed run', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    sendEmail.mockRejectedValue(
      new EmailSendError('RESEND_API_KEY is not set', 'missing_api_key', null)
    )

    const response = await call('Bearer cron-secret')

    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({
      stopped: 'config',
      lastError: 'missing_api_key',
    })
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
      '@'
    )
  })

  it('reports a database failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    collection.countDocuments.mockRejectedValue(new Error('down'))

    const response = await call('Bearer cron-secret')

    expect(response.status).toBe(500)
    expect(sendEmail).not.toHaveBeenCalled()
  })
})
