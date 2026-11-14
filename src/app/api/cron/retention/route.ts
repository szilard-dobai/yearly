import { db } from '@/lib/db'
import getMongoDb from '@/lib/mongodb'
import { applyMongoRetention, applyPostgresRetention } from '@/lib/retention'
import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(request.headers.get('authorization') ?? '')
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  )
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, unknown> = {}
  let failed = false

  try {
    results.mongo = await applyMongoRetention(await getMongoDb())
  } catch (error) {
    console.error('Retention failed for MongoDB:', error)
    results.mongo = 'failed'
    failed = true
  }

  if (process.env.DATABASE_URL) {
    try {
      results.postgres = await applyPostgresRetention(db)
    } catch (error) {
      console.error('Retention failed for Postgres:', error)
      results.postgres = 'failed'
      failed = true
    }
  }

  console.info('Retention run:', JSON.stringify(results))
  return NextResponse.json(results, { status: failed ? 500 : 200 })
}
