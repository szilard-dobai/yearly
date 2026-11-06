import type { WaitlistDocument } from '@/lib/mongodb'
import {
  escapeSlackText,
  formatSlackLocation,
  postSlackMessage,
  slackAdminLink,
  type SlackMessage,
} from '@/lib/slack'
import { formatPrice } from '@/lib/video-offer'

type NotifiedSignup = Pick<
  WaitlistDocument,
  'context' | 'deviceType' | 'country' | 'region'
>

const VIDEO_KIND_LABELS = {
  year: 'year video',
  stats: 'stats video',
  month: 'month video',
}

export function buildWaitlistSlackMessage(
  signup: NotifiedSignup,
  total: number,
  siteUrl?: string
): SlackMessage {
  const title = `New video waitlist sign-up (${total} total)`
  const { context } = signup
  const details = [
    context?.price != null ? `Saw ${formatPrice(context.price)}` : null,
    context?.videoKind
      ? `on the ${VIDEO_KIND_LABELS[context.videoKind]}`
      : null,
    formatSlackLocation(signup.country, signup.region),
    signup.deviceType,
  ]
    .filter(Boolean)
    .join(' · ')

  return {
    text: escapeSlackText(title),
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

export async function notifyWaitlistToSlack(
  signup: NotifiedSignup,
  total: number
): Promise<void> {
  const webhookUrl = process.env.SLACK_FEEDBACK_WEBHOOK_URL
  if (!webhookUrl) return

  await postSlackMessage(
    webhookUrl,
    buildWaitlistSlackMessage(signup, total, process.env.NEXT_PUBLIC_SITE_URL),
    'waitlist'
  )
}
