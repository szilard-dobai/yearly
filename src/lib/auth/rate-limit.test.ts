// @vitest-environment node
import type { Database } from '@/lib/db'
import { rateLimits } from '@/lib/db/schema'
import { createTestDb } from '@/test/db'
import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createRateLimitStorage, hashRateLimitKey } from './rate-limit'

const RULE = { window: 600, max: 3 }
const KEY = '203.0.113.7|/sign-in/magic-link'

describe('createRateLimitStorage', () => {
  let db: Database
  let close: () => Promise<void>

  beforeAll(async () => {
    ;({ db, close } = await createTestDb())
  })

  afterAll(async () => {
    await close()
  })

  beforeEach(async () => {
    await db.delete(rateLimits)
  })

  it('allows requests up to the limit, then blocks with a retry time', async () => {
    const storage = createRateLimitStorage(db)

    for (let i = 0; i < RULE.max; i++) {
      expect(await storage.consume(KEY, RULE)).toEqual({
        allowed: true,
        retryAfter: null,
      })
    }

    const blocked = await storage.consume(KEY, RULE)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfter).toBeGreaterThan(RULE.window - 5)
    expect(blocked.retryAfter).toBeLessThanOrEqual(RULE.window)
  })

  it('starts a new window once the old one has passed', async () => {
    const storage = createRateLimitStorage(db)
    for (let i = 0; i <= RULE.max; i++) {
      await storage.consume(KEY, RULE)
    }

    await db
      .update(rateLimits)
      .set({ windowStart: sql`now() - interval '11 minutes'` })

    expect(await storage.consume(KEY, RULE)).toEqual({
      allowed: true,
      retryAfter: null,
    })
    const [row] = await db.select().from(rateLimits)
    expect(row.count).toBe(1)
  })

  it('counts each key separately', async () => {
    const storage = createRateLimitStorage(db)
    for (let i = 0; i <= RULE.max; i++) {
      await storage.consume(KEY, RULE)
    }

    const other = await storage.consume(
      '198.51.100.2|/sign-in/magic-link',
      RULE
    )
    expect(other.allowed).toBe(true)
  })

  it('stores a hash of the key, never the IP address', async () => {
    await createRateLimitStorage(db).consume(KEY, RULE)

    const rows = await db.select().from(rateLimits)
    expect(rows).toEqual([
      expect.objectContaining({ key: hashRateLimitKey(KEY), count: 1 }),
    ])
    expect(rows[0].key).not.toContain('203.0.113.7')
  })
})
