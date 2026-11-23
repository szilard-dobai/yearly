import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

const collection = { insertOne: vi.fn() }
const getSession = vi.fn()

vi.mock('@/lib/mongodb', () => ({
  getTrackingCollection: () => Promise.resolve(collection),
}))

vi.mock('@/lib/auth/server', () => ({
  auth: { api: { getSession: (...args: unknown[]) => getSession(...args) } },
}))

const event = {
  type: 'homepage_view',
  timestamp: '2026-11-23T10:00:00.000Z',
  deviceId: 'device-1',
  deviceType: 'mobile',
}

function postRequest(body: unknown) {
  return new Request('http://localhost/api/tracking', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'sec-fetch-site': 'same-origin',
      'x-vercel-ip-country': 'RO',
    },
    body: JSON.stringify(body),
  })
}

function storedEvent() {
  return collection.insertOne.mock.calls[0][0]
}

describe('POST /api/tracking', () => {
  beforeEach(() => {
    vi.stubEnv('ACCOUNTS_ENABLED', 'true')
    collection.insertOne.mockReset().mockResolvedValue({})
    getSession.mockReset().mockResolvedValue(null)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('stores the event with the location from the request', async () => {
    const response = await POST(postRequest(event))

    expect(response.status).toBe(200)
    expect(storedEvent()).toEqual({
      ...event,
      timestamp: new Date(event.timestamp),
      country: 'RO',
      region: undefined,
    })
  })

  it('adds the account ID of a signed-in person', async () => {
    getSession.mockResolvedValue({ user: { id: 'user-1', email: 'a@b.co' } })

    await POST(postRequest(event))

    expect(storedEvent()).toMatchObject({
      deviceId: 'device-1',
      userId: 'user-1',
    })
  })

  it('ignores an account ID sent by the browser', async () => {
    await POST(postRequest({ ...event, userId: 'someone-else' }))

    expect(storedEvent()).not.toHaveProperty('userId')
  })

  it('does not check the session when accounts are off', async () => {
    vi.stubEnv('ACCOUNTS_ENABLED', '')

    await POST(postRequest(event))

    expect(getSession).not.toHaveBeenCalled()
    expect(storedEvent()).not.toHaveProperty('userId')
  })

  it('still stores the event when the session check fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    getSession.mockRejectedValue(new Error('Neon is asleep'))

    const response = await POST(postRequest(event))

    expect(response.status).toBe(200)
    expect(storedEvent()).not.toHaveProperty('userId')
  })
})
