import type { Database } from '@/lib/db'
import { calendars } from '@/lib/db/schema'
import { and, eq, sql } from 'drizzle-orm'
import type { CalendarDays, RemoteCalendar } from './days'

export type SaveResult =
  | { ok: true; version: number }
  | { ok: false; remote: RemoteCalendar }

export async function getCalendar(
  db: Database,
  userId: string
): Promise<RemoteCalendar> {
  const [row] = await db
    .select({ days: calendars.days, version: calendars.version })
    .from(calendars)
    .where(eq(calendars.userId, userId))
  return row ?? { days: {}, version: 0 }
}

export async function saveCalendar(
  db: Database,
  userId: string,
  days: CalendarDays,
  baseVersion: number
): Promise<SaveResult> {
  const saved =
    baseVersion === 0
      ? await db
          .insert(calendars)
          .values({ userId, days, version: 1 })
          .onConflictDoNothing()
          .returning({ version: calendars.version })
      : await db
          .update(calendars)
          .set({
            days,
            version: sql`${calendars.version} + 1`,
            updatedAt: sql`now()`,
          })
          .where(
            and(
              eq(calendars.userId, userId),
              eq(calendars.version, baseVersion)
            )
          )
          .returning({ version: calendars.version })

  if (saved.length > 0) return { ok: true, version: saved[0].version }
  return { ok: false, remote: await getCalendar(db, userId) }
}
