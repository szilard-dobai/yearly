import { requireAdmin } from '@/lib/tracking/api'
import { getLaunchSendStatus, runLaunchSend } from '@/lib/waitlist/launch-send'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SEND_BUDGET_MS = 40_000

export async function GET(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    return NextResponse.json(await getLaunchSendStatus())
  } catch (error) {
    console.error('Failed to read the launch email status:', error)
    return NextResponse.json(
      { error: 'Failed to read the launch email status' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const run = await runLaunchSend({ budgetMs: SEND_BUDGET_MS })
    if ('blocked' in run) {
      return NextResponse.json({ error: run.blocked }, { status: 409 })
    }
    return NextResponse.json(run.result)
  } catch (error) {
    console.error('Video launch email run failed:', error)
    return NextResponse.json(
      { error: 'Video launch email run failed' },
      { status: 500 }
    )
  }
}
