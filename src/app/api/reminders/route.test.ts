import { MongoServerError } from 'mongodb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

const collection = {
  countDocuments: vi.fn(),
  updateOne: vi.fn(),
}
const calendarCollection = { countDocuments: vi.fn() }

const notifyReminderToSlack = vi.fn()

vi.mock('@/lib/mongodb', () => ({
  getRemindersCollection: () => Promise.resolve(collection),
  getCalendarRemindersCollection: () => Promise.resolve(calendarCollection),
}))

vi.mock('@/lib/reminders/slack', () => ({
  notifyReminderToSlack: (...args: unknown[]) => notifyReminderToSlack(...args),
}))

vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: (callback: () => unknown) => callback(),
}))

function postRequest(
  body: unknown,
  headers: Record<string, string> = { 'sec-fetch-site': 'same-origin' }
) {
  return new Request('http://localhost/api/reminders', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

const validBody = {
  email: '  Traveller@Example.com ',
  deviceId: 'device-123',
  year: 2026,
  deviceType: 'mobile',
}

describe('POST /api/reminders', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['Date'],
      now: new Date('2026-11-07T12:00:00Z'),
    })
    notifyReminderToSlack.mockReset()
    collection.countDocuments.mockReset().mockResolvedValue(0)
    collection.updateOne.mockReset().mockResolvedValue({ upsertedCount: 1 })
    calendarCollection.countDocuments.mockReset().mockResolvedValue(30)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('upserts one reminder per email and year with request metadata', async () => {
    const response = await POST(
      postRequest(validBody, {
        'sec-fetch-site': 'same-origin',
        'x-vercel-ip-country': 'SG',
        'x-vercel-ip-country-region': '01',
      })
    )

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ success: true })
    expect(collection.updateOne).toHaveBeenCalledWith(
      { year: 2026, email: 'traveller@example.com' },
      {
        $set: {
          deviceType: 'mobile',
          country: 'SG',
          region: '01',
          updatedAt: expect.any(Date),
        },
        $setOnInsert: { deviceId: 'device-123', createdAt: expect.any(Date) },
      },
      { upsert: true }
    )
  })

  it('pings Slack with the running totals for a new reminder', async () => {
    collection.countDocuments.mockResolvedValueOnce(0).mockResolvedValueOnce(12)

    await POST(
      postRequest(validBody, {
        'sec-fetch-site': 'same-origin',
        'x-vercel-ip-country': 'SG',
      })
    )
    await vi.waitFor(() => expect(notifyReminderToSlack).toHaveBeenCalled())

    expect(collection.countDocuments).toHaveBeenLastCalledWith({ year: 2026 })
    expect(calendarCollection.countDocuments).toHaveBeenCalledWith({
      year: 2026,
    })
    expect(notifyReminderToSlack).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'email',
        deviceType: 'mobile',
        country: 'SG',
      }),
      { emails: 12, calendarAdds: 30 }
    )
    expect(JSON.stringify(notifyReminderToSlack.mock.calls)).not.toContain(
      'traveller'
    )
  })

  it('succeeds again without a ping when the same email signs up twice', async () => {
    collection.updateOne.mockResolvedValue({ upsertedCount: 0 })

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(201)
    expect(notifyReminderToSlack).not.toHaveBeenCalled()
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

  it.each([
    ['a missing year', { ...validBody, year: undefined }],
    ['a fractional year', { ...validBody, year: 2026.5 }],
    ['a past year', { ...validBody, year: 2025 }],
    ['a far-off year', { ...validBody, year: 2030 }],
    ['a missing device id', { ...validBody, deviceId: '' }],
  ])('rejects %s', async (_, body) => {
    const response = await POST(postRequest(body))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Invalid request' })
    expect(collection.updateOne).not.toHaveBeenCalled()
  })

  it('rejects malformed JSON', async () => {
    const response = await POST(postRequest('{nope'))

    expect(response.status).toBe(400)
  })

  it('rejects oversized bodies', async () => {
    const response = await POST(
      postRequest({ ...validBody, padding: 'x'.repeat(5000) })
    )

    expect(response.status).toBe(413)
  })

  it('rate limits a device that signs up too often', async () => {
    collection.countDocuments.mockResolvedValue(5)

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(429)
    expect(collection.countDocuments).toHaveBeenCalledWith({
      deviceId: 'device-123',
      createdAt: { $gte: new Date('2026-11-07T11:00:00Z') },
    })
    expect(collection.updateOne).not.toHaveBeenCalled()
  })

  it('treats a concurrent duplicate sign-up as success', async () => {
    collection.updateOne.mockRejectedValue(
      new MongoServerError({ message: 'E11000 duplicate key', code: 11000 })
    )

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(201)
  })

  it('reports other database errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    collection.updateOne.mockRejectedValue(new Error('down'))

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(500)
  })
})
