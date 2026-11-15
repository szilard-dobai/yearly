import { requireAdmin } from '@/lib/tracking/api'
import { getVideoDownloadUrl } from '@/lib/video-render/blob'
import type { RenderedVideo } from '@/lib/video-render/packs'
import { NextResponse } from 'next/server'
import { getRun } from 'workflow/api'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  const { runId } = await params
  const run = getRun<RenderedVideo[]>(runId)
  if (!(await run.exists)) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  }

  const status = await run.status
  if (status !== 'completed') return NextResponse.json({ status })

  const videos = await Promise.all(
    (await run.returnValue).map(async (video) => ({
      ...video,
      url: await getVideoDownloadUrl(video.pathname),
    }))
  )
  return NextResponse.json({ status, videos })
}
