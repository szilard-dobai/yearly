import { runReminderSend } from '@/lib/reminders/send-run'
import { requireAdmin } from '@/lib/tracking/api'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SEND_BUDGET_MS = 40_000

export async function POST(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const run = await runReminderSend({
      trigger: 'admin',
      budgetMs: SEND_BUDGET_MS,
    })
    if ('blocked' in run) {
      return NextResponse.json({ error: run.blocked }, { status: 409 })
    }
    return NextResponse.json(run.result)
  } catch (error) {
    console.error('Year-end reminder run failed (admin):', error)
    return NextResponse.json(
      { error: 'Year-end reminder run failed' },
      { status: 500 }
    )
  }
}
