import {
  escapeSlackText,
  formatSlackLocation,
  postSlackMessage,
  slackAdminLink,
  type SlackMessage,
} from '@/lib/slack'
import type { DeviceType } from '@/lib/tracking/types'
import type { ReminderMethod, ReminderTotals } from './types'

export type NotifiedReminder = {
  method: ReminderMethod
  deviceType?: DeviceType
  country?: string
  region?: string
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
    ? `Someone from ${formatSlackLocation(reminder.country, reminder.region)}`
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
