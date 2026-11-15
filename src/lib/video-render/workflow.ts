import { renderMediaOnVercel } from '@remotion/vercel'
import { APIError, Sandbox } from '@vercel/sandbox'
import { FatalError, getStepMetadata, RetryableError } from 'workflow'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email/send'
import { videosReadyEmail } from '@/lib/email/videos-ready'
import {
  getRenderJob,
  markRenderFailed,
  markRenderReady,
  markRenderRendering,
} from '@/lib/videos/orders'
import { blobEnvironment, deleteVideoFiles, uploadVideo } from './blob'
import {
  renderPathname,
  type RenderedVideo,
  type VideoJob,
  type VideoPack,
  videosInPack,
} from './packs'
import { isExampleRender, loadVideoProps } from './props'
import { getDeploymentSnapshotId } from './snapshot'

const VCPUS = 4
const CONCURRENCY = 4
const SANDBOX_TIMEOUT_MS = 5 * 60 * 1000
const FIRST_RETRY_DELAY_MS = 5_000
const MAX_RETRIES = 6

export type RenderPackInput = { renderId: string; pack: VideoPack }

export async function renderVideoPack({
  renderId,
  pack,
}: RenderPackInput): Promise<RenderedVideo[]> {
  'use workflow'

  await beginRender(renderId)
  try {
    const videos = await Promise.all(
      videosInPack(pack).map((job) => renderVideo({ renderId, ...job }))
    )
    await finishRender(renderId, videos)
    return videos
  } catch (error) {
    await failRender(renderId, String(error))
    throw error
  }
}

export async function beginRender(renderId: string) {
  'use step'

  if (isExampleRender(renderId)) return
  await markRenderRendering(db, renderId)
}

export async function finishRender(renderId: string, videos: RenderedVideo[]) {
  'use step'

  if (isExampleRender(renderId)) return
  const replaced = await markRenderReady(db, renderId, videos)
  await deleteVideoFiles(replaced.map((file) => file.pathname)).catch(
    (error: unknown) => console.error('Could not delete old video files', error)
  )

  const job = await getRenderJob(db, renderId)
  if (!job) return
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.yearly.world'
  await sendEmail(
    videosReadyEmail(job.email, {
      accountUrl: `${siteUrl}/account`,
      updated: job.render.version > 0,
      confirmConsent: job.order.source === 'polar' && job.render.version === 0,
    })
  ).catch((error: unknown) =>
    console.error('Could not send the videos ready email', error)
  )
}

export async function failRender(renderId: string, error: string) {
  'use step'

  console.error(`Video render ${renderId} failed: ${error}`)
  if (isExampleRender(renderId)) return
  await markRenderFailed(db, renderId, error.slice(0, 1000))
}

export function retryDelayMs(attempt: number): number {
  return FIRST_RETRY_DELAY_MS * 2 ** Math.max(0, attempt - 1)
}

function isRateLimited(error: unknown): boolean {
  return error instanceof APIError && error.response.status === 429
}

export async function renderVideo({
  renderId,
  ...job
}: VideoJob & { renderId: string }): Promise<RenderedVideo> {
  'use step'

  const snapshotId = getDeploymentSnapshotId()
  if (!snapshotId) {
    throw new FatalError('This deployment has no render snapshot')
  }
  const inputProps = await loadVideoProps(renderId, job)
  if (!inputProps) throw new FatalError(`Nothing to render for ${renderId}`)

  let sandbox: Sandbox | undefined
  try {
    sandbox = await Sandbox.create({
      source: { type: 'snapshot', snapshotId },
      resources: { vcpus: VCPUS },
      timeout: SANDBOX_TIMEOUT_MS,
    })
    const { sandboxFilePath, contentType } = await renderMediaOnVercel({
      sandbox,
      compositionId: job.kind,
      inputProps,
      concurrency: CONCURRENCY,
    })
    const file = await sandbox.readFileToBuffer({ path: sandboxFilePath })
    if (!file) throw new Error(`The ${job.kind} render left no file`)

    const pathname = renderPathname(blobEnvironment(), renderId, job)
    await uploadVideo(pathname, file, contentType)
    return { ...job, pathname, bytes: file.length }
  } catch (error) {
    if (error instanceof FatalError) throw error
    const { attempt } = getStepMetadata()
    const reason = isRateLimited(error) ? 'Sandbox rate limit' : String(error)
    throw new RetryableError(`Render ${job.kind}-${job.theme}: ${reason}`, {
      retryAfter: retryDelayMs(attempt),
    })
  } finally {
    await sandbox?.stop().catch((error: unknown) => {
      console.error(`Couldn't stop sandbox ${sandbox?.sandboxId}`, error)
    })
  }
}

renderVideo.maxRetries = MAX_RETRIES
