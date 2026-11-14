import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'

const { applyMongoRetention, applyPostgresRetention } = vi.hoisted(() => ({
  applyMongoRetention: vi.fn(),
  applyPostgresRetention: vi.fn(),
}))

vi.mock('@/lib/retention', () => ({
  applyMongoRetention,
  applyPostgresRetention,
}))
vi.mock('@/lib/mongodb', () => ({ default: vi.fn(async () => ({})) }))
vi.mock('@/lib/db', () => ({ db: {} }))

function call(authorization?: string) {
  return GET(
    new Request('http://localhost:3000/api/cron/retention', {
      headers: authorization ? { authorization } : {},
    })
  )
}

describe('/api/cron/retention', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'cron-secret')
    vi.stubEnv('DATABASE_URL', 'postgres://example')
    vi.spyOn(console, 'info').mockImplementation(() => {})
    applyMongoRetention.mockResolvedValue({ eventsDeleted: 0 })
    applyPostgresRetention.mockResolvedValue({ expiredSessionsDeleted: 0 })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('refuses calls without the cron secret', async () => {
    expect((await call()).status).toBe(401)
    expect((await call('Bearer wrong')).status).toBe(401)
    expect(applyMongoRetention).not.toHaveBeenCalled()
  })

  it('refuses every call when no secret is configured', async () => {
    vi.stubEnv('CRON_SECRET', '')

    expect((await call('Bearer ')).status).toBe(401)
  })

  it('applies retention to both databases', async () => {
    const response = await call('Bearer cron-secret')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      mongo: { eventsDeleted: 0 },
      postgres: { expiredSessionsDeleted: 0 },
    })
  })

  it('still cleans Postgres when MongoDB fails, and reports the failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    applyMongoRetention.mockRejectedValue(new Error('down'))

    const response = await call('Bearer cron-secret')

    expect(response.status).toBe(500)
    expect(applyPostgresRetention).toHaveBeenCalled()
    expect(await response.json()).toEqual({
      mongo: 'failed',
      postgres: { expiredSessionsDeleted: 0 },
    })
  })
})
