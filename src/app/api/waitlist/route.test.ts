import { MongoServerError } from 'mongodb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DELETE, GET, POST } from './route'

const collection = {
  countDocuments: vi.fn(),
  updateOne: vi.fn(),
  deleteOne: vi.fn(),
}

const notifyWaitlistToSlack = vi.fn()
const getSession = vi.fn()

vi.mock('@/lib/auth/server', () => ({
  auth: { api: { getSession: (...args: unknown[]) => getSession(...args) } },
}))

vi.mock('@/lib/mongodb', () => ({
  getWaitlistCollection: () => Promise.resolve(collection),
}))

vi.mock('@/lib/waitlist/slack', () => ({
  notifyWaitlistToSlack: (...args: unknown[]) => notifyWaitlistToSlack(...args),
}))

vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: (callback: () => unknown) => callback(),
}))

function postRequest(
  body: unknown,
  headers: Record<string, string> = { 'sec-fetch-site': 'same-origin' }
) {
  return new Request('http://localhost/api/waitlist', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

const validBody = {
  email: '  Traveller@Example.com ',
  deviceId: 'device-123',
  feature: 'animated_video',
  context: {
    exportType: 'calendar',
    videoKind: 'year',
    year: 2026,
    price: 2.99,
  },
  deviceType: 'mobile',
}

describe('POST /api/waitlist', () => {
  beforeEach(() => {
    notifyWaitlistToSlack.mockReset()
    collection.countDocuments.mockReset().mockResolvedValue(0)
    collection.updateOne.mockReset().mockResolvedValue({ upsertedCount: 1 })
    getSession.mockReset().mockResolvedValue(null)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  function upsertedEmail() {
    return collection.updateOne.mock.calls[0][0].email
  }

  it('does not look for a session while accounts are off', async () => {
    vi.stubEnv('ACCOUNTS_ENABLED', 'false')

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(201)
    expect(getSession).not.toHaveBeenCalled()
    expect(upsertedEmail()).toBe('traveller@example.com')
  })

  it('uses the signed-in email instead of the one sent', async () => {
    vi.stubEnv('ACCOUNTS_ENABLED', 'true')
    getSession.mockResolvedValue({ user: { email: 'Ana@Example.com' } })

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(201)
    expect(upsertedEmail()).toBe('ana@example.com')
  })

  it('uses the email sent when nobody is signed in', async () => {
    vi.stubEnv('ACCOUNTS_ENABLED', 'true')

    await POST(postRequest(validBody))

    expect(getSession).toHaveBeenCalledTimes(1)
    expect(upsertedEmail()).toBe('traveller@example.com')
  })

  it('falls back to the email sent when the session check fails', async () => {
    vi.stubEnv('ACCOUNTS_ENABLED', 'true')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    getSession.mockRejectedValue(new Error('database down'))

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(201)
    expect(upsertedEmail()).toBe('traveller@example.com')
    expect(console.error).toHaveBeenCalled()
  })

  it('upserts the normalised email with request metadata', async () => {
    const response = await POST(
      postRequest(validBody, {
        'sec-fetch-site': 'same-origin',
        'x-vercel-ip-country': 'RO',
      })
    )

    expect(response.status).toBe(201)
    expect(collection.updateOne).toHaveBeenCalledWith(
      { feature: 'animated_video', email: 'traveller@example.com' },
      {
        $set: expect.objectContaining({
          context: validBody.context,
          deviceType: 'mobile',
          country: 'RO',
          updatedAt: expect.any(Date),
        }),
        $setOnInsert: { deviceId: 'device-123', createdAt: expect.any(Date) },
      },
      { upsert: true }
    )
  })

  it('pings Slack with the new total for a new sign-up', async () => {
    collection.countDocuments.mockResolvedValueOnce(0).mockResolvedValueOnce(12)

    await POST(
      postRequest(validBody, {
        'sec-fetch-site': 'same-origin',
        'x-vercel-ip-country': 'RO',
      })
    )
    await vi.waitFor(() => expect(notifyWaitlistToSlack).toHaveBeenCalled())

    expect(collection.countDocuments).toHaveBeenLastCalledWith({
      feature: 'animated_video',
    })
    expect(notifyWaitlistToSlack).toHaveBeenCalledWith(
      expect.objectContaining({
        context: validBody.context,
        deviceType: 'mobile',
        country: 'RO',
      }),
      12
    )
    expect(notifyWaitlistToSlack.mock.calls[0][0]).not.toHaveProperty('email')
  })

  it('does not ping Slack when the email was already on the list', async () => {
    collection.updateOne.mockResolvedValue({ upsertedCount: 0 })

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(201)
    expect(notifyWaitlistToSlack).not.toHaveBeenCalled()
  })

  it('rejects requests from other sites', async () => {
    const response = await POST(
      postRequest(validBody, { 'sec-fetch-site': 'cross-site' })
    )

    expect(response.status).toBe(403)
    expect(collection.updateOne).not.toHaveBeenCalled()
  })

  it('explains an invalid email address', async () => {
    const response = await POST(
      postRequest({ ...validBody, email: 'not-an-email' })
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'Please enter a valid email address',
    })
  })

  it('rejects unknown features', async () => {
    const response = await POST(
      postRequest({ ...validBody, feature: 'something_else' })
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Invalid request' })
  })

  it('rate limits a device that signs up too often', async () => {
    collection.countDocuments.mockResolvedValue(5)

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(429)
    expect(collection.updateOne).not.toHaveBeenCalled()
  })

  it('treats a concurrent duplicate sign-up as success', async () => {
    collection.updateOne.mockRejectedValue(
      new MongoServerError({ message: 'E11000 duplicate key', code: 11000 })
    )

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(201)
  })
})

function accountRequest(
  method: 'GET' | 'DELETE',
  query = '?feature=animated_video',
  headers: Record<string, string> = { 'sec-fetch-site': 'same-origin' }
) {
  return new Request(`http://localhost/api/waitlist${query}`, {
    method,
    headers,
  })
}

describe('the signed-in waitlist entry', () => {
  beforeEach(() => {
    vi.stubEnv('ACCOUNTS_ENABLED', 'true')
    collection.countDocuments.mockReset().mockResolvedValue(1)
    collection.deleteOne.mockReset().mockResolvedValue({ deletedCount: 1 })
    getSession.mockReset().mockResolvedValue({
      user: { email: 'Ana@Example.com' },
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('says whether the signed-in email is on the list', async () => {
    const response = await GET(accountRequest('GET'))

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ joined: true })
    expect(collection.countDocuments).toHaveBeenCalledWith(
      { feature: 'animated_video', email: 'ana@example.com' },
      { limit: 1 }
    )

    collection.countDocuments.mockResolvedValue(0)
    expect(await (await GET(accountRequest('GET'))).json()).toEqual({
      joined: false,
    })
  })

  it('removes the signed-in email from the list', async () => {
    const response = await DELETE(accountRequest('DELETE'))

    expect(response.status).toBe(200)
    expect(collection.deleteOne).toHaveBeenCalledWith({
      feature: 'animated_video',
      email: 'ana@example.com',
    })
  })

  it('needs someone signed in', async () => {
    getSession.mockResolvedValue(null)

    expect((await GET(accountRequest('GET'))).status).toBe(401)
    expect((await DELETE(accountRequest('DELETE'))).status).toBe(401)
    expect(collection.deleteOne).not.toHaveBeenCalled()
  })

  it('returns 404 while accounts are off', async () => {
    vi.stubEnv('ACCOUNTS_ENABLED', '')

    expect((await GET(accountRequest('GET'))).status).toBe(404)
    expect((await DELETE(accountRequest('DELETE'))).status).toBe(404)
    expect(getSession).not.toHaveBeenCalled()
  })

  it('rejects unknown features', async () => {
    expect((await GET(accountRequest('GET', '?feature=other'))).status).toBe(
      400
    )
    expect((await DELETE(accountRequest('DELETE', ''))).status).toBe(400)
  })

  it('rejects removals from other sites', async () => {
    const response = await DELETE(
      accountRequest('DELETE', '?feature=animated_video', {
        'sec-fetch-site': 'cross-site',
      })
    )

    expect(response.status).toBe(403)
    expect(collection.deleteOne).not.toHaveBeenCalled()
  })
})
