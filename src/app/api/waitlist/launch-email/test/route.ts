import { EmailSendError, sendEmail } from '@/lib/email/send'
import { videoLaunchEmail } from '@/lib/email/video-launch'
import { testReminderEmailSchema } from '@/lib/reminders/types'
import { requireAdmin } from '@/lib/tracking/api'
import { formatFreeVideoLastDay } from '@/lib/video-offer'
import { getPostalAddress } from '@/lib/waitlist/launch-send'
import {
  createUnsubscribeToken,
  getUnsubscribeUrls,
  isUnsubscribeConfigured,
} from '@/lib/waitlist/unsubscribe'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const TEST_WAITLIST_ID = '0'.repeat(24)

export async function POST(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  const parsed = testReminderEmailSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please enter a valid email address' },
      { status: 400 }
    )
  }

  const token = isUnsubscribeConfigured()
    ? createUnsubscribeToken(TEST_WAITLIST_ID)
    : 'test'

  try {
    await sendEmail(
      videoLaunchEmail(parsed.data.email, {
        freeUntil: formatFreeVideoLastDay(),
        postalAddress: getPostalAddress() ?? 'EMAIL_POSTAL_ADDRESS is not set',
        unsubscribe: getUnsubscribeUrls(token),
      })
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    const code =
      error instanceof EmailSendError ? error.code : 'unexpected_error'
    console.error('Test launch email failed:', code)
    return NextResponse.json(
      { error: `Couldn't send the test (${code})` },
      { status: 502 }
    )
  }
}
