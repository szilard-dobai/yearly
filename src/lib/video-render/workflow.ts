import { renderMediaOnVercel } from '@remotion/vercel'
import { APIError, Sandbox } from '@vercel/sandbox'
import { FatalError, getStepMetadata, RetryableError } from 'workflow'
import { blobEnvironment, uploadVideo } from './blob'
import {
  renderPathname,
  type RenderedVideo,
  type VideoJob,
  type VideoPack,
  videosInPack,
} from './packs'
import { loadVideoProps } from './props'
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

  return Promise.all(
    videosInPack(pack).map((job) => renderVideo({ renderId, ...job }))
  )
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
  const inputProps = loadVideoProps(renderId, job)
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
