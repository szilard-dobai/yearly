// @vitest-environment node
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
  new Request('http://localhost/api/waitlist/launch-email/test', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

describe('POST /api/waitlist/launch-email/test', () => {
  beforeEach(() => {
    requireAdmin.mockResolvedValue(null)
    sendEmail.mockResolvedValue({ id: 'email-1' })
    vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret')
    vi.stubEnv('EMAIL_POSTAL_ADDRESS', 'PO Box 12, Cluj-Napoca, Romania')
  })

  afterEach(() => {
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

  it('sends the launch email to the typed address, without an idempotency key', async () => {
    const response = await POST(request({ email: ' Me@Example.com ' }))

    expect(response.status).toBe(200)
    const [email, options] = sendEmail.mock.calls[0]
    expect(email.to).toBe('me@example.com')
    expect(email.text).toContain('Yearly, PO Box 12, Cluj-Napoca, Romania')
    expect(email.headers['List-Unsubscribe']).toContain(
      '/api/waitlist/unsubscribe?token='
    )
    expect(options).toBeUndefined()
  })

  it('shows where the postal address goes when it is not set yet', async () => {
    vi.stubEnv('EMAIL_POSTAL_ADDRESS', '')

    await POST(request({ email: 'me@example.com' }))

    expect(sendEmail.mock.calls[0][0].text).toContain(
      'Yearly, EMAIL_POSTAL_ADDRESS is not set'
    )
  })

  it('rejects an invalid address', async () => {
    const response = await POST(request({ email: 'nope' }))

    expect(response.status).toBe(400)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it("passes on Resend's error code", async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    sendEmail.mockRejectedValue(
      new EmailSendError('nope', 'invalid_from_address', 422)
    )

    const response = await POST(request({ email: 'me@example.com' }))

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({
      error: "Couldn't send the test (invalid_from_address)",
    })
  })
})
