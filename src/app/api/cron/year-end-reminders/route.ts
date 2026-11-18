import { isCronAuthorized } from '@/lib/cron'
import { FAILED_RUN_STOPS } from '@/lib/email/bulk-send'
import {
  getReminderSendBlock,
  previewReminderSend,
  runReminderSend,
} from '@/lib/reminders/send-run'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const SEND_BUDGET_MS = 240_000

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dryRun = new URL(request.url).searchParams.get('dryRun') === '1'

  try {
    if (dryRun) {
      const blocked = getReminderSendBlock()
      return NextResponse.json({
        dryRun: true,
        sendsToday: !blocked,
        ...(blocked && { reason: blocked }),
        ...(await previewReminderSend()),
      })
    }

    const run = await runReminderSend({
      trigger: 'cron',
      budgetMs: SEND_BUDGET_MS,
    })
    if ('blocked' in run) {
      console.info('Year-end reminder run skipped:', run.blocked)
      return NextResponse.json({ dryRun: false, skipped: run.blocked })
    }
    return NextResponse.json(
      { dryRun: false, ...run.result },
      { status: FAILED_RUN_STOPS.has(run.result.stopped) ? 500 : 200 }
    )
  } catch (error) {
    console.error('Year-end reminder run failed:', error)
    return NextResponse.json(
      { error: 'Year-end reminder run failed' },
      { status: 500 }
    )
  }
}
