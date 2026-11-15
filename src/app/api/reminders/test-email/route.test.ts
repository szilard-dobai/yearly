import { EmailSendError } from '@/lib/email/send'
import { NextResponse } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

const { requireAdmin, sendEmail } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  sendEmail: vi.fn(),
}))

vi.mock('@/lib/tracking/api', () => ({ requireAdmin }))
vi.mock('@/lib/email/send', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/email/send')>()),
  sendEmail,
}))

const request = (body: unknown) =>
  new Request('http://localhost/api/reminders/test-email', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

describe('POST /api/reminders/test-email', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['Date'],
      now: new Date('2026-11-25T12:00:00Z'),
    })
    requireAdmin.mockResolvedValue(null)
    sendEmail.mockResolvedValue({ id: 'resend-email-1' })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
    vi.resetAllMocks()
    vi.restoreAllMocks()
  })

  it('requires an admin session', async () => {
    requireAdmin.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )

    const response = await POST(request({ email: 'me@example.com' }))

    expect(response.status).toBe(401)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it("sends this year's reminder to the typed address without an idempotency key", async () => {
    vi.stubEnv('ACCOUNTS_ENABLED', 'true')

    const response = await POST(request({ email: ' Me@Example.com ' }))

    expect(response.status).toBe(200)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendEmail.mock.calls[0]).toHaveLength(1)
    expect(sendEmail.mock.calls[0][0]).toMatchObject({
      to: 'me@example.com',
      subject: 'Your 1 Dec reminder to share your 2026 Yearly',
    })
    expect(sendEmail.mock.calls[0][0].text).toContain('If you sign in there')
  })

  it('rejects an invalid address', async () => {
    const response = await POST(request({ email: 'nope' }))

    expect(response.status).toBe(400)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it("reports Resend's error code without the address", async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    sendEmail.mockRejectedValue(
      new EmailSendError(
        'Failed to send email: me@example.com is not allowed',
        'validation_error',
        422
      )
    )

    const response = await POST(request({ email: 'me@example.com' }))

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({
      error: "Couldn't send the test (validation_error)",
    })
    expect(JSON.stringify(error.mock.calls)).not.toContain('@')
  })
})
