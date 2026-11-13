import { attachDatabasePool } from '@vercel/functions'
import { drizzle } from 'drizzle-orm/node-postgres'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { Pool } from 'pg'
import * as schema from './schema'

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>

declare global {
  var _pgPool: Pool | undefined
}

function createPool() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  attachDatabasePool(pool)
  return pool
}

const pool = globalThis._pgPool ?? createPool()

if (process.env.NODE_ENV === 'development') {
  globalThis._pgPool = pool
}

export const db: Database = drizzle(pool, { schema })
