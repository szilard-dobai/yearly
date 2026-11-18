import { isAccountsEnabled } from '@/lib/auth/enabled'
import { FAILED_RUN_STOPS } from '@/lib/email/bulk-send'
import { getRemindersCollection } from '@/lib/mongodb'
import { getReminderSendWindowLabel, getReminderSendYear } from './date'
import {
  createReminderSender,
  type ReminderSendResult,
  sendYearEndReminders,
} from './send'
import { createReminderSendStore } from './send-store'
import { notifyReminderSendToSlack, type ReminderSendTrigger } from './slack'

export function getReminderSendBlock(
  now = new Date(),
  vercelEnv = process.env.VERCEL_ENV
): string | null {
  if (vercelEnv !== 'production') return 'Reminders only send from production'
  if (getReminderSendYear(now) === null) {
    return `Reminders only send from ${getReminderSendWindowLabel()}`
  }
  return null
}

export type ReminderSendPreview = {
  year: number
  total: number
  alreadySent: number
  failed: number
  left: number
  wouldSend: number
  needsCheck: number
}

export async function previewReminderSend(
  now = new Date()
): Promise<ReminderSendPreview> {
  const year = getReminderSendYear(now) ?? now.getUTCFullYear()
  const store = createReminderSendStore(await getRemindersCollection(), year)
  const counts = await store.count(now)
  return {
    year,
    total: counts.total,
    alreadySent: counts.sent,
    failed: counts.failed,
    left: counts.total - counts.sent,
    wouldSend: counts.ready,
    needsCheck: counts.needsCheck,
  }
}

export async function runReminderSend({
  trigger,
  budgetMs,
}: {
  trigger: ReminderSendTrigger
  budgetMs: number
}): Promise<{ blocked: string } | { result: ReminderSendResult }> {
  const now = new Date()
  const blocked = getReminderSendBlock(now)
  const year = getReminderSendYear(now)
  if (blocked || year === null) return { blocked: blocked ?? 'Not open' }

  const result = await sendYearEndReminders({
    year,
    store: createReminderSendStore(await getRemindersCollection(), year),
    send: createReminderSender(year, { accountsEnabled: isAccountsEnabled() }),
    budgetMs,
  })

  console.info(`Year-end reminder run (${trigger}):`, JSON.stringify(result))
  if (FAILED_RUN_STOPS.has(result.stopped)) {
    console.error(
      `Year-end reminder run stopped (${trigger}):`,
      result.stopped,
      result.lastError ?? ''
    )
  }
  if (result.sentNow > 0 || result.failed > 0) {
    await notifyReminderSendToSlack(result, trigger)
  }
  return { result }
}
