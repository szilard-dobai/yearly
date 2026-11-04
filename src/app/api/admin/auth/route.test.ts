import { ADMIN_SESSION_COOKIE } from '@/lib/admin/session'
import { isAuthenticated } from '@/lib/tracking/api'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DELETE, GET, POST } from './route'

const cookieJar = new Map<string, string>()
const cookieStore = {
  get: (name: string) =>
    cookieJar.has(name) ? { name, value: cookieJar.get(name) } : undefined,
  set: vi.fn((name: string, value: string) => {
    cookieJar.set(name, value)
  }),
  delete: vi.fn((name: string) => {
    cookieJar.delete(name)
  }),
}

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve(cookieStore),
}))

function authRequest(method: 'GET' | 'POST' | 'DELETE', body?: unknown) {
  return new Request('http://localhost/api/admin/auth', {
    method,
    headers: {
      'content-type': 'application/json',
      'sec-fetch-site': 'same-origin',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

describe('/api/admin/auth', () => {
  beforeEach(() => {
    cookieJar.clear()
    cookieStore.set.mockClear()
    vi.stubEnv('ADMIN_PASSWORD', 'secret')
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('does not treat a forged "authenticated" cookie as a session', async () => {
    cookieJar.set(ADMIN_SESSION_COOKIE, 'authenticated')
    expect(await isAuthenticated()).toBe(false)
  })

  it('issues a signed session cookie for the correct password', async () => {
    const response = await POST(authRequest('POST', { password: 'secret' }))

    expect(response.status).toBe(200)
    expect(cookieStore.set).toHaveBeenCalledWith(
      ADMIN_SESSION_COOKIE,
      expect.stringMatching(/^v1\.\d+\.[\w-]+$/),
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 60 * 60 * 24,
        path: '/',
      })
    )
    expect(cookieJar.get(ADMIN_SESSION_COOKIE)).not.toBe('authenticated')
    expect(await isAuthenticated()).toBe(true)
  })

  it('rejects a wrong password without setting a cookie', async () => {
    const response = await POST(authRequest('POST', { password: 'guess' }))

    expect(response.status).toBe(401)
    expect(cookieStore.set).not.toHaveBeenCalled()
    expect(await isAuthenticated()).toBe(false)
  })

  it('reports a missing admin password as a server error', async () => {
    vi.stubEnv('ADMIN_PASSWORD', '')

    const response = await POST(authRequest('POST', { password: '' }))

    expect(response.status).toBe(500)
    expect(cookieStore.set).not.toHaveBeenCalled()
  })

  it('rejects cross-site login attempts', async () => {
    const response = await POST(
      new Request('http://localhost/api/admin/auth', {
        method: 'POST',
        headers: { 'sec-fetch-site': 'cross-site' },
        body: JSON.stringify({ password: 'secret' }),
      })
    )

    expect(response.status).toBe(403)
    expect(cookieStore.set).not.toHaveBeenCalled()
  })

  it('reports a forged cookie as signed out on the session check', async () => {
    cookieJar.set(ADMIN_SESSION_COOKIE, 'authenticated')

    const response = await GET(authRequest('GET'))

    expect(await response.json()).toEqual({ authenticated: false })
  })

  it('reports a real session as signed in on the session check', async () => {
    await POST(authRequest('POST', { password: 'secret' }))

    const response = await GET(authRequest('GET'))

    expect(await response.json()).toEqual({ authenticated: true })
  })

  it('ends the session on logout', async () => {
    await POST(authRequest('POST', { password: 'secret' }))
    expect(await isAuthenticated()).toBe(true)

    await DELETE(authRequest('DELETE'))

    expect(await isAuthenticated()).toBe(false)
  })
})
