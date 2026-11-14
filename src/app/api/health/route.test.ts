// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'

describe('/api/health', () => {
  beforeEach(() => {
    vi.stubEnv('ACCOUNTS_ENABLED', 'false')
    vi.stubEnv('MONGODB_URI', 'mongodb://example')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('answers ok when the server has what it needs', async () => {
    const response = GET()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
  })

  it('is never cached, so every check reaches the server', () => {
    expect(GET().headers.get('cache-control')).toBe('no-store')
  })

  it('answers 503 and reports which settings are missing to the logs', async () => {
    vi.stubEnv('ACCOUNTS_ENABLED', 'true')
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('DATABASE_URL', '')
    vi.stubEnv('BETTER_AUTH_SECRET', 'secret')
    vi.stubEnv('RESEND_API_KEY', '')
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = GET()

    expect(response.status).toBe(503)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(error).toHaveBeenCalledWith(
      'Health check failed: DATABASE_URL, RESEND_API_KEY not set'
    )
    const body = await response.text()
    expect(JSON.parse(body)).toEqual({ status: 'error' })
    expect(body).not.toContain('DATABASE_URL')
  })
})
