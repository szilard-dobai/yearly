import type { Database } from '@/lib/db'
import { rateLimits } from '@/lib/db/schema'
import type { BetterAuthRateLimitStorage } from 'better-auth'
import { sql } from 'drizzle-orm'
import { createHash } from 'node:crypto'

export function hashRateLimitKey(key: string) {
  return createHash('sha256').update(key).digest('hex')
}

export function createRateLimitStorage(
  db: Database
): BetterAuthRateLimitStorage {
  return {
    async consume(key, { window, max }) {
      const expired = sql`${rateLimits.windowStart} <= now() - make_interval(secs => ${window})`
      const [row] = await db
        .insert(rateLimits)
        .values({
          key: hashRateLimitKey(key),
          count: 1,
          windowStart: sql`now()`,
        })
        .onConflictDoUpdate({
          target: rateLimits.key,
          set: {
            count: sql`case when ${expired} then 1 else ${rateLimits.count} + 1 end`,
            windowStart: sql`case when ${expired} then now() else ${rateLimits.windowStart} end`,
          },
        })
        .returning({
          count: rateLimits.count,
          retryAfter: sql<number>`greatest(0, ceil(extract(epoch from (${rateLimits.windowStart} + make_interval(secs => ${window}) - now()))))::int`,
        })

      if (row.count <= max) {
        return { allowed: true, retryAfter: null }
      }
      return { allowed: false, retryAfter: Number(row.retryAfter) }
    },
  }
}
