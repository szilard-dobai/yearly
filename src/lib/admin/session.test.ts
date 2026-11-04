import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionToken,
  isValidAdminPassword,
  verifyAdminSessionToken,
} from './session'

const NOW = new Date('2026-11-04T12:00:00Z').getTime()
const MAX_AGE_MS = ADMIN_SESSION_MAX_AGE_SECONDS * 1000

describe('admin session tokens', () => {
  beforeEach(() => {
    vi.stubEnv('ADMIN_PASSWORD', 'correct horse battery staple')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('accepts a freshly issued token', () => {
    const token = createAdminSessionToken(NOW)
    expect(verifyAdminSessionToken(token, NOW)).toBe(true)
    expect(verifyAdminSessionToken(token, NOW + MAX_AGE_MS - 1)).toBe(true)
  })

  it('rejects the legacy constant cookie value', () => {
    expect(verifyAdminSessionToken('authenticated', NOW)).toBe(false)
  })

  it('rejects missing or malformed tokens', () => {
    expect(verifyAdminSessionToken(undefined, NOW)).toBe(false)
    expect(verifyAdminSessionToken('', NOW)).toBe(false)
    expect(verifyAdminSessionToken('v1.123', NOW)).toBe(false)
    expect(verifyAdminSessionToken('v2.123.abc', NOW)).toBe(false)
    const token = createAdminSessionToken(NOW)
    expect(verifyAdminSessionToken(`${token}.extra`, NOW)).toBe(false)
  })

  it('rejects expired tokens', () => {
    const token = createAdminSessionToken(NOW)
    expect(verifyAdminSessionToken(token, NOW + MAX_AGE_MS)).toBe(false)
  })

  it('rejects a token whose expiry was extended', () => {
    const [version, expiresAt, signature] =
      createAdminSessionToken(NOW).split('.')
    const extended = `${version}.${Number(expiresAt) + MAX_AGE_MS}.${signature}`
    expect(verifyAdminSessionToken(extended, NOW + MAX_AGE_MS)).toBe(false)
  })

  it('rejects a tampered signature', () => {
    const token = createAdminSessionToken(NOW)
    const tampered = `${token.slice(0, -1)}${token.endsWith('A') ? 'B' : 'A'}`
    expect(verifyAdminSessionToken(tampered, NOW)).toBe(false)
  })

  it('rejects tokens that claim to outlive the max age', () => {
    const futureToken = createAdminSessionToken(NOW + MAX_AGE_MS)
    expect(verifyAdminSessionToken(futureToken, NOW)).toBe(false)
  })

  it('invalidates existing sessions when the password changes', () => {
    const token = createAdminSessionToken(NOW)
    vi.stubEnv('ADMIN_PASSWORD', 'a new password')
    expect(verifyAdminSessionToken(token, NOW)).toBe(false)
  })

  it('rejects every token and refuses to issue one without a password', () => {
    const token = createAdminSessionToken(NOW)
    vi.stubEnv('ADMIN_PASSWORD', '')
    expect(verifyAdminSessionToken(token, NOW)).toBe(false)
    expect(() => createAdminSessionToken(NOW)).toThrow(
      'ADMIN_PASSWORD is not configured'
    )
  })
})

describe('isValidAdminPassword', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('accepts only the configured password', () => {
    vi.stubEnv('ADMIN_PASSWORD', 'secret')
    expect(isValidAdminPassword('secret')).toBe(true)
    expect(isValidAdminPassword('Secret')).toBe(false)
    expect(isValidAdminPassword('secret ')).toBe(false)
    expect(isValidAdminPassword('')).toBe(false)
    expect(isValidAdminPassword(undefined)).toBe(false)
    expect(isValidAdminPassword(['secret'])).toBe(false)
  })

  it('rejects everything when no password is configured', () => {
    vi.stubEnv('ADMIN_PASSWORD', '')
    expect(isValidAdminPassword('')).toBe(false)
  })
})
