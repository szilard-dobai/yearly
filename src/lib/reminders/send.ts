import {
  type BulkSender,
  type BulkSendResult,
  type BulkSendStore,
  sendBulkEmail,
} from '@/lib/email/bulk-send'
import { sendEmail } from '@/lib/email/send'
import { yearEndReminderEmail } from '@/lib/email/year-end-reminder'

export type ReminderSendResult = BulkSendResult & { year: number }

export function reminderIdempotencyKey(year: number, id: string) {
  return `year-end-reminder/${year}/${id}`
}

export function createReminderSender(
  year: number,
  { accountsEnabled }: { accountsEnabled: boolean }
): BulkSender {
  return (reminder) =>
    sendEmail(yearEndReminderEmail(reminder.email, year, { accountsEnabled }), {
      idempotencyKey: reminderIdempotencyKey(year, reminder.id),
    })
}

export async function sendYearEndReminders({
  year,
  ...options
}: {
  year: number
  store: BulkSendStore
  send: BulkSender
  budgetMs: number
  now?: () => Date
  sleep?: (ms: number) => Promise<unknown>
}): Promise<ReminderSendResult> {
  return { year, ...(await sendBulkEmail(options)) }
}
