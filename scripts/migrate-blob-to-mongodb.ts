/**
 * Migration script to transfer tracking events from Vercel Blob to MongoDB
 *
 * Usage:
 *   npx tsx scripts/migrate-blob-to-mongodb.ts
 *
 * Environment variables required:
 *   - BLOB_READ_WRITE_TOKEN: Vercel Blob token
 *   - MONGODB_URI: MongoDB connection string
 */

import { config } from 'dotenv'
import { list } from '@vercel/blob'
import { MongoClient } from 'mongodb'

// Load .env.local
config({ path: '.env.local' })

const BATCH_SIZE = 100

async function getAllBlobs(prefix: string) {
  const allBlobs: Awaited<ReturnType<typeof list>>['blobs'] = []
  let cursor: string | undefined

  do {
    const result = await list({ prefix, limit: 1000, cursor })
    allBlobs.push(...result.blobs)
    cursor = result.hasMore ? result.cursor : undefined
  } while (cursor)

  return allBlobs
}

async function migrate() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is required')
  }

  const mongoDb = process.env.MONGODB_DB
  if (!mongoDb) {
    throw new Error('MONGODB_DB environment variable is required')
  }

  console.log('Connecting to MongoDB...')
  const client = new MongoClient(mongoUri, {
    appName: 'devrel.vercel.integration',
    maxIdleTimeMS: 5000,
  })
  await client.connect()
  const collection = client.db(mongoDb).collection('tracking_events')

  console.log('Fetching blob list...')
  const allBlobs = await getAllBlobs('tracking/')
  const validBlobs = allBlobs.filter((blob) => blob.pathname.endsWith('.json'))
  console.log(`Found ${validBlobs.length} tracking events to migrate`)

  let migrated = 0
  let skipped = 0
  let errors = 0

  for (let i = 0; i < validBlobs.length; i += BATCH_SIZE) {
    const batch = validBlobs.slice(i, i + BATCH_SIZE)

    const batchResults = await Promise.all(
      batch.map(async (blob) => {
        try {
          const response = await fetch(blob.url)
          const event = await response.json()
          return {
            ...event,
            timestamp: new Date(event.timestamp),
            _blobPath: blob.pathname,
          }
        } catch (err) {
          console.error(`Failed to fetch ${blob.pathname}:`, err)
          return null
        }
      })
    )

    const validEvents = batchResults.filter(Boolean)

    if (validEvents.length > 0) {
      try {
        // Use unordered insert to continue on duplicates
        const result = await collection.insertMany(validEvents, {
          ordered: false,
        })
        migrated += result.insertedCount
      } catch (err: unknown) {
        // Handle duplicate key errors (if re-running migration)
        if (
          err &&
          typeof err === 'object' &&
          'code' in err &&
          err.code === 11000
        ) {
          const bulkErr = err as { insertedCount?: number }
          migrated += bulkErr.insertedCount || 0
          skipped += validEvents.length - (bulkErr.insertedCount || 0)
        } else {
          throw err
        }
      }
    }

    errors += batch.length - validEvents.length

    const progress = Math.min(i + BATCH_SIZE, validBlobs.length)
    console.log(
      `Progress: ${progress}/${validBlobs.length} (${migrated} migrated, ${skipped} skipped, ${errors} errors)`
    )
  }

  console.log('\nMigration complete!')
  console.log(`  Total events: ${validBlobs.length}`)
  console.log(`  Migrated: ${migrated}`)
  console.log(`  Skipped (duplicates): ${skipped}`)
  console.log(`  Errors: ${errors}`)

  await client.close()
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
