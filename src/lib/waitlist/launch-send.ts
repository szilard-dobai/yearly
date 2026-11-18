import {
  type BulkSender,
  type BulkSendResult,
  FAILED_RUN_STOPS,
  sendBulkEmail,
} from '@/lib/email/bulk-send'
import { createBulkSendStore } from '@/lib/email/bulk-send-store'
import { sendEmail } from '@/lib/email/send'
import { videoLaunchEmail } from '@/lib/email/video-launch'
import { getWaitlistCollection } from '@/lib/mongodb'
import { FREE_VIDEO_LAST_DAY, formatFreeVideoLastDay } from '@/lib/video-offer'
import { isVideoSalesEnabled } from '@/lib/videos/enabled'
import type { WaitlistFeature } from './types'
import {
  createUnsubscribeToken,
  getUnsubscribeUrls,
  isUnsubscribeConfigured,
} from './unsubscribe'

const LAUNCH_FEATURE: WaitlistFeature = 'animated_video'
const LAUNCH_SCOPE = { feature: LAUNCH_FEATURE }
const DAY_MS = 24 * 60 * 60 * 1000

export type LaunchSendStatus = {
  total: number
  sent: number
  failed: number
  left: number
  needsCheck: number
  freeUntil: string
  blocked: string | null
}

export function getPostalAddress(): string | null {
  return process.env.EMAIL_POSTAL_ADDRESS?.trim() || null
}

function freeVideoOfferEnd(): Date {
  return new Date(
    new Date(`${FREE_VIDEO_LAST_DAY}T00:00:00Z`).getTime() + DAY_MS
  )
}

export function getLaunchSendBlock(now = new Date()): string | null {
  if (process.env.VERCEL_ENV !== 'production') {
    return 'The launch email only sends from production'
  }
  if (!isVideoSalesEnabled()) return 'Turn on video sales first'
  if (!getPostalAddress()) return 'Set EMAIL_POSTAL_ADDRESS first'
  if (!isUnsubscribeConfigured()) return 'Set BETTER_AUTH_SECRET first'
  if (now >= freeVideoOfferEnd()) {
    return `The free video offer ended on ${formatFreeVideoLastDay()}`
  }
  return null
}

export function launchIdempotencyKey(waitlistId: string) {
  return `video-launch/${waitlistId}`
}

export function createLaunchSender(postalAddress: string): BulkSender {
  const freeUntil = formatFreeVideoLastDay()
  return (recipient) =>
    sendEmail(
      videoLaunchEmail(recipient.email, {
        freeUntil,
        postalAddress,
        unsubscribe: getUnsubscribeUrls(createUnsubscribeToken(recipient.id)),
      }),
      { idempotencyKey: launchIdempotencyKey(recipient.id) }
    )
}

async function createLaunchSendStore() {
  return createBulkSendStore(await getWaitlistCollection(), LAUNCH_SCOPE)
}

export async function getLaunchSendStatus(
  now = new Date()
): Promise<LaunchSendStatus> {
  const counts = await (await createLaunchSendStore()).count(now)
  return {
    total: counts.total,
    sent: counts.sent,
    failed: counts.failed,
    left: counts.total - counts.sent,
    needsCheck: counts.needsCheck,
    freeUntil: formatFreeVideoLastDay(),
    blocked: getLaunchSendBlock(now),
  }
}

export async function runLaunchSend({
  budgetMs,
}: {
  budgetMs: number
}): Promise<{ blocked: string } | { result: BulkSendResult }> {
  const blocked = getLaunchSendBlock()
  const postalAddress = getPostalAddress()
  if (blocked || !postalAddress) {
    return { blocked: blocked ?? 'Set EMAIL_POSTAL_ADDRESS first' }
  }

  const result = await sendBulkEmail({
    store: await createLaunchSendStore(),
    send: createLaunchSender(postalAddress),
    budgetMs,
  })

  console.info('Video launch email run:', JSON.stringify(result))
  if (FAILED_RUN_STOPS.has(result.stopped)) {
    console.error(
      'Video launch email run stopped:',
      result.stopped,
      result.lastError ?? ''
    )
  }
  return { result }
}
