import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from './route'

const { handler } = vi.hoisted(() => ({
  handler: vi.fn(async () => new Response('ok')),
}))

vi.mock('@/lib/auth/server', () => ({ auth: { handler } }))

const request = (method: string) =>
  new Request('http://localhost:3000/api/auth/get-session', { method })

describe('/api/auth', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    handler.mockClear()
  })

  it('returns 404 while accounts are switched off', async () => {
    vi.stubEnv('ACCOUNTS_ENABLED', '')

    expect((await GET(request('GET'))).status).toBe(404)
    expect((await POST(request('POST'))).status).toBe(404)
    expect(handler).not.toHaveBeenCalled()
  })

  it('passes requests to Better Auth when accounts are on', async () => {
    vi.stubEnv('ACCOUNTS_ENABLED', 'true')

    expect(await (await GET(request('GET'))).text()).toBe('ok')
    expect(await (await POST(request('POST'))).text()).toBe('ok')
    expect(handler).toHaveBeenCalledTimes(2)
  })
})
