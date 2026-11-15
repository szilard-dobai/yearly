// @vitest-environment node
import { APIError } from '@vercel/sandbox'
import { FatalError, RetryableError } from 'workflow'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderVideo, renderVideoPack, retryDelayMs } from './workflow'

const sandbox = {
  sandboxId: 'sbx_test',
  readFileToBuffer: vi.fn(),
  stop: vi.fn(),
}
const createSandbox = vi.fn()
const renderMediaOnVercel = vi.fn()
const uploadVideo = vi.fn()
const snapshotId = vi.fn()

vi.mock('@vercel/sandbox', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@vercel/sandbox')>()),
  Sandbox: { create: (...args: unknown[]) => createSandbox(...args) },
}))
vi.mock('@remotion/vercel', () => ({
  renderMediaOnVercel: (...args: unknown[]) => renderMediaOnVercel(...args),
}))
vi.mock('./blob', () => ({
  blobEnvironment: () => 'preview',
  uploadVideo: (...args: unknown[]) => uploadVideo(...args),
}))
vi.mock('./snapshot', () => ({
  getDeploymentSnapshotId: () => snapshotId(),
}))
vi.mock('workflow', async (importOriginal) => ({
  ...(await importOriginal<typeof import('workflow')>()),
  getStepMetadata: () => ({ attempt: 2 }),
}))

const file = Buffer.from('mp4')

describe('renderVideo', () => {
  beforeEach(() => {
    snapshotId.mockReset().mockReturnValue('snap_1')
    createSandbox.mockReset().mockResolvedValue(sandbox)
    renderMediaOnVercel.mockReset().mockResolvedValue({
      sandboxFilePath: '/tmp/out.mp4',
      contentType: 'video/mp4',
    })
    sandbox.readFileToBuffer.mockReset().mockResolvedValue(file)
    sandbox.stop.mockReset().mockResolvedValue(undefined)
    uploadVideo.mockReset().mockResolvedValue(undefined)
  })

  it('renders from the snapshot, uploads the MP4 and stops the sandbox', async () => {
    const video = await renderVideo({
      renderId: 'example-1',
      kind: 'stats',
      theme: 'dark',
    })

    expect(createSandbox).toHaveBeenCalledWith(
      expect.objectContaining({
        source: { type: 'snapshot', snapshotId: 'snap_1' },
        resources: { vcpus: 4 },
      })
    )
    expect(renderMediaOnVercel).toHaveBeenCalledWith(
      expect.objectContaining({
        compositionId: 'stats',
        concurrency: 4,
        inputProps: expect.objectContaining({ theme: 'dark' }),
      })
    )
    expect(uploadVideo).toHaveBeenCalledWith(
      'preview/renders/example-1/stats-dark.mp4',
      file,
      'video/mp4'
    )
    expect(video).toEqual({
      kind: 'stats',
      theme: 'dark',
      pathname: 'preview/renders/example-1/stats-dark.mp4',
      bytes: file.length,
    })
    expect(sandbox.stop).toHaveBeenCalledOnce()
  })

  it('fails for good when the deployment has no snapshot', async () => {
    snapshotId.mockReturnValue(null)

    await expect(
      renderVideo({ renderId: 'example-1', kind: 'year', theme: 'dark' })
    ).rejects.toBeInstanceOf(FatalError)
    expect(createSandbox).not.toHaveBeenCalled()
  })

  it('fails for good when there is nothing to render', async () => {
    await expect(
      renderVideo({ renderId: 'order-1', kind: 'year', theme: 'dark' })
    ).rejects.toBeInstanceOf(FatalError)
  })

  it('stops the sandbox and retries later when the render fails', async () => {
    renderMediaOnVercel.mockRejectedValue(new Error('Chrome crashed'))

    const error = await renderVideo({
      renderId: 'example-1',
      kind: 'year',
      theme: 'light',
    }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(RetryableError)
    expect((error as Error).message).toContain('Chrome crashed')
    expect(sandbox.stop).toHaveBeenCalledOnce()
    expect(uploadVideo).not.toHaveBeenCalled()
  })

  it('retries later when Sandbox is rate limited', async () => {
    createSandbox.mockRejectedValue(
      new APIError(new Response(null, { status: 429 }))
    )

    const error = await renderVideo({
      renderId: 'example-1',
      kind: 'year',
      theme: 'dark',
    }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(RetryableError)
    expect((error as Error).message).toContain('rate limit')
  })
})

describe('retryDelayMs', () => {
  it('doubles from 5 seconds', () => {
    expect([1, 2, 3, 4].map(retryDelayMs)).toEqual([5000, 10000, 20000, 40000])
  })
})

describe('renderVideoPack', () => {
  it('renders every video in the pack', async () => {
    snapshotId.mockReturnValue('snap_1')
    createSandbox.mockResolvedValue(sandbox)
    renderMediaOnVercel.mockResolvedValue({
      sandboxFilePath: '/tmp/out.mp4',
      contentType: 'video/mp4',
    })
    sandbox.readFileToBuffer.mockResolvedValue(file)

    const videos = await renderVideoPack({
      renderId: 'example-1',
      pack: 'month',
    })

    expect(videos.map((video) => video.pathname)).toEqual([
      'preview/renders/example-1/month-dark.mp4',
      'preview/renders/example-1/month-light.mp4',
    ])
  })
})
