/**
 * Gives everyone on the video waitlist one free video pack, by copying the
 * waitlist's emails from MongoDB into Postgres video_credit. See "Free first
 * video" in docs/06-paid-videos.md.
 *
 * Run on launch day, before the launch email. Emails are trimmed, lowercased
 * and deduplicated, and invalid ones are skipped. Safe to run again: emails
 * that already have a credit, or whose account already used a free video,
 * are skipped. Prints counts and database hosts only, never emails.
 *
 * Usage:
 *   npm run video:import-credits -- --expires 2027-01-31
 *     Dry run: counts what would be inserted and writes nothing.
 *   npm run video:import-credits -- --expires 2027-01-31 --commit
 *     Inserts the credits.
 *
 * --expires is the last day a credit can be used. It ends at midnight UTC
 * after that day, and the daily retention cron then deletes unused credits.
 *
 * Environment variables (read from .env.local locally; variables already set,
 * for example with `node --env-file=<file>`, win):
 *   - MONGODB_URI and MONGODB_DB
 *   - DATABASE_URL_UNPOOLED, or DATABASE_URL
 */

import { config } from 'dotenv'
import { MongoClient } from 'mongodb'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import pg from 'pg'
import { z } from 'zod'

const WAITLIST_FEATURE = 'animated_video'
const DAY_MS = 24 * 60 * 60 * 1000

const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email())

export type ImportOptions = { expiresAt: Date; commit: boolean }

export type NormalizedEmails = {
  found: number
  valid: string[]
  invalid: number
  duplicates: number
}

export type ImportCounts = {
  alreadyThere: number
  alreadyUsed: number
  inserted: number
}

export type Queryable = {
  query: (
    text: string,
    params: unknown[]
  ) => Promise<{ rows: Record<string, unknown>[] }>
}

export function parseExpiry(value: string | undefined, now: Date): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '')
  if (!match) {
    throw new Error('Pass --expires with a date such as 2027-01-31')
  }
  const [year, month, day] = match.slice(1).map(Number)
  const start = new Date(Date.UTC(year, month - 1, day))
  if (start.toISOString().slice(0, 10) !== value) {
    throw new Error(`--expires ${value} isn't a real date`)
  }
  const expiresAt = new Date(start.getTime() + DAY_MS)
  if (expiresAt.getTime() <= now.getTime()) {
    throw new Error('--expires must be today or later')
  }
  return expiresAt
}

export function parseOptions(args: string[], now: Date): ImportOptions {
  const { values } = parseArgs({
    args,
    options: {
      expires: { type: 'string' },
      commit: { type: 'boolean', default: false },
    },
  })
  return {
    expiresAt: parseExpiry(values.expires, now),
    commit: values.commit,
  }
}

export function normalizeEmails(values: unknown[]): NormalizedEmails {
  const valid = new Set<string>()
  let invalid = 0
  let duplicates = 0
  for (const value of values) {
    const parsed = emailSchema.safeParse(value)
    if (!parsed.success) {
      invalid += 1
    } else if (valid.has(parsed.data)) {
      duplicates += 1
    } else {
      valid.add(parsed.data)
    }
  }
  return { found: values.length, valid: [...valid], invalid, duplicates }
}

const USED_CREDIT = `
  select 1 from video_order o join "user" u on u.id = o.user_id
  where o.source = 'credit' and lower(u.email) = e.email`

export async function importCredits(
  db: Queryable,
  emails: string[],
  { expiresAt, commit }: ImportOptions
): Promise<ImportCounts> {
  const {
    rows: [counts],
  } = await db.query(
    `select
       count(c.email)::int as already_there,
       count(*) filter (where c.email is null and exists (${USED_CREDIT}))::int as already_used
     from unnest($1::text[]) as e(email)
     left join video_credit c on c.email = e.email`,
    [emails]
  )
  const alreadyThere = Number(counts.already_there)
  const alreadyUsed = Number(counts.already_used)

  if (!commit) {
    return {
      alreadyThere,
      alreadyUsed,
      inserted: emails.length - alreadyThere - alreadyUsed,
    }
  }

  const { rows } = await db.query(
    `insert into video_credit (email, source, expires_at)
     select e.email, 'waitlist', $2
     from unnest($1::text[]) as e(email)
     where not exists (${USED_CREDIT})
     on conflict (email) do nothing
     returning true as inserted`,
    [emails, expiresAt]
  )
  return { alreadyThere, alreadyUsed, inserted: rows.length }
}

export function describeTarget(url: string, database?: string): string {
  try {
    const parsed = new URL(url)
    const name = database ?? parsed.pathname.replace(/^\//, '')
    return name ? `${parsed.hostname}, database ${name}` : parsed.hostname
  } catch {
    return 'an address that could not be read'
  }
}

export function formatReport(
  emails: NormalizedEmails,
  counts: ImportCounts,
  { expiresAt, commit }: ImportOptions
): string[] {
  return [
    `Waitlist rows found: ${emails.found}`,
    `Valid emails, deduplicated: ${emails.valid.length} (${emails.invalid} invalid, ${emails.duplicates} duplicates)`,
    `Already have a credit: ${counts.alreadyThere}`,
    `Already used a free video: ${counts.alreadyUsed}`,
    `${commit ? 'Inserted' : 'Would insert'}: ${counts.inserted}, usable until ${expiresAt.toISOString()}`,
    ...(commit ? [] : ['Dry run: nothing was written. Add --commit to write.']),
  ]
}

async function main() {
  config({ path: ['.env.local', '.env'], quiet: true })
  const options = parseOptions(process.argv.slice(2), new Date())

  const mongoUri = process.env.MONGODB_URI
  const mongoDb = process.env.MONGODB_DB
  const postgresUrl =
    process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
  if (!mongoUri || !mongoDb)
    throw new Error('MONGODB_URI and MONGODB_DB are needed')
  if (!postgresUrl)
    throw new Error('DATABASE_URL_UNPOOLED or DATABASE_URL is needed')

  console.log(`Reading from MongoDB ${describeTarget(mongoUri, mongoDb)}`)
  console.log(`Writing to Postgres ${describeTarget(postgresUrl)}`)

  const mongo = new MongoClient(mongoUri)
  const pool = new pg.Pool({ connectionString: postgresUrl, max: 1 })
  try {
    const rows = await mongo
      .db(mongoDb)
      .collection('waitlist')
      .find({ feature: WAITLIST_FEATURE }, { projection: { _id: 0, email: 1 } })
      .toArray()
    const emails = normalizeEmails(rows.map((row) => row.email))
    const counts = await importCredits(pool, emails.valid, options)
    for (const line of formatReport(emails, counts, options)) console.log(line)
  } finally {
    await Promise.all([mongo.close(), pool.end()])
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'The import failed')
    process.exitCode = 1
  })
}
