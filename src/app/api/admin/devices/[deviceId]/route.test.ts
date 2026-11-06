import { NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DELETE } from './route'

const requireAdmin = vi.fn()
const tracking = { deleteMany: vi.fn() }
const feedback = { deleteMany: vi.fn() }

vi.mock('@/lib/tracking/api', () => ({
  requireAdmin: (...args: unknown[]) => requireAdmin(...args),
}))

vi.mock('@/lib/mongodb', () => ({
  getTrackingCollection: () => Promise.resolve(tracking),
  getFeedbackCollection: () => Promise.resolve(feedback),
}))

const DEVICE_ID = 'ef3fd839-b42f-46ee-ae1a-525df2b90f42'

function deleteRequest(deviceId = DEVICE_ID) {
  return DELETE(
    new Request(`http://localhost/api/admin/devices/${deviceId}`, {
      method: 'DELETE',
    }),
    { params: Promise.resolve({ deviceId }) }
  )
}

describe('DELETE /api/admin/devices/[deviceId]', () => {
  beforeEach(() => {
    requireAdmin.mockReset().mockResolvedValue(null)
    tracking.deleteMany.mockReset().mockResolvedValue({ deletedCount: 42 })
    feedback.deleteMany.mockReset().mockResolvedValue({ deletedCount: 2 })
  })

  it('requires an admin session', async () => {
    requireAdmin.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )

    const response = await deleteRequest()

    expect(response.status).toBe(401)
    expect(tracking.deleteMany).not.toHaveBeenCalled()
    expect(feedback.deleteMany).not.toHaveBeenCalled()
  })

  it('deletes every event and feedback entry from the device', async () => {
    const response = await deleteRequest()

    expect(await response.json()).toEqual({
      deletedEvents: 42,
      deletedFeedback: 2,
    })
    expect(tracking.deleteMany).toHaveBeenCalledWith({ deviceId: DEVICE_ID })
    expect(feedback.deleteMany).toHaveBeenCalledWith({ deviceId: DEVICE_ID })
  })

  it('rejects an oversized device id', async () => {
    const response = await deleteRequest('x'.repeat(101))

    expect(response.status).toBe(400)
    expect(tracking.deleteMany).not.toHaveBeenCalled()
  })
})
