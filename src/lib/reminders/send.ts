import { EmailSendError, sendEmail } from '@/lib/email/send'
import { yearEndReminderEmail } from '@/lib/email/year-end-reminder'

export const MAX_SEND_ATTEMPTS = 3
export const CLAIM_TIMEOUT_MS = 10 * 60 * 1000
export const RETRY_DELAY_MS = CLAIM_TIMEOUT_MS
// Resend remembers idempotency keys for 24 hours
export const IDEMPOTENCY_WINDOW_MS = 23 * 60 * 60 * 1000
export const MIN_SEND_INTERVAL_MS = 250
export const MAX_CONSECUTIVE_FAILURES = 5
export const RATE_LIMIT_RETRIES = 3
const DEFAULT_RATE_LIMIT_WAIT_MS = 1000
const MAX_RATE_LIMIT_WAIT_MS = 10_000

export type ClaimedReminder = { id: string; email: string }

// rejected: Resend refused it, so it wasn't sent; unknown: it may have been sent,
// so only a retry with the same idempotency key is safe; not_sent: an account
// problem that isn't this reminder's fault; give_up: never retry automatically
export type FailureKind = 'rejected' | 'unknown' | 'not_sent' | 'give_up'

export type SendFailure = {
  kind: FailureKind
  code: string
  stop?: StopReason
}

export type StopReason =
  | 'done'
  | 'time'
  | 'quota'
  | 'rate_limit'
  | 'config'
  | 'failures'

export type ReminderSendCounts = {
  total: number
  sent: number
  failed: number
  ready: number
  needsCheck: number
}

export interface ReminderSendStore {
  count(now: Date): Promise<ReminderSendCounts>
  claimNext(now: Date): Promise<ClaimedReminder | null>
  markSent(id: string, emailId: string | null, now: Date): Promise<void>
  markFailed(id: string, failure: SendFailure, now: Date): Promise<void>
}

export type ReminderSender = (
  reminder: ClaimedReminder
) => Promise<{ id: string | null }>

export type ReminderSendResult = {
  year: number
  total: number
  alreadySent: number
  sentNow: number
  failed: number
  left: number
  needsCheck: number
  stopped: StopReason
  lastError?: string
}

const QUOTA_CODES = new Set(['daily_quota_exceeded', 'monthly_quota_exceeded'])
const CONFIG_CODES = new Set([
  'missing_api_key',
  'invalid_api_key',
  'restricted_api_key',
  'invalid_from_address',
  'invalid_access',
  'invalid_region',
  'security_error',
])

function safeCode(code: string) {
  return /^[a-z_]{1,64}$/.test(code) ? code : 'unknown_error'
}

export function classifySendError(error: unknown): SendFailure {
  if (!(error instanceof EmailSendError)) {
    return { kind: 'unknown', code: 'unexpected_error' }
  }
  const code = safeCode(error.code)
  if (code === 'rate_limit_exceeded') {
    return { kind: 'not_sent', code, stop: 'rate_limit' }
  }
  if (QUOTA_CODES.has(code)) return { kind: 'not_sent', code, stop: 'quota' }
  if (CONFIG_CODES.has(code)) return { kind: 'not_sent', code, stop: 'config' }
  if (code === 'invalid_idempotent_request') return { kind: 'give_up', code }
  if (code === 'concurrent_idempotent_requests') {
    return { kind: 'unknown', code }
  }
  if (error.statusCode === null || error.statusCode >= 500) {
    return { kind: 'unknown', code }
  }
  return { kind: 'rejected', code }
}

export function reminderIdempotencyKey(year: number, id: string) {
  return `year-end-reminder/${year}/${id}`
}

export function createReminderSender(
  year: number,
  { accountsEnabled }: { accountsEnabled: boolean }
): ReminderSender {
  return (reminder) =>
    sendEmail(yearEndReminderEmail(reminder.email, year, { accountsEnabled }), {
      idempotencyKey: reminderIdempotencyKey(year, reminder.id),
    })
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function sendYearEndReminders({
  year,
  store,
  send,
  budgetMs,
  now = () => new Date(),
  sleep = wait,
}: {
  year: number
  store: ReminderSendStore
  send: ReminderSender
  budgetMs: number
  now?: () => Date
  sleep?: (ms: number) => Promise<unknown>
}): Promise<ReminderSendResult> {
  const deadline = now().getTime() + budgetMs
  const before = await store.count(now())
  let sentNow = 0
  let failed = 0
  let consecutiveFailures = 0
  let lastSendAt = Number.NEGATIVE_INFINITY
  let stopped: StopReason = 'done'
  let lastError: string | undefined

  const pace = async () => {
    const delay = lastSendAt + MIN_SEND_INTERVAL_MS - now().getTime()
    if (delay > 0) await sleep(delay)
    lastSendAt = now().getTime()
  }

  const attempt = async (
    reminder: ClaimedReminder
  ): Promise<{ id: string | null } | SendFailure> => {
    for (let retry = 0; ; retry++) {
      await pace()
      try {
        return await send(reminder)
      } catch (error) {
        const failure = classifySendError(error)
        if (
          failure.code === 'rate_limit_exceeded' &&
          retry < RATE_LIMIT_RETRIES
        ) {
          const delay = Math.min(
            (error instanceof EmailSendError && error.retryAfterMs) ||
              DEFAULT_RATE_LIMIT_WAIT_MS,
            MAX_RATE_LIMIT_WAIT_MS
          )
          if (now().getTime() + delay < deadline) {
            await sleep(delay)
            continue
          }
        }
        return failure
      }
    }
  }

  while (true) {
    if (now().getTime() >= deadline) {
      stopped = 'time'
      break
    }
    const reminder = await store.claimNext(now())
    if (!reminder) break

    const outcome = await attempt(reminder)
    if (!('kind' in outcome)) {
      await store.markSent(reminder.id, outcome.id, now())
      sentNow++
      consecutiveFailures = 0
      continue
    }

    await store.markFailed(reminder.id, outcome, now())
    failed++
    lastError = outcome.code
    if (outcome.stop) {
      stopped = outcome.stop
      break
    }
    if (++consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      stopped = 'failures'
      break
    }
  }

  const after = await store.count(now())
  return {
    year,
    total: after.total,
    alreadySent: before.sent,
    sentNow,
    failed,
    left: after.total - after.sent,
    needsCheck: after.needsCheck,
    stopped,
    ...(lastError && { lastError }),
  }
}
