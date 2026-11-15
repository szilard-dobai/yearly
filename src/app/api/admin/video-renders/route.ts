import { requireAdmin } from '@/lib/tracking/api'
import { isVideoPack } from '@/lib/video-render/packs'
import { exampleRenderId } from '@/lib/video-render/props'
import { renderVideoPack } from '@/lib/video-render/workflow'
import { NextResponse } from 'next/server'
import { start } from 'workflow/api'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  const body: unknown = await request.json().catch(() => null)
  const pack =
    body && typeof body === 'object' && 'pack' in body ? body.pack : null
  if (!isVideoPack(pack)) {
    return NextResponse.json(
      { error: 'pack must be year or month' },
      { status: 400 }
    )
  }

  const renderId = exampleRenderId()
  const run = await start(renderVideoPack, [{ renderId, pack }])
  return NextResponse.json({ runId: run.runId, renderId }, { status: 202 })
}
