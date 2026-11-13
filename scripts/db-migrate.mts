/**
 * Applies the SQL migrations in drizzle/ to the Postgres database.
 *
 * Runs before every Vercel build (see the vercel-build script), so each
 * preview deployment migrates its own Neon branch and production migrates
 * production. Skips when no database is configured.
 *
 * Usage:
 *   npm run db:migrate
 *
 * Environment variables (read from .env.local locally):
 *   - DATABASE_URL_UNPOOLED, or DATABASE_URL
 */

import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'

config({ path: ['.env.local', '.env'], quiet: true })

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL

if (!url) {
  console.log('No DATABASE_URL set, so no migrations were run.')
  process.exit(0)
}

const pool = new pg.Pool({ connectionString: url, max: 1 })

try {
  await migrate(drizzle(pool), { migrationsFolder: 'drizzle' })
  console.log('Database migrations are up to date.')
} finally {
  await pool.end()
}
