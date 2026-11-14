// @vitest-environment node
import type { Database } from '@/lib/db'
import { rateLimits, session, user, verification } from '@/lib/db/schema'
import { createTestDb } from '@/test/db'
import type { Db } from 'mongodb'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  applyMongoRetention,
  applyPostgresRetention,
  retentionCutoffs,
} from './retention'

const NOW = new Date('2026-11-14T03:00:00Z')

function fakeMongo() {
  const collections = new Map<
    string,
    {
      deleteMany: ReturnType<typeof vi.fn>
      updateMany: ReturnType<typeof vi.fn>
      countDocuments: ReturnType<typeof vi.fn>
    }
  >()
  const db = {
    collection: (name: string) => {
      if (!collections.has(name)) {
        collections.set(name, {
          deleteMany: vi.fn(async () => ({ deletedCount: 2 })),
          updateMany: vi.fn(async () => ({ modifiedCount: 3 })),
          countDocuments: vi.fn(async () => 7),
        })
      }
      return collections.get(name)!
    },
  } as unknown as Db
  return { db, get: (name: string) => collections.get(name)! }
}

describe('retentionCutoffs', () => {
  it('keeps full data for 26 months and anything at all for 5 years', () => {
    expect(retentionCutoffs(NOW)).toEqual({
      anonymizeBefore: new Date('2024-09-14T03:00:00Z'),
      deleteBefore: new Date('2021-11-14T03:00:00Z'),
    })
  })

  it('refuses to run with a broken clock', () => {
    expect(() => retentionCutoffs(new Date(Number.NaN))).toThrow(
      'nothing was changed'
    )
  })
})

describe('applyMongoRetention', () => {
  const { anonymizeBefore, deleteBefore } = retentionCutoffs(NOW)

  it('deletes after 5 years, then anonymizes what is between 26 months and 5 years', async () => {
    const mongo = fakeMongo()
    await applyMongoRetention(mongo.db, NOW)
    const events = mongo.get('tracking_events')

    expect(events.deleteMany).toHaveBeenCalledWith({
      timestamp: { $lt: deleteBefore },
    })
    expect(events.updateMany.mock.calls[0][0]).toEqual({
      timestamp: { $lt: anonymizeBefore, $gte: deleteBefore },
      anonymized: { $ne: true },
    })
    expect(events.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(
      events.updateMany.mock.invocationCallOrder[0]
    )
  })

  it('only touches the four collections it should', async () => {
    const mongo = fakeMongo()
    const spy = vi.spyOn(mongo.db, 'collection')
    await applyMongoRetention(mongo.db, NOW)

    expect(new Set(spy.mock.calls.map(([name]) => name))).toEqual(
      new Set([
        'tracking_events',
        'feedback',
        'reminder_calendar_adds',
        'reminders',
      ])
    )
  })

  it('deletes reminder emails only for past years', async () => {
    const mongo = fakeMongo()
    await applyMongoRetention(mongo.db, NOW)

    expect(mongo.get('reminders').deleteMany).toHaveBeenCalledWith({
      year: { $lt: 2026 },
    })
  })

  it('changes nothing in a dry run, and counts instead', async () => {
    const mongo = fakeMongo()
    const result = await applyMongoRetention(mongo.db, NOW, { dryRun: true })

    for (const name of [
      'tracking_events',
      'feedback',
      'reminder_calendar_adds',
      'reminders',
    ]) {
      expect(mongo.get(name).deleteMany).not.toHaveBeenCalled()
      expect(mongo.get(name).updateMany).not.toHaveBeenCalled()
    }
    expect(Object.values(result).every((n) => n === 7)).toBe(true)
  })

  it('reports what it changed', async () => {
    expect(await applyMongoRetention(fakeMongo().db, NOW)).toEqual({
      eventsDeleted: 2,
      eventsAnonymized: 3,
      feedbackDeleted: 2,
      feedbackAnonymized: 3,
      calendarAddsDeleted: 2,
      calendarAddsAnonymized: 3,
      remindersDeleted: 2,
    })
  })
})

describe('applyPostgresRetention', () => {
  let db: Database
  let close: () => Promise<void>

  beforeAll(async () => {
    ;({ db, close } = await createTestDb())
    const past = new Date(NOW.getTime() - 60_000)
    const future = new Date(NOW.getTime() + 60_000)
    await db.insert(user).values({
      id: 'ana',
      name: '',
      email: 'ana@example.com',
      updatedAt: NOW,
    })
    await db.insert(session).values([
      { id: 's1', token: 't1', userId: 'ana', expiresAt: past, updatedAt: NOW },
      {
        id: 's2',
        token: 't2',
        userId: 'ana',
        expiresAt: future,
        updatedAt: NOW,
      },
    ])
    await db.insert(verification).values([
      { id: 'v1', identifier: 'a', value: 'x', expiresAt: past },
      { id: 'v2', identifier: 'b', value: 'y', expiresAt: future },
    ])
    await db.insert(rateLimits).values([
      { key: 'old', count: 1, windowStart: new Date('2026-11-01T00:00:00Z') },
      { key: 'new', count: 1, windowStart: NOW },
    ])
  })

  afterAll(async () => {
    await close()
  })

  it('counts without deleting in a dry run', async () => {
    expect(await applyPostgresRetention(db, NOW, { dryRun: true })).toEqual({
      expiredSessionsDeleted: 1,
      expiredCodesDeleted: 1,
      rateLimitsDeleted: 1,
    })
    expect(await db.select().from(session)).toHaveLength(2)
  })

  it('deletes expired sessions, sign-in codes and old rate limits, and nothing else', async () => {
    expect(await applyPostgresRetention(db, NOW)).toEqual({
      expiredSessionsDeleted: 1,
      expiredCodesDeleted: 1,
      rateLimitsDeleted: 1,
    })
    expect((await db.select().from(session)).map((row) => row.id)).toEqual([
      's2',
    ])
    expect((await db.select().from(verification)).map((row) => row.id)).toEqual(
      ['v2']
    )
    expect((await db.select().from(rateLimits)).map((row) => row.key)).toEqual([
      'new',
    ])
    expect(await db.select().from(user)).toHaveLength(1)
  })
})
