import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }))

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock }
  },
}))

const EMAIL = {
  to: 'ana@example.com',
  subject: 'Hello',
  html: '<p>Hi</p>',
  text: 'Hi',
}

describe('sendEmail', () => {
  beforeEach(() => {
    vi.resetModules()
    sendMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('sends through Resend from the configured address', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test')
    vi.stubEnv('EMAIL_FROM', 'Yearly <hi@yearly.world>')
    sendMock.mockResolvedValue({ data: { id: '1' }, error: null })
    const { sendEmail } = await import('./send')

    const sent = await sendEmail(EMAIL)

    expect(sendMock).toHaveBeenCalledWith(
      { from: 'Yearly <hi@yearly.world>', ...EMAIL },
      {}
    )
    expect(sent).toEqual({ id: '1' })
  })

  it('passes an idempotency key and reply-to address through', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test')
    sendMock.mockResolvedValue({ data: { id: '1' }, error: null })
    const { sendEmail } = await import('./send')

    await sendEmail(
      { ...EMAIL, replyTo: 'hello@yearly.world' },
      { idempotencyKey: 'year-end-reminder/2026/abc' }
    )

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ replyTo: 'hello@yearly.world' }),
      { idempotencyKey: 'year-end-reminder/2026/abc' }
    )
  })

  it('falls back to the default sender', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test')
    vi.stubEnv('EMAIL_FROM', '')
    sendMock.mockResolvedValue({ data: { id: '1' }, error: null })
    const { sendEmail, DEFAULT_EMAIL_FROM } = await import('./send')

    await sendEmail(EMAIL)

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ from: DEFAULT_EMAIL_FROM }),
      {}
    )
  })

  it('throws when Resend reports an error', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test')
    sendMock.mockResolvedValue({
      data: null,
      error: { message: 'Domain not verified' },
    })
    const { sendEmail } = await import('./send')

    await expect(sendEmail(EMAIL)).rejects.toThrow('Domain not verified')
  })

  it("keeps Resend's error code, status and retry delay", async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test')
    sendMock.mockResolvedValue({
      data: null,
      error: {
        message: 'Too many requests',
        name: 'rate_limit_exceeded',
        statusCode: 429,
      },
      headers: { 'retry-after': '2' },
    })
    const { sendEmail, EmailSendError } = await import('./send')

    const error = await sendEmail(EMAIL).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(EmailSendError)
    expect(error).toMatchObject({
      code: 'rate_limit_exceeded',
      statusCode: 429,
      retryAfterMs: 2000,
    })
  })

  it('logs the email instead of sending it in development without a key', async () => {
    vi.stubEnv('RESEND_API_KEY', '')
    vi.stubEnv('NODE_ENV', 'development')
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    const { sendEmail } = await import('./send')

    const sent = await sendEmail(EMAIL)

    expect(sendMock).not.toHaveBeenCalled()
    expect(info).toHaveBeenCalledWith(expect.stringContaining('Hi'))
    expect(sent).toEqual({ id: null })
  })

  it('throws in production without a key', async () => {
    vi.stubEnv('RESEND_API_KEY', '')
    vi.stubEnv('NODE_ENV', 'production')
    const { sendEmail } = await import('./send')

    await expect(sendEmail(EMAIL)).rejects.toMatchObject({
      message: 'RESEND_API_KEY is not set',
      code: 'missing_api_key',
    })
  })
})
