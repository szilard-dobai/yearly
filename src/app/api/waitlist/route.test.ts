import { MongoServerError } from 'mongodb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

const collection = {
  countDocuments: vi.fn(),
  updateOne: vi.fn(),
}

const notifyWaitlistToSlack = vi.fn()

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
