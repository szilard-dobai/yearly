// @vitest-environment node
import { NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

const requireAdmin = vi.fn()
const start = vi.fn()

vi.mock('@/lib/tracking/api', () => ({
  requireAdmin: (...args: unknown[]) => requireAdmin(...args),
}))
vi.mock('workflow/api', () => ({
  start: (...args: unknown[]) => start(...args),
}))
vi.mock('@/lib/video-render/workflow', () => ({
  renderVideoPack: 'renderVideoPack',
}))

function post(body: unknown) {
  return POST(
    new Request('http://localhost/api/admin/video-renders', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  )
}

describe('POST /api/admin/video-renders', () => {
  beforeEach(() => {
    requireAdmin.mockReset().mockResolvedValue(null)
    start.mockReset().mockResolvedValue({ runId: 'wrun_1' })
  })

  it('requires an admin session', async () => {
    requireAdmin.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )

    const response = await post({ pack: 'year' })

    expect(response.status).toBe(401)
    expect(start).not.toHaveBeenCalled()
  })

  it('rejects anything but a year or month pack', async () => {
    const response = await post({ pack: 'stats' })

    expect(response.status).toBe(400)
    expect(start).not.toHaveBeenCalled()
  })

  it('starts an example render of the pack', async () => {
    const response = await post({ pack: 'month' })
    const body = await response.json()

    expect(response.status).toBe(202)
    expect(body.runId).toBe('wrun_1')
    expect(body.renderId).toMatch(/^example-/)
    expect(start).toHaveBeenCalledWith('renderVideoPack', [
      { renderId: body.renderId, pack: 'month' },
    ])
  })
})
