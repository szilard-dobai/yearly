import { NextResponse } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from './route'

const { requireAdmin, getLaunchSendStatus, runLaunchSend } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getLaunchSendStatus: vi.fn(),
  runLaunchSend: vi.fn(),
}))

vi.mock('@/lib/tracking/api', () => ({ requireAdmin }))
vi.mock('@/lib/waitlist/launch-send', () => ({
  getLaunchSendStatus,
  runLaunchSend,
}))

const request = (method: 'GET' | 'POST') =>
  new Request('http://localhost/api/waitlist/launch-email', { method })

const status = {
  total: 40,
  sent: 10,
  failed: 1,
  left: 30,
  needsCheck: 0,
  freeUntil: '31 January 2027',
  blocked: null,
}

const result = {
  total: 40,
  alreadySent: 10,
  sentNow: 30,
  failed: 0,
  left: 0,
  needsCheck: 0,
  stopped: 'done',
}

describe('/api/waitlist/launch-email', () => {
  beforeEach(() => {
    requireAdmin.mockResolvedValue(null)
    getLaunchSendStatus.mockResolvedValue(status)
    runLaunchSend.mockResolvedValue({ result })
  })

  afterEach(() => {
    vi.resetAllMocks()
    vi.restoreAllMocks()
  })

  it('requires an admin session', async () => {
    requireAdmin.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )

    expect((await GET(request('GET'))).status).toBe(401)
    expect((await POST(request('POST'))).status).toBe(401)
    expect(getLaunchSendStatus).not.toHaveBeenCalled()
    expect(runLaunchSend).not.toHaveBeenCalled()
  })

  it('returns the send status', async () => {
    const response = await GET(request('GET'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(status)
  })

  it('runs the send within the admin time budget', async () => {
    const response = await POST(request('POST'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(result)
    expect(runLaunchSend).toHaveBeenCalledWith({ budgetMs: 40_000 })
  })

  it('says why a send is blocked', async () => {
    runLaunchSend.mockResolvedValue({ blocked: 'Turn on video sales first' })

    const response = await POST(request('POST'))

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error: 'Turn on video sales first',
    })
  })

  it('reports a failed run', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    runLaunchSend.mockRejectedValue(new Error('down'))

    const response = await POST(request('POST'))

    expect(response.status).toBe(500)
  })
})
