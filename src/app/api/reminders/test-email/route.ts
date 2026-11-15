import { isAccountsEnabled } from '@/lib/auth/enabled'
import { EmailSendError, sendEmail } from '@/lib/email/send'
import { yearEndReminderEmail } from '@/lib/email/year-end-reminder'
import { getReminderSendYear } from '@/lib/reminders/date'
import { testReminderEmailSchema } from '@/lib/reminders/types'
import { requireAdmin } from '@/lib/tracking/api'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

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

  const now = new Date()
  const year = getReminderSendYear(now) ?? now.getUTCFullYear()

  try {
    await sendEmail(
      yearEndReminderEmail(parsed.data.email, year, {
        accountsEnabled: isAccountsEnabled(),
      })
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    const code =
      error instanceof EmailSendError ? error.code : 'unexpected_error'
    console.error('Test reminder email failed:', code)
    return NextResponse.json(
      { error: `Couldn't send the test (${code})` },
      { status: 502 }
    )
  }
}
