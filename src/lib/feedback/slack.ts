import { getCountryName } from '@/lib/admin/format'
import { getFlagEmoji } from '@/lib/countries'
import type { FeedbackDocument } from '@/lib/mongodb'
import { FEEDBACK_SOURCE_LABELS } from './types'

export type FeedbackNotificationKind = 'created' | 'message_added'

type NotifiedFeedback = Pick<
  FeedbackDocument,
  | 'rating'
  | 'message'
  | 'source'
  | 'context'
  | 'deviceType'
  | 'country'
  | 'region'
>

const TITLES: Record<FeedbackNotificationKind, string> = {
  created: 'New feedback',
  message_added: 'Message added to feedback',
}

const PREVIEW_LENGTH = 120
const REQUEST_TIMEOUT_MS = 5000

export function escapeSlackText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function formatRating(rating: number | null): string {
  if (rating == null) return 'No rating'
  return `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`
}

function formatLocation({ country, region }: NotifiedFeedback): string {
  if (!country) return 'Unknown location'
  const name = `${getFlagEmoji(country)} ${getCountryName(country)}`
  return region ? `${name} (${region})` : name
}

function formatSource({ source, context }: NotifiedFeedback): string {
  const label = FEEDBACK_SOURCE_LABELS[source]
  const details = [context?.exportType, context?.year].filter(Boolean)
  return details.length > 0 ? `${label} (${details.join(' ')})` : label
}

function truncate(text: string, length: number): string {
  return text.length > length ? `${text.slice(0, length - 1)}…` : text
}

export function buildFeedbackSlackMessage(
  feedback: NotifiedFeedback,
  kind: FeedbackNotificationKind,
  siteUrl?: string
) {
  const title = TITLES[kind]
  const rating = formatRating(feedback.rating)
  const details = [
    formatLocation(feedback),
    feedback.deviceType,
    formatSource(feedback),
  ]
    .filter(Boolean)
    .join(' · ')
  const adminLink = siteUrl
    ? ` · <${siteUrl.replace(/\/$/, '')}/admin/feedback|Open in admin>`
    : ''
  const preview = feedback.message
    ? ` – “${truncate(feedback.message, PREVIEW_LENGTH)}”`
    : ''

  return {
    text: escapeSlackText(`${title}: ${rating}${preview}`),
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*${title}*  ${rating}` },
      },
      ...(feedback.message
        ? [
            {
              type: 'section',
              text: { type: 'plain_text', text: feedback.message, emoji: true },
            },
          ]
        : []),
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `${escapeSlackText(details)}${adminLink}` },
        ],
      },
    ],
  }
}

export async function notifyFeedbackToSlack(
  feedback: NotifiedFeedback,
  kind: FeedbackNotificationKind
): Promise<void> {
  const webhookUrl = process.env.SLACK_FEEDBACK_WEBHOOK_URL
  if (!webhookUrl) return

  const message = buildFeedbackSlackMessage(
    feedback,
    kind,
    process.env.NEXT_PUBLIC_SITE_URL
  )

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!response.ok) {
      console.error(
        'Slack feedback notification failed:',
        response.status,
        await response.text()
      )
    }
  } catch (error) {
    console.error('Slack feedback notification failed:', error)
  }
}
