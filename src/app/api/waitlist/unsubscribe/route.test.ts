// @vitest-environment node
import { createUnsubscribeToken } from '@/lib/waitlist/unsubscribe'
import { ObjectId } from 'mongodb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

const { deleteOne, getWaitlistCollection } = vi.hoisted(() => {
  const deleteOne = vi.fn()
  return {
    deleteOne,
    getWaitlistCollection: vi.fn(async () => ({ deleteOne })),
  }
})

vi.mock('@/lib/mongodb', () => ({ getWaitlistCollection }))

const ID = '6560f1a2b3c4d5e6f7a8b9c0'

const oneClick = (token: string) =>
  new Request(
    `https://www.yearly.world/api/waitlist/unsubscribe?${new URLSearchParams({ token })}`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        origin: 'https://mail.google.com',
      },
      body: 'List-Unsubscribe=One-Click',
    }
  )

describe('POST /api/waitlist/unsubscribe', () => {
  beforeEach(() => {
    vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret')
    deleteOne.mockResolvedValue({ deletedCount: 1 })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('removes the waitlist entry, even when a mail app sends it', async () => {
    const response = await POST(oneClick(createUnsubscribeToken(ID)))

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(deleteOne).toHaveBeenCalledWith({ _id: new ObjectId(ID) })
  })

  it('still succeeds when the entry is already gone', async () => {
    deleteOne.mockResolvedValue({ deletedCount: 0 })

    const response = await POST(oneClick(createUnsubscribeToken(ID)))

    expect(response.status).toBe(200)
  })

  it('refuses a token that was not signed by us', async () => {
    const response = await POST(oneClick(`${ID}.${'A'.repeat(43)}`))

    expect(response.status).toBe(400)
    expect(deleteOne).not.toHaveBeenCalled()
  })

  it('reports a database failure without details', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    deleteOne.mockRejectedValue(new Error('down'))

    const response = await POST(oneClick(createUnsubscribeToken(ID)))

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Failed to unsubscribe' })
  })
})
