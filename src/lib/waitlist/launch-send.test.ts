// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getLaunchSendBlock, launchIdempotencyKey } from './launch-send'

const { sendEmail } = vi.hoisted(() => ({ sendEmail: vi.fn() }))

vi.mock('@/lib/email/send', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/email/send')>()),
  sendEmail,
}))

const LAUNCH_DAY = new Date('2026-12-03T09:00:00Z')

function stubReadyEnv() {
  vi.stubEnv('VERCEL_ENV', 'production')
  vi.stubEnv('ACCOUNTS_ENABLED', 'true')
  vi.stubEnv('VIDEO_SALES_ENABLED', 'true')
  vi.stubEnv('EMAIL_POSTAL_ADDRESS', 'PO Box 12, Cluj-Napoca, Romania')
  vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret')
}

describe('getLaunchSendBlock', () => {
  beforeEach(stubReadyEnv)

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetAllMocks()
  })

  it('lets production send once everything is set', () => {
    expect(getLaunchSendBlock(LAUNCH_DAY)).toBeNull()
  })

  it('only sends from production', () => {
    vi.stubEnv('VERCEL_ENV', 'preview')

    expect(getLaunchSendBlock(LAUNCH_DAY)).toBe(
      'The launch email only sends from production'
    )
  })

  it('waits for video sales to be on', () => {
    vi.stubEnv('VIDEO_SALES_ENABLED', '')

    expect(getLaunchSendBlock(LAUNCH_DAY)).toBe('Turn on video sales first')
  })

  it('needs a postal address', () => {
    vi.stubEnv('EMAIL_POSTAL_ADDRESS', '  ')

    expect(getLaunchSendBlock(LAUNCH_DAY)).toBe(
      'Set EMAIL_POSTAL_ADDRESS first'
    )
  })

  it('needs the secret that signs unsubscribe links', () => {
    vi.stubEnv('BETTER_AUTH_SECRET', '')

    expect(getLaunchSendBlock(LAUNCH_DAY)).toBe('Set BETTER_AUTH_SECRET first')
  })

  it('stops once the free video offer has ended', () => {
    expect(getLaunchSendBlock(new Date('2027-01-31T23:59:59Z'))).toBeNull()
    expect(getLaunchSendBlock(new Date('2027-02-01T00:00:00Z'))).toBe(
      'The free video offer ended on 31 January 2027'
    )
  })
})

describe('createLaunchSender', () => {
  beforeEach(stubReadyEnv)

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetAllMocks()
  })

  it('sends with a key per waitlist entry and a signed unsubscribe link', async () => {
    const { createLaunchSender } = await import('./launch-send')
    const { readUnsubscribeToken } = await import('./unsubscribe')
    sendEmail.mockResolvedValue({ id: 'email-1' })
    const id = '6560f1a2b3c4d5e6f7a8b9c0'

    const sent = await createLaunchSender('PO Box 12')({
      id,
      email: 'ana@example.com',
      maybeSentBefore: false,
    })

    expect(sent).toEqual({ id: 'email-1' })
    const [email, options] = sendEmail.mock.calls[0]
    expect(options).toEqual({ idempotencyKey: launchIdempotencyKey(id) })
    expect(email.to).toBe('ana@example.com')
    expect(email.text).toContain('Yearly, PO Box 12')
    expect(email.text).not.toContain(`token=ana`)
    const token = new URL(
      email.headers['List-Unsubscribe'].slice(1, -1)
    ).searchParams.get('token')
    expect(readUnsubscribeToken(token)).toBe(id)
  })
})
