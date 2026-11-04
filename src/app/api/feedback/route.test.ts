import { ObjectId } from 'mongodb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

const collection = {
  countDocuments: vi.fn(),
  insertOne: vi.fn(),
}

vi.mock('@/lib/mongodb', () => ({
  getFeedbackCollection: () => Promise.resolve(collection),
}))

function postRequest(
  body: unknown,
  headers: Record<string, string> = { 'sec-fetch-site': 'same-origin' }
) {
  return new Request('http://localhost/api/feedback', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

const validBody = {
  deviceId: 'device-123',
  rating: 5,
  message: '  Great app  ',
  source: 'post_export',
  context: { exportType: 'calendar', year: 2026 },
  deviceType: 'mobile',
}

describe('POST /api/feedback', () => {
  beforeEach(() => {
    collection.countDocuments.mockReset().mockResolvedValue(0)
    collection.insertOne.mockReset().mockResolvedValue({
      insertedId: new ObjectId('6728b8f0c2a4e1d2f3a4b5c6'),
    })
  })

  it('stores valid feedback with request metadata', async () => {
    const response = await POST(
      postRequest(validBody, {
        'sec-fetch-site': 'same-origin',
        'user-agent': 'TestAgent/1.0',
        'x-vercel-ip-country': 'RO',
        'x-vercel-ip-country-region': 'CJ',
      })
    )

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ id: '6728b8f0c2a4e1d2f3a4b5c6' })
    expect(collection.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceId: 'device-123',
        rating: 5,
        message: 'Great app',
        source: 'post_export',
        context: { exportType: 'calendar', year: 2026 },
        deviceType: 'mobile',
        userAgent: 'TestAgent/1.0',
        country: 'RO',
        region: 'CJ',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      })
    )
  })

  it('rejects cross-site requests', async () => {
    const response = await POST(
      postRequest(validBody, { 'sec-fetch-site': 'cross-site' })
    )

    expect(response.status).toBe(403)
    expect(collection.insertOne).not.toHaveBeenCalled()
  })

  it('rejects invalid JSON', async () => {
    const response = await POST(postRequest('{oops'))
    expect(response.status).toBe(400)
  })

  it('rejects feedback without a rating or message', async () => {
    const response = await POST(
      postRequest({ ...validBody, rating: null, message: '' })
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'A rating or a message is required',
    })
    expect(collection.insertOne).not.toHaveBeenCalled()
  })

  it('rejects oversized payloads', async () => {
    const response = await POST(
      postRequest({ ...validBody, message: 'a'.repeat(20_000) })
    )
    expect(response.status).toBe(413)
  })

  it('rate limits devices that submit too often', async () => {
    collection.countDocuments.mockResolvedValue(10)

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(429)
    expect(collection.countDocuments).toHaveBeenCalledWith({
      deviceId: 'device-123',
      createdAt: { $gte: expect.any(Date) },
    })
    expect(collection.insertOne).not.toHaveBeenCalled()
  })
})
