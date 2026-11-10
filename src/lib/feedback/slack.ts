import type { FeedbackDocument } from '@/lib/mongodb'
import {
  escapeSlackText,
  formatSlackLocation,
  postSlackMessage,
  slackAdminLink,
} from '@/lib/slack'
import { FEEDBACK_SOURCE_LABELS, FEEDBACK_TAG_LABELS } from './types'

export type FeedbackNotificationKind = 'created' | 'message_added'

type NotifiedFeedback = Pick<
  FeedbackDocument,
  | 'rating'
  | 'message'
  | 'tags'
  | 'source'
  | 'context'
  | 'deviceType'
  | 'country'
  | 'region'
>

const TITLES: Record<FeedbackNotificationKind, string> = {
  created: 'New feedback',
  message_added: 'Details added to feedback',
}

const PREVIEW_LENGTH = 120

function formatRating(rating: number | null): string {
  if (rating == null) return 'No rating'
  return `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`
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
    formatSlackLocation(feedback.country, feedback.region),
    feedback.deviceType,
    formatSource(feedback),
  ]
    .filter(Boolean)
    .join(' · ')
  const adminLink = slackAdminLink('/admin/feedback', siteUrl)
  const tags = feedback.tags?.map((tag) => FEEDBACK_TAG_LABELS[tag]) ?? []
  const preview = feedback.message
    ? ` – “${truncate(feedback.message, PREVIEW_LENGTH)}”`
    : tags.length > 0
      ? ` – ${tags.join(', ')}`
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
      ...(tags.length > 0
        ? [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: tags.map((tag) => `\`${tag}\``).join('  '),
              },
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

  await postSlackMessage(webhookUrl, message, 'feedback')
}
