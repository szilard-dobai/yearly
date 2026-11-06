import { ObjectId } from 'mongodb'
import { NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DELETE } from './route'

const requireAdmin = vi.fn()
const collection = { deleteOne: vi.fn() }

vi.mock('@/lib/tracking/api', () => ({
  requireAdmin: (...args: unknown[]) => requireAdmin(...args),
}))

vi.mock('@/lib/mongodb', () => ({
  getTrackingCollection: () => Promise.resolve(collection),
}))

const ID = '6728b8f0c2a4e1d2f3a4b5c6'

function deleteRequest(id = ID) {
  return DELETE(
    new Request(`http://localhost/api/tracking/${id}`, { method: 'DELETE' }),
    { params: Promise.resolve({ id }) }
  )
}

describe('DELETE /api/tracking/[id]', () => {
  beforeEach(() => {
    requireAdmin.mockReset().mockResolvedValue(null)
    collection.deleteOne.mockReset().mockResolvedValue({ deletedCount: 1 })
  })

  it('requires an admin session', async () => {
    requireAdmin.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )

    const response = await deleteRequest()

    expect(response.status).toBe(401)
    expect(collection.deleteOne).not.toHaveBeenCalled()
  })

  it('deletes the event', async () => {
    const response = await deleteRequest()

    expect(response.status).toBe(200)
    expect(collection.deleteOne).toHaveBeenCalledWith({
      _id: new ObjectId(ID),
    })
  })

  it('returns 404 for a malformed id', async () => {
    const response = await deleteRequest('not-an-id')

    expect(response.status).toBe(404)
    expect(collection.deleteOne).not.toHaveBeenCalled()
  })

  it('returns 404 when the event does not exist', async () => {
    collection.deleteOne.mockResolvedValue({ deletedCount: 0 })

    const response = await deleteRequest()

    expect(response.status).toBe(404)
  })
})
