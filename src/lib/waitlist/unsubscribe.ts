import { createHmac, timingSafeEqual } from 'node:crypto'

export const UNSUBSCRIBE_SITE_URL = 'https://www.yearly.world'

const TOKEN_PATTERN = /^([0-9a-f]{24})\.([A-Za-z0-9_-]{43})$/

function getSigningKey(): Buffer | null {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) return null
  return createHmac('sha256', secret)
    .update('yearly-waitlist-unsubscribe:v1')
    .digest()
}

function sign(id: string, key: Buffer): string {
  return createHmac('sha256', key).update(id).digest('base64url')
}

export function isUnsubscribeConfigured(): boolean {
  return getSigningKey() !== null
}

export function createUnsubscribeToken(waitlistId: string): string {
  const key = getSigningKey()
  if (!key) throw new Error('BETTER_AUTH_SECRET is not set')
  return `${waitlistId}.${sign(waitlistId, key)}`
}

export function readUnsubscribeToken(token: unknown): string | null {
  if (typeof token !== 'string') return null
  const match = TOKEN_PATTERN.exec(token)
  const key = getSigningKey()
  if (!match || !key) return null
  const expected = Buffer.from(sign(match[1], key))
  const actual = Buffer.from(match[2])
  return expected.length === actual.length && timingSafeEqual(expected, actual)
    ? match[1]
    : null
}

export function getUnsubscribeUrls(
  token: string,
  siteUrl = UNSUBSCRIBE_SITE_URL
) {
  const query = new URLSearchParams({ token })
  const site = siteUrl.replace(/\/+$/, '')
  return {
    page: `${site}/unsubscribe?${query}`,
    oneClick: `${site}/api/waitlist/unsubscribe?${query}`,
  }
}
