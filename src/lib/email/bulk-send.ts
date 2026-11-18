import { EmailSendError } from './send'

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

export type ClaimedRecipient = {
  id: string
  email: string
  maybeSentBefore: boolean
}

// rejected: Resend refused it, so it wasn't sent; unknown: it may have been sent,
// so only a retry with the same idempotency key is safe; not_sent: an account
// problem that isn't this recipient's fault; give_up: never retry automatically
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

export type BulkSendCounts = {
  total: number
  sent: number
  failed: number
  ready: number
  needsCheck: number
}

export interface BulkSendStore {
  count(now: Date): Promise<BulkSendCounts>
  claimNext(now: Date): Promise<ClaimedRecipient | null>
  markSent(
    recipient: ClaimedRecipient,
    emailId: string | null,
    now: Date
  ): Promise<void>
  markFailed(
    recipient: ClaimedRecipient,
    failure: SendFailure,
    now: Date
  ): Promise<void>
}

export type BulkSender = (
  recipient: ClaimedRecipient
) => Promise<{ id: string | null }>

export type BulkSendResult = {
  total: number
  alreadySent: number
  sentNow: number
  failed: number
  left: number
  needsCheck: number
  stopped: StopReason
  lastError?: string
}

export const FAILED_RUN_STOPS = new Set<StopReason>(['config', 'failures'])

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

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function sendBulkEmail({
  store,
  send,
  budgetMs,
  now = () => new Date(),
  sleep = wait,
}: {
  store: BulkSendStore
  send: BulkSender
  budgetMs: number
  now?: () => Date
  sleep?: (ms: number) => Promise<unknown>
}): Promise<BulkSendResult> {
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
    recipient: ClaimedRecipient
  ): Promise<{ id: string | null } | SendFailure> => {
    for (let retry = 0; ; retry++) {
      await pace()
      try {
        return await send(recipient)
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
    const recipient = await store.claimNext(now())
    if (!recipient) break

    const outcome = await attempt(recipient)
    if (!('kind' in outcome)) {
      await store.markSent(recipient, outcome.id, now())
      sentNow++
      consecutiveFailures = 0
      continue
    }

    await store.markFailed(recipient, outcome, now())
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
