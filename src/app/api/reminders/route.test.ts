import { MongoServerError } from 'mongodb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DELETE, GET, POST } from './route'

const collection = {
  countDocuments: vi.fn(),
  updateOne: vi.fn(),
  deleteOne: vi.fn(),
}
const calendarCollection = { countDocuments: vi.fn() }

const notifyReminderToSlack = vi.fn()
const getSession = vi.fn()

vi.mock('@/lib/auth/server', () => ({
  auth: { api: { getSession: (...args: unknown[]) => getSession(...args) } },
}))

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
    getSession.mockReset().mockResolvedValue(null)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('uses the signed-in email instead of the one sent', async () => {
    getSession.mockResolvedValue({ user: { email: 'Ana@Example.com' } })

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(201)
    expect(collection.updateOne.mock.calls[0][0]).toEqual({
      year: 2026,
      email: 'ana@example.com',
    })
  })

  it('uses the email sent when nobody is signed in', async () => {
    await POST(postRequest(validBody))

    expect(getSession).toHaveBeenCalledTimes(1)
    expect(collection.updateOne.mock.calls[0][0].email).toBe(
      'traveller@example.com'
    )
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

  it('still accepts this year until 1 Dec has started in every time zone', async () => {
    vi.setSystemTime(new Date('2026-12-01T11:59:59Z'))

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(201)
  })

  it("closes this year's reminders once 1 Dec has started everywhere", async () => {
    vi.setSystemTime(new Date('2026-12-01T12:00:00Z'))

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'Reminders for 2026 closed on 1 Dec',
    })
    expect(collection.updateOne).not.toHaveBeenCalled()
  })

  it('accepts next year in December', async () => {
    vi.setSystemTime(new Date('2026-12-20T12:00:00Z'))

    const response = await POST(postRequest({ ...validBody, year: 2027 }))

    expect(response.status).toBe(201)
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

function accountRequest(
  method: 'GET' | 'DELETE',
  query = '?year=2026',
  headers: Record<string, string> = { 'sec-fetch-site': 'same-origin' }
) {
  return new Request(`http://localhost/api/reminders${query}`, {
    method,
    headers,
  })
}

describe('the signed-in reminder', () => {
  beforeEach(() => {
    collection.countDocuments.mockReset().mockResolvedValue(1)
    collection.deleteOne.mockReset().mockResolvedValue({ deletedCount: 1 })
    getSession.mockReset().mockResolvedValue({
      user: { email: 'Ana@Example.com' },
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('says whether the signed-in email has a reminder for the year', async () => {
    const response = await GET(accountRequest('GET'))

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ set: true })
    expect(collection.countDocuments).toHaveBeenCalledWith(
      { year: 2026, email: 'ana@example.com' },
      { limit: 1 }
    )

    collection.countDocuments.mockResolvedValue(0)
    expect(await (await GET(accountRequest('GET'))).json()).toEqual({
      set: false,
    })
  })

  it("turns off the signed-in email's reminder for the year", async () => {
    const response = await DELETE(accountRequest('DELETE'))

    expect(response.status).toBe(200)
    expect(collection.deleteOne).toHaveBeenCalledWith({
      year: 2026,
      email: 'ana@example.com',
    })
  })

  it('needs someone signed in', async () => {
    getSession.mockResolvedValue(null)

    expect((await GET(accountRequest('GET'))).status).toBe(401)
    expect((await DELETE(accountRequest('DELETE'))).status).toBe(401)
    expect(collection.deleteOne).not.toHaveBeenCalled()
  })

  it('rejects a missing or invalid year', async () => {
    expect((await GET(accountRequest('GET', ''))).status).toBe(400)
    expect((await GET(accountRequest('GET', '?year=soon'))).status).toBe(400)
    expect((await DELETE(accountRequest('DELETE', '?year=1999'))).status).toBe(
      400
    )
  })

  it('rejects turning it off from other sites', async () => {
    const response = await DELETE(
      accountRequest('DELETE', '?year=2026', { 'sec-fetch-site': 'cross-site' })
    )

    expect(response.status).toBe(403)
    expect(collection.deleteOne).not.toHaveBeenCalled()
  })
})
