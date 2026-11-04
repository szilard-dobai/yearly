import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

export const ADMIN_SESSION_COOKIE = 'admin_session'
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24

const TOKEN_VERSION = 'v1'

function sha256(value: string): Buffer {
  return createHash('sha256').update(value).digest()
}

function getAdminPassword(): string | null {
  return process.env.ADMIN_PASSWORD || null
}

function getSigningKey(password: string): Buffer {
  return sha256(`yearly-admin-session:${TOKEN_VERSION}:${password}`)
}

function sign(payload: string, key: Buffer): string {
  return createHmac('sha256', key).update(payload).digest('base64url')
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b)
}

export function isAdminPasswordConfigured(): boolean {
  return getAdminPassword() !== null
}

export function isValidAdminPassword(candidate: unknown): boolean {
  const password = getAdminPassword()
  if (!password || typeof candidate !== 'string') return false
  return safeEqual(sha256(candidate), sha256(password))
}

export function createAdminSessionToken(now = Date.now()): string {
  const password = getAdminPassword()
  if (!password) {
    throw new Error('ADMIN_PASSWORD is not configured')
  }

  const expiresAt = now + ADMIN_SESSION_MAX_AGE_SECONDS * 1000
  const payload = `${TOKEN_VERSION}.${expiresAt}`
  return `${payload}.${sign(payload, getSigningKey(password))}`
}

export function verifyAdminSessionToken(
  token: string | undefined,
  now = Date.now()
): boolean {
  const password = getAdminPassword()
  if (!password || !token) return false

  const [version, expiresAtRaw, signature, ...rest] = token.split('.')
  if (version !== TOKEN_VERSION || !signature || rest.length > 0) return false

  const expiresAt = Number(expiresAtRaw)
  if (
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= now ||
    expiresAt > now + ADMIN_SESSION_MAX_AGE_SECONDS * 1000
  ) {
    return false
  }

  const expected = sign(`${version}.${expiresAtRaw}`, getSigningKey(password))
  return safeEqual(Buffer.from(signature), Buffer.from(expected))
}
