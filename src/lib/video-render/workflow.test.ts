// @vitest-environment node
import { APIError } from '@vercel/sandbox'
import { FatalError, RetryableError } from 'workflow'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderVideo, renderVideoPack, retryDelayMs } from './workflow'

const orders = {
  getRenderJob: vi.fn(),
  markRenderRendering: vi.fn(),
  markRenderReady: vi.fn(),
  markRenderFailed: vi.fn(),
}
const deleteVideoFiles = vi.fn()
const sendEmail = vi.fn()

vi.mock('@/lib/db', () => ({ db: {} }))
vi.mock('@/lib/videos/orders', () => ({
  getRenderJob: (...args: unknown[]) => orders.getRenderJob(...args),
  markRenderRendering: (...args: unknown[]) =>
    orders.markRenderRendering(...args),
  markRenderReady: (...args: unknown[]) => orders.markRenderReady(...args),
  markRenderFailed: (...args: unknown[]) => orders.markRenderFailed(...args),
}))
vi.mock('@/lib/email/send', () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...args),
}))

const sandbox = {
  sandboxId: 'sbx_test',
  readFileToBuffer: vi.fn(),
  stop: vi.fn(),
}
const createSandbox = vi.fn()
const renderMediaOnVercel = vi.fn()
const uploadFile = vi.fn()
const renderStillOnVercel = vi.fn()
const snapshotId = vi.fn()

vi.mock('@vercel/sandbox', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@vercel/sandbox')>()),
  Sandbox: { create: (...args: unknown[]) => createSandbox(...args) },
}))
vi.mock('@remotion/vercel', () => ({
  renderMediaOnVercel: (...args: unknown[]) => renderMediaOnVercel(...args),
  renderStillOnVercel: (...args: unknown[]) => renderStillOnVercel(...args),
}))
vi.mock('./blob', () => ({
  blobEnvironment: () => 'preview',
  uploadFile: (...args: unknown[]) => uploadFile(...args),
  deleteVideoFiles: (...args: unknown[]) => deleteVideoFiles(...args),
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
    uploadFile.mockReset().mockResolvedValue(undefined)
    renderStillOnVercel.mockReset().mockResolvedValue({
      sandboxFilePath: '/tmp/still.jpeg',
      contentType: 'image/jpeg',
    })
    orders.getRenderJob.mockReset().mockResolvedValue(null)
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
    expect(uploadFile).toHaveBeenCalledWith(
      'preview/renders/example-1/stats-dark.mp4',
      file,
      'video/mp4'
    )
    expect(renderStillOnVercel).toHaveBeenCalledWith(
      expect.objectContaining({ compositionId: 'stats', imageFormat: 'jpeg' })
    )
    expect(uploadFile).toHaveBeenCalledWith(
      'preview/renders/example-1/stats-dark.jpg',
      file,
      'image/jpeg'
    )
    expect(video).toEqual({
      kind: 'stats',
      theme: 'dark',
      pathname: 'preview/renders/example-1/stats-dark.mp4',
      bytes: file.length,
      posterPathname: 'preview/renders/example-1/stats-dark.jpg',
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
    expect(uploadFile).not.toHaveBeenCalled()
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

describe('renderVideoPack for an order', () => {
  const job = {
    order: { year: 2026, month: 5, source: 'polar' },
    render: {
      version: 1,
      data: { days: { '2026-06-01': ['FR'] }, weekStartsOn: 1 },
    },
    email: 'ana@example.com',
  }

  beforeEach(() => {
    snapshotId.mockReturnValue('snap_1')
    createSandbox.mockReset().mockResolvedValue(sandbox)
    renderMediaOnVercel.mockReset().mockResolvedValue({
      sandboxFilePath: '/tmp/out.mp4',
      contentType: 'video/mp4',
    })
    sandbox.readFileToBuffer.mockReset().mockResolvedValue(file)
    sandbox.stop.mockReset().mockResolvedValue(undefined)
    uploadFile.mockReset().mockResolvedValue(undefined)
    renderStillOnVercel.mockReset().mockResolvedValue({
      sandboxFilePath: '/tmp/still.jpeg',
      contentType: 'image/jpeg',
    })
    orders.getRenderJob.mockReset().mockResolvedValue(job)
    orders.markRenderRendering.mockReset().mockResolvedValue(undefined)
    orders.markRenderReady
      .mockReset()
      .mockResolvedValue([{ pathname: 'old.mp4' }])
    orders.markRenderFailed.mockReset().mockResolvedValue(undefined)
    deleteVideoFiles.mockReset().mockResolvedValue(undefined)
    sendEmail.mockReset().mockResolvedValue(undefined)
  })

  it('marks the render ready, removes the old files and emails the buyer', async () => {
    const videos = await renderVideoPack({
      renderId: 'render-1',
      pack: 'month',
    })

    expect(orders.markRenderRendering).toHaveBeenCalledWith({}, 'render-1')
    expect(orders.markRenderReady).toHaveBeenCalledWith({}, 'render-1', videos)
    expect(deleteVideoFiles).toHaveBeenCalledWith([{ pathname: 'old.mp4' }])
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ana@example.com',
        subject: 'Your updated Yearly videos are ready',
      })
    )
  })

  it('confirms the consent to immediate delivery for a first paid render', async () => {
    orders.getRenderJob.mockResolvedValue({
      ...job,
      render: { ...job.render, version: 0 },
    })

    await renderVideoPack({ renderId: 'render-1', pack: 'month' })

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Your Yearly videos are ready',
        text: expect.stringContaining('14-day right to cancel has ended'),
      })
    )
  })

  it("doesn't mention the right to cancel for a free video", async () => {
    orders.getRenderJob.mockResolvedValue({
      ...job,
      order: { ...job.order, source: 'credit' },
      render: { ...job.render, version: 0 },
    })

    await renderVideoPack({ renderId: 'render-1', pack: 'month' })

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.not.stringContaining('right to cancel'),
      })
    )
  })

  it("still finishes when the email can't be sent", async () => {
    sendEmail.mockRejectedValue(new Error('Resend down'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(
      renderVideoPack({ renderId: 'render-1', pack: 'month' })
    ).resolves.toHaveLength(2)
  })

  it('marks the render failed when a video fails for good', async () => {
    snapshotId.mockReturnValue(null)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(
      renderVideoPack({ renderId: 'render-1', pack: 'month' })
    ).rejects.toBeInstanceOf(FatalError)
    expect(orders.markRenderFailed).toHaveBeenCalledWith(
      {},
      'render-1',
      expect.stringContaining('no render snapshot')
    )
    expect(orders.markRenderReady).not.toHaveBeenCalled()
  })

  it('leaves the database alone for example renders', async () => {
    await renderVideoPack({ renderId: 'example-1', pack: 'month' })

    expect(orders.markRenderRendering).not.toHaveBeenCalled()
    expect(orders.markRenderReady).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
  })
})
