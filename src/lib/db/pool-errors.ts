import type { Pool } from 'pg'

type PostgresError = Error & { code?: string }

const DROPPED_CONNECTION_CODES = new Set(['57P01', '57P05', 'ECONNRESET'])

export function isDroppedConnection(error: PostgresError) {
  return (
    error.message === 'Connection terminated unexpectedly' ||
    (error.code !== undefined && DROPPED_CONNECTION_CODES.has(error.code))
  )
}

export function handlePoolErrors(pool: Pool) {
  pool.on('error', (error: PostgresError) => {
    if (isDroppedConnection(error)) {
      console.warn(
        `Postgres closed an idle connection: ${error.code ?? error.message}`
      )
    } else {
      console.error('Postgres idle connection failed:', error)
    }
  })
  pool.on('connect', (client) => {
    // A checked-out client's error also fails its current or next query, and that query's caller reports it
    client.on('error', () => {})
  })
}
