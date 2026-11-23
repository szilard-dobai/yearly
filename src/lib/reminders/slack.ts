import {
  escapeSlackText,
  formatSlackLocation,
  postSlackMessage,
  slackAdminLink,
  type SlackMessage,
} from '@/lib/slack'
import type { DeviceType } from '@/lib/tracking/types'
import type { StopReason } from '@/lib/email/bulk-send'
import type { ReminderSendResult } from './send'
import type { ReminderMethod, ReminderTotals } from './types'

export type ReminderSendTrigger = 'cron' | 'admin'

export type NotifiedReminder = {
  method: ReminderMethod
  deviceType?: DeviceType
  country?: string
}

const METHOD_LABELS: Record<ReminderMethod, string> = {
  email: 'by email',
  ics: 'in their Apple or Outlook calendar',
  google: 'in Google Calendar',
}

function count(value: number, noun: string) {
  return `${value.toLocaleString('en')} ${noun}${value === 1 ? '' : 's'}`
}

export function buildReminderSlackMessage(
  reminder: NotifiedReminder,
  totals: ReminderTotals,
  siteUrl?: string
): SlackMessage {
  const who = reminder.country
    ? `Someone from ${formatSlackLocation(reminder.country)}`
    : 'Someone'
  const title = escapeSlackText(
    `${who} set a reminder ${METHOD_LABELS[reminder.method]}`
  )
  const details = [
    reminder.deviceType,
    `${count(totals.emails, 'email reminder')}, ${count(totals.calendarAdds, 'calendar add')} so far`,
  ]
    .filter(Boolean)
    .join(' · ')

  return {
    text: title,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: `*${title}*` } },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `${escapeSlackText(details)}${slackAdminLink('/admin/analytics', siteUrl)}`,
          },
        ],
      },
    ],
  }
}

const STOP_LABELS: Record<StopReason, string | null> = {
  done: null,
  time: 'Stopped at its time limit; the next run carries on',
  quota: "Stopped: Resend's daily or monthly quota is used up",
  rate_limit: "Stopped: Resend's rate limit",
  config: 'Stopped: check RESEND_API_KEY, EMAIL_FROM and the domain in Resend',
  failures: 'Stopped after several failures in a row',
}

export function buildReminderSendSlackMessage(
  result: ReminderSendResult,
  trigger: ReminderSendTrigger,
  siteUrl?: string
): SlackMessage {
  const title = [
    `Sent ${count(result.sentNow, 'year-end reminder email')}`,
    result.failed > 0 && `${result.failed.toLocaleString('en')} failed`,
  ]
    .filter(Boolean)
    .join(', ')
  const details = [
    String(result.year),
    `${(result.total - result.left).toLocaleString('en')} of ${result.total.toLocaleString('en')} sent, ${result.left.toLocaleString('en')} left`,
    result.needsCheck > 0 &&
      `${result.needsCheck.toLocaleString('en')} to check by hand`,
    STOP_LABELS[result.stopped],
    result.lastError && `last error ${result.lastError}`,
    trigger === 'cron' ? 'by the cron' : 'from admin',
  ]
    .filter(Boolean)
    .join(' · ')

  return {
    text: title,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: `*${title}*` } },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `${escapeSlackText(details)}${slackAdminLink('/admin/analytics', siteUrl)}`,
          },
        ],
      },
    ],
  }
}

export async function notifyReminderSendToSlack(
  result: ReminderSendResult,
  trigger: ReminderSendTrigger
): Promise<void> {
  const webhookUrl = process.env.SLACK_FEEDBACK_WEBHOOK_URL
  if (!webhookUrl) return

  await postSlackMessage(
    webhookUrl,
    buildReminderSendSlackMessage(
      result,
      trigger,
      process.env.NEXT_PUBLIC_SITE_URL
    ),
    'reminder send'
  )
}

export async function notifyReminderToSlack(
  reminder: NotifiedReminder,
  totals: ReminderTotals
): Promise<void> {
  const webhookUrl = process.env.SLACK_FEEDBACK_WEBHOOK_URL
  if (!webhookUrl) return

  await postSlackMessage(
    webhookUrl,
    buildReminderSlackMessage(
      reminder,
      totals,
      process.env.NEXT_PUBLIC_SITE_URL
    ),
    'reminder'
  )
}
