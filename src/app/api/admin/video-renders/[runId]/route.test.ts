// @vitest-environment node
import { NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'

const requireAdmin = vi.fn()
const run = {
  exists: Promise.resolve(true),
  status: Promise.resolve('running'),
  returnValue: Promise.resolve([] as unknown[]),
}
const getRun = vi.fn()

vi.mock('@/lib/tracking/api', () => ({
  requireAdmin: (...args: unknown[]) => requireAdmin(...args),
}))
vi.mock('workflow/api', () => ({
  getRun: (...args: unknown[]) => getRun(...args),
}))
vi.mock('@/lib/video-render/blob', () => ({
  getVideoDownloadUrl: (pathname: string) =>
    Promise.resolve(`https://signed.example/${pathname}`),
}))

function get(runId = 'wrun_1') {
  return GET(new Request(`http://localhost/api/admin/video-renders/${runId}`), {
    params: Promise.resolve({ runId }),
  })
}

describe('GET /api/admin/video-renders/[runId]', () => {
  beforeEach(() => {
    requireAdmin.mockReset().mockResolvedValue(null)
    run.exists = Promise.resolve(true)
    run.status = Promise.resolve('running')
    getRun.mockReset().mockReturnValue(run)
  })

  it('requires an admin session', async () => {
    requireAdmin.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )

    expect((await get()).status).toBe(401)
    expect(getRun).not.toHaveBeenCalled()
  })

  it('says when the run does not exist', async () => {
    run.exists = Promise.resolve(false)

    expect((await get()).status).toBe(404)
  })

  it('reports the status while the run is going', async () => {
    expect(await (await get()).json()).toEqual({ status: 'running' })
  })

  it('links to each video once the run is done', async () => {
    run.status = Promise.resolve('completed')
    run.returnValue = Promise.resolve([
      {
        kind: 'month',
        theme: 'dark',
        pathname: 'preview/renders/example-1/month-dark.mp4',
        bytes: 3,
      },
    ])

    expect(await (await get()).json()).toEqual({
      status: 'completed',
      videos: [
        {
          kind: 'month',
          theme: 'dark',
          pathname: 'preview/renders/example-1/month-dark.mp4',
          bytes: 3,
          url: 'https://signed.example/preview/renders/example-1/month-dark.mp4',
        },
      ],
    })
  })
})
