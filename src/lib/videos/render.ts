import type { Database } from '@/lib/db'
import type { VideoPack } from '@/lib/db/schema'
import { renderVideoPack } from '@/lib/video-render/workflow'
import { start } from 'workflow/api'
import { claimRenderStart, setRenderRun } from './orders'

export async function startRender(
  db: Database,
  renderId: string,
  pack: VideoPack
): Promise<void> {
  if (!(await claimRenderStart(db, renderId))) return
  try {
    const run = await start(renderVideoPack, [{ renderId, pack }])
    await setRenderRun(db, renderId, run.runId)
  } catch (error) {
    await setRenderRun(db, renderId, null)
    throw error
  }
}
