// @vitest-environment node
import type { Database } from '@/lib/db'
import { calendars, user } from '@/lib/db/schema'
import { createTestDb } from '@/test/db'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getCalendar, saveCalendar } from './store'

const DAYS = { '2026-03-10': ['FR', 'DE'] }

describe('calendar store', () => {
  let db: Database
  let close: () => Promise<void>

  beforeAll(async () => {
    ;({ db, close } = await createTestDb())
  })

  afterAll(async () => {
    await close()
  })

  beforeEach(async () => {
    await db.delete(calendars)
    await db.delete(user)
    await db.insert(user).values({
      id: 'ana',
      name: '',
      email: 'ana@example.com',
      updatedAt: new Date(),
    })
  })

  it('returns an empty calendar at version 0 before the first save', async () => {
    expect(await getCalendar(db, 'ana')).toEqual({ days: {}, version: 0 })
  })

  it('saves the first calendar as version 1', async () => {
    expect(await saveCalendar(db, 'ana', DAYS, 0)).toEqual({
      ok: true,
      version: 1,
    })
    expect(await getCalendar(db, 'ana')).toEqual({ days: DAYS, version: 1 })
  })

  it('moves to the next version when saved on top of the latest one', async () => {
    await saveCalendar(db, 'ana', DAYS, 0)

    expect(await saveCalendar(db, 'ana', { '2026-03-11': ['IT'] }, 1)).toEqual({
      ok: true,
      version: 2,
    })
    expect(await getCalendar(db, 'ana')).toEqual({
      days: { '2026-03-11': ['IT'] },
      version: 2,
    })
  })

  it('refuses a save based on an old version and returns the latest one', async () => {
    await saveCalendar(db, 'ana', DAYS, 0)
    await saveCalendar(db, 'ana', { '2026-03-11': ['IT'] }, 1)

    expect(await saveCalendar(db, 'ana', {}, 1)).toEqual({
      ok: false,
      remote: { days: { '2026-03-11': ['IT'] }, version: 2 },
    })
  })

  it('refuses a second first save from another device', async () => {
    await saveCalendar(db, 'ana', DAYS, 0)

    expect(await saveCalendar(db, 'ana', {}, 0)).toEqual({
      ok: false,
      remote: { days: DAYS, version: 1 },
    })
  })

  it('deletes the calendar with the account', async () => {
    await saveCalendar(db, 'ana', DAYS, 0)

    await db.delete(user)

    expect(await db.select().from(calendars)).toHaveLength(0)
  })
})
