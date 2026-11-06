import { MongoServerError } from 'mongodb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

const calendarCollection = {
  countDocuments: vi.fn(),
  updateOne: vi.fn(),
}
const reminders = { countDocuments: vi.fn() }

const notifyReminderToSlack = vi.fn()

vi.mock('@/lib/mongodb', () => ({
  getCalendarRemindersCollection: () => Promise.resolve(calendarCollection),
  getRemindersCollection: () => Promise.resolve(reminders),
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
  return new Request('http://localhost/api/reminders/calendar', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

const validBody = {
  deviceId: 'device-123',
  year: 2026,
  provider: 'google',
  deviceType: 'mobile',
}

describe('POST /api/reminders/calendar', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['Date'],
      now: new Date('2026-11-07T12:00:00Z'),
    })
    notifyReminderToSlack.mockReset()
    calendarCollection.countDocuments.mockReset().mockResolvedValue(0)
    calendarCollection.updateOne
      .mockReset()
      .mockResolvedValue({ upsertedCount: 1 })
    reminders.countDocuments.mockReset().mockResolvedValue(12)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('records one add per device, year and provider without an email', async () => {
    const response = await POST(
      postRequest(validBody, {
        'sec-fetch-site': 'same-origin',
        'x-vercel-ip-country': 'SG',
        'x-vercel-ip-country-region': '01',
      })
    )

    expect(response.status).toBe(201)
    expect(calendarCollection.updateOne).toHaveBeenCalledWith(
      { deviceId: 'device-123', year: 2026, provider: 'google' },
      {
        $set: {
          deviceType: 'mobile',
          country: 'SG',
          region: '01',
          updatedAt: expect.any(Date),
        },
        $setOnInsert: { createdAt: expect.any(Date) },
      },
      { upsert: true }
    )
  })

  it('pings Slack with the running totals the first time', async () => {
    calendarCollection.countDocuments
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(30)

    await POST(
      postRequest(
        { ...validBody, provider: 'ics' },
        { 'sec-fetch-site': 'same-origin', 'x-vercel-ip-country': 'SG' }
      )
    )
    await vi.waitFor(() => expect(notifyReminderToSlack).toHaveBeenCalled())

    expect(calendarCollection.countDocuments).toHaveBeenLastCalledWith({
      year: 2026,
    })
    expect(reminders.countDocuments).toHaveBeenCalledWith({ year: 2026 })
    expect(notifyReminderToSlack).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'ics',
        deviceType: 'mobile',
        country: 'SG',
      }),
      { emails: 12, calendarAdds: 30 }
    )
  })

  it('does not ping Slack again for a repeated add', async () => {
    calendarCollection.updateOne.mockResolvedValue({ upsertedCount: 0 })

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(201)
    expect(notifyReminderToSlack).not.toHaveBeenCalled()
  })

  it('rejects requests from other sites', async () => {
    const response = await POST(
      postRequest(validBody, { 'sec-fetch-site': 'cross-site' })
    )

    expect(response.status).toBe(403)
    expect(calendarCollection.updateOne).not.toHaveBeenCalled()
  })

  it.each([
    ['an unknown provider', { ...validBody, provider: 'outlook' }],
    ['a missing device id', { ...validBody, deviceId: '' }],
    ['a past year', { ...validBody, year: 2025 }],
    ['a missing year', { ...validBody, year: undefined }],
  ])('rejects %s', async (_, body) => {
    const response = await POST(postRequest(body))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Invalid request' })
    expect(calendarCollection.updateOne).not.toHaveBeenCalled()
  })

  it('rejects malformed JSON', async () => {
    const response = await POST(postRequest('{nope'))

    expect(response.status).toBe(400)
  })

  it('rate limits a device that adds too often', async () => {
    calendarCollection.countDocuments.mockResolvedValue(2)

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(429)
    expect(calendarCollection.countDocuments).toHaveBeenCalledWith({
      deviceId: 'device-123',
      createdAt: { $gte: new Date('2026-11-07T11:00:00Z') },
    })
    expect(calendarCollection.updateOne).not.toHaveBeenCalled()
    expect(notifyReminderToSlack).not.toHaveBeenCalled()
  })

  it('treats a concurrent duplicate add as success', async () => {
    calendarCollection.updateOne.mockRejectedValue(
      new MongoServerError({ message: 'E11000 duplicate key', code: 11000 })
    )

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(201)
    expect(notifyReminderToSlack).not.toHaveBeenCalled()
  })

  it('reports other database errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    calendarCollection.updateOne.mockRejectedValue(new Error('down'))

    const response = await POST(postRequest(validBody))

    expect(response.status).toBe(500)
  })
})
