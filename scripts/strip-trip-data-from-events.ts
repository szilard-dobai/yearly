/**
 * Removes full trip lists (countries and dates) from stored tracking events.
 *
 * Events recorded before 6 November 2026 sent the whole calendar with
 * image exports, image downloads and JSON exports, and the add-trip form sent
 * the dates it added. This replaces the calendar with the summary the app
 * sends now (counts and days per country, no dates) and deletes the dates.
 *
 * Usage:
 *   npx tsx scripts/strip-trip-data-from-events.ts           # dry run
 *   npx tsx scripts/strip-trip-data-from-events.ts --apply   # update events
 *
 * Environment variables required (read from .env.local):
 *   - MONGODB_URI
 *   - MONGODB_DB
 */

import { config } from 'dotenv'
import { type AnyBulkWriteOperation, type Document, MongoClient } from 'mongodb'
import {
  dayKeyFromStoredDate,
  summarizeTrips,
} from '../src/lib/tracking/trip-summary'

config({ path: '.env.local' })

const BATCH_SIZE = 500
const FILTER = { 'metadata.calendarData': { $exists: true } }
const DATES_FILTER = { 'metadata.dates': { $exists: true } }

type StoredVisit = { countryCode?: unknown; date?: unknown }

function summaryFor(event: Document) {
  const visits: StoredVisit[] = Array.isArray(
    event.metadata?.calendarData?.visits
  )
    ? event.metadata.calendarData.visits
    : []
  const year =
    typeof event.metadata?.year === 'number'
      ? event.metadata.year
      : new Date(event.timestamp).getUTCFullYear()

  return summarizeTrips(
    visits
      .filter(
        (v): v is { countryCode: string; date: string } =>
          typeof v.countryCode === 'string' &&
          typeof v.date === 'string' &&
          !Number.isNaN(Date.parse(v.date))
      )
      .map((v) => ({
        countryCode: v.countryCode,
        day: dayKeyFromStoredDate(v.date),
      })),
    year
  )
}

async function main() {
  const apply = process.argv.includes('--apply')
  const uri = process.env.MONGODB_URI
  const dbName = process.env.MONGODB_DB
  if (!uri || !dbName) {
    throw new Error('MONGODB_URI and MONGODB_DB must be set in .env.local')
  }

  const client = new MongoClient(uri, {
    appName: 'devrel.vercel.integration',
  })
  await client.connect()

  try {
    const events = client.db(dbName).collection('tracking_events')

    const byType = await events
      .aggregate<{
        _id: string
        count: number
      }>([
        { $match: FILTER },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray()
    const total = byType.reduce((sum, row) => sum + row.count, 0)

    const withDates = await events.countDocuments(DATES_FILTER)

    console.log(`${total} events contain trip lists:`)
    for (const row of byType) console.log(`  ${row._id}: ${row.count}`)
    console.log(`${withDates} events contain the dates of an added trip`)
    if (total === 0 && withDates === 0) return

    if (!apply) {
      const sample = await events.findOne(FILTER)
      if (sample) {
        console.log('\nExample replacement (one event):')
        console.log(`  ${JSON.stringify(summaryFor(sample))}`)
      }
      console.log('\nDry run only. Re-run with --apply to update the events.')
      return
    }

    let batch: AnyBulkWriteOperation[] = []
    let updated = 0
    const flush = async () => {
      if (batch.length === 0) return
      const result = await events.bulkWrite(batch, { ordered: false })
      updated += result.modifiedCount
      batch = []
    }

    const datesResult = await events.updateMany(DATES_FILTER, {
      $unset: { 'metadata.dates': '' },
    })
    console.log(`\nRemoved dates from ${datesResult.modifiedCount} events.`)

    for await (const event of events.find(FILTER, {
      projection: { type: 1, timestamp: 1, metadata: 1 },
    })) {
      const summary = summaryFor(event)
      batch.push({
        updateOne: {
          filter: { _id: event._id },
          update: {
            $set: {
              'metadata.year': summary.year,
              'metadata.visitCount': summary.visitCount,
              'metadata.dayCount': summary.dayCount,
              'metadata.countryCount': summary.countryCount,
              'metadata.countries': summary.countries,
            },
            $unset: { 'metadata.calendarData': '' },
          },
        },
      })
      if (batch.length >= BATCH_SIZE) await flush()
    }
    await flush()

    const remaining =
      (await events.countDocuments(FILTER)) +
      (await events.countDocuments(DATES_FILTER))
    console.log(
      `Replaced trip lists in ${updated} events. ${remaining} still contain dates.`
    )
  } finally {
    await client.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
