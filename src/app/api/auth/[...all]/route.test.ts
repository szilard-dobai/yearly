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
    handler.mockClear()
  })

  it('passes requests to Better Auth', async () => {
    expect(await (await GET(request('GET'))).text()).toBe('ok')
    expect(await (await POST(request('POST'))).text()).toBe('ok')
    expect(handler).toHaveBeenCalledTimes(2)
  })
})
