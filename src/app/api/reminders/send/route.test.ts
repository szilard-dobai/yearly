import { NextResponse } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

const { requireAdmin, runReminderSend } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  runReminderSend: vi.fn(),
}))

vi.mock('@/lib/tracking/api', () => ({ requireAdmin }))
vi.mock('@/lib/reminders/send-run', () => ({ runReminderSend }))

const request = () =>
  new Request('http://localhost/api/reminders/send', { method: 'POST' })

const result = {
  year: 2026,
  total: 12,
  alreadySent: 0,
  sentNow: 12,
  failed: 0,
  left: 0,
  needsCheck: 0,
  stopped: 'done',
}

describe('POST /api/reminders/send', () => {
  beforeEach(() => {
    requireAdmin.mockResolvedValue(null)
    runReminderSend.mockResolvedValue({ result })
  })

  afterEach(() => {
    vi.resetAllMocks()
    vi.restoreAllMocks()
  })

  it('requires an admin session', async () => {
    requireAdmin.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )

    expect((await POST(request())).status).toBe(401)
    expect(runReminderSend).not.toHaveBeenCalled()
  })

  it('runs the same send as the cron, within a shorter budget', async () => {
    const response = await POST(request())

    expect(await response.json()).toEqual(result)
    expect(runReminderSend).toHaveBeenCalledWith({
      trigger: 'admin',
      budgetMs: 40_000,
    })
  })

  it('explains why it cannot send today', async () => {
    runReminderSend.mockResolvedValue({
      blocked: 'Reminders only send from production',
    })

    const response = await POST(request())

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error: 'Reminders only send from production',
    })
  })

  it('reports a failed run', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    runReminderSend.mockRejectedValue(new Error('down'))

    expect((await POST(request())).status).toBe(500)
  })
})
