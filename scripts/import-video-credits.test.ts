// @vitest-environment node
import type { Database } from '@/lib/db'
import { user, videoCredits, videoOrders } from '@/lib/db/schema'
import { createTestDb } from '@/test/db'
import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  describeTarget,
  formatReport,
  importCredits,
  normalizeEmails,
  parseExpiry,
  parseOptions,
} from './import-video-credits.mjs'

const NOW = new Date('2026-12-01T09:00:00Z')
const EXPIRES_AT = new Date('2027-02-01T00:00:00Z')

describe('parseExpiry', () => {
  it('ends the credit at midnight UTC after the given day', () => {
    expect(parseExpiry('2027-01-31', NOW)).toEqual(EXPIRES_AT)
  })

  it.each([undefined, '', '31/01/2027', '2027-1-31', '2027-01-31T00:00'])(
    'needs a YYYY-MM-DD date, not %j',
    (value) => {
      expect(() => parseExpiry(value, NOW)).toThrow(
        'Pass --expires with a date such as 2027-01-31'
      )
    }
  )

  it('refuses a date that does not exist', () => {
    expect(() => parseExpiry('2027-02-30', NOW)).toThrow("isn't a real date")
  })

  it('refuses a day that has already ended', () => {
    expect(() => parseExpiry('2026-11-30', NOW)).toThrow(
      'must be today or later'
    )
    expect(parseExpiry('2026-12-01', NOW)).toEqual(
      new Date('2026-12-02T00:00:00Z')
    )
  })
})

describe('parseOptions', () => {
  it('is a dry run unless --commit is passed', () => {
    expect(parseOptions(['--expires', '2027-01-31'], NOW)).toEqual({
      expiresAt: EXPIRES_AT,
      commit: false,
    })
    expect(parseOptions(['--expires=2027-01-31', '--commit'], NOW).commit).toBe(
      true
    )
  })

  it('needs --expires', () => {
    expect(() => parseOptions(['--commit'], NOW)).toThrow('--expires')
  })

  it('refuses unknown options', () => {
    expect(() =>
      parseOptions(['--expires', '2027-01-31', '--force'], NOW)
    ).toThrow()
  })
})

describe('normalizeEmails', () => {
  it('trims, lowercases and deduplicates, and skips invalid emails', () => {
    expect(
      normalizeEmails([
        ' Ana@Example.com ',
        'ana@example.com',
        'bo@example.com',
        'not an email',
        '',
        null,
        42,
        `${'a'.repeat(250)}@example.com`,
        'BO@EXAMPLE.COM',
      ])
    ).toEqual({
      found: 9,
      valid: ['ana@example.com', 'bo@example.com'],
      invalid: 5,
      duplicates: 2,
    })
  })

  it('counts an empty waitlist', () => {
    expect(normalizeEmails([])).toEqual({
      found: 0,
      valid: [],
      invalid: 0,
      duplicates: 0,
    })
  })
})

describe('describeTarget', () => {
  it('names the host and database without the credentials', () => {
    expect(
      describeTarget(
        'postgresql://owner:secret@ep-cool-1.eu-central-1.aws.neon.tech/neondb?sslmode=require'
      )
    ).toBe('ep-cool-1.eu-central-1.aws.neon.tech, database neondb')
    expect(
      describeTarget(
        'mongodb+srv://owner:secret@cluster0.abc.mongodb.net/?retryWrites=true',
        'yearly'
      )
    ).toBe('cluster0.abc.mongodb.net, database yearly')
    expect(describeTarget('not a url')).toBe(
      'an address that could not be read'
    )
  })
})

describe('formatReport', () => {
  const emails = {
    found: 5,
    valid: ['ana@example.com', 'bo@example.com', 'cy@example.com'],
    invalid: 1,
    duplicates: 1,
  }
  const counts = { alreadyThere: 1, alreadyUsed: 0, inserted: 2 }

  it('prints counts only, never emails', () => {
    const lines = formatReport(emails, counts, {
      expiresAt: EXPIRES_AT,
      commit: false,
    })

    expect(lines).toEqual([
      'Waitlist rows found: 5',
      'Valid emails, deduplicated: 3 (1 invalid, 1 duplicates)',
      'Already have a credit: 1',
      'Already used a free video: 0',
      'Would insert: 2, usable until 2027-02-01T00:00:00.000Z',
      'Dry run: nothing was written. Add --commit to write.',
    ])
    expect(lines.join('\n')).not.toContain('@')
  })

  it('says what was inserted', () => {
    expect(
      formatReport(emails, counts, { expiresAt: EXPIRES_AT, commit: true })
    ).toContain('Inserted: 2, usable until 2027-02-01T00:00:00.000Z')
  })
})

describe('importCredits', () => {
  let db: Database
  let client: PGlite
  let close: () => Promise<void>

  beforeAll(async () => {
    ;({ db, client, close } = await createTestDb())
  })

  afterAll(async () => {
    await close()
  })

  beforeEach(async () => {
    await db.delete(videoCredits)
    await db.delete(videoOrders)
    await db.delete(user)
  })

  const EMAILS = ['ana@example.com', 'bo@example.com', 'cy@example.com']
  const COMMIT = { expiresAt: EXPIRES_AT, commit: true }

  async function credits() {
    return (await db.select().from(videoCredits))
      .map((row) => [row.email, row.source, row.expiresAt.toISOString()])
      .sort()
  }

  it('counts what it would insert and writes nothing in a dry run', async () => {
    expect(
      await importCredits(client, EMAILS, { ...COMMIT, commit: false })
    ).toEqual({ alreadyThere: 0, alreadyUsed: 0, inserted: 3 })
    expect(await credits()).toEqual([])
  })

  it('inserts a waitlist credit for each email', async () => {
    expect(await importCredits(client, EMAILS, COMMIT)).toEqual({
      alreadyThere: 0,
      alreadyUsed: 0,
      inserted: 3,
    })
    expect(await credits()).toEqual(
      EMAILS.map((email) => [email, 'waitlist', EXPIRES_AT.toISOString()])
    )
  })

  it('is safe to run twice', async () => {
    await importCredits(client, EMAILS.slice(0, 2), COMMIT)

    expect(await importCredits(client, EMAILS, COMMIT)).toEqual({
      alreadyThere: 2,
      alreadyUsed: 0,
      inserted: 1,
    })
    expect(await credits()).toHaveLength(3)
  })

  it("doesn't give a second free video to someone who used theirs", async () => {
    await db.insert(user).values({
      id: 'bo',
      name: '',
      email: 'Bo@Example.com',
      emailVerified: true,
      updatedAt: new Date(),
    })
    await db.insert(videoOrders).values({
      id: 'order-1',
      userId: 'bo',
      pack: 'year',
      year: 2026,
      source: 'credit',
      status: 'paid',
    })

    expect(
      await importCredits(client, EMAILS, { ...COMMIT, commit: false })
    ).toEqual({ alreadyThere: 0, alreadyUsed: 1, inserted: 2 })
    expect(await importCredits(client, EMAILS, COMMIT)).toEqual({
      alreadyThere: 0,
      alreadyUsed: 1,
      inserted: 2,
    })
    expect((await credits()).map(([email]) => email)).toEqual([
      'ana@example.com',
      'cy@example.com',
    ])
  })

  it('handles an empty waitlist', async () => {
    expect(await importCredits(client, [], COMMIT)).toEqual({
      alreadyThere: 0,
      alreadyUsed: 0,
      inserted: 0,
    })
  })
})
